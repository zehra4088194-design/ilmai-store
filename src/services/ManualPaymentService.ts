import "server-only";
import type { z } from "zod";
import type { checkoutSchema } from "@/validators/commerce";
import { OrderService } from "./OrderService";
import { EmailService } from "./EmailService";
import { createSupabaseAdminClient } from "@/lib/supabase/server-admin";
import type { Order } from "@/types/domain";
import { cookies } from "next/headers";
import { AD_REFERRAL_COOKIE, normalizeAdReferral } from "@/constants/ad-referral";
import { OrderAccessService } from "./OrderAccessService";
import { StorageService } from "./StorageService";
import { ValidationError } from "@/lib/errors";

/**
 * JazzCash is not a PaymentProvider in the PaymentProvider.ts sense — there is
 * no API to call, no checkout session, no webhook. A buyer sends money
 * out-of-band (scans the QR, pays via the JazzCash app) and a human verifies
 * it later from a WhatsApp/email screenshot. This service exists to give that
 * flow the same order trail Paddle gets automatically from its webhook:
 *   1. create a `pending` order (OrderService.createFromCart, shared with Paddle)
 *   2. record a `pending` 'jazzcash' payment row for it, so it shows up
 *      wherever payments are queried by provider
 *   3. notify the admin inbox so the WhatsApp screenshot has an order to match
 * An admin then calls the shared OrderCompletionService (via
 * POST /api/admin/orders/[id]/mark-paid) once they've verified the transfer —
 * this NEVER happens automatically, unlike the Paddle webhook path. See
 * SECURITY.md's "only a verified webhook can mark paid" rule: that rule is
 * about *automated* provider events specifically; a human admin explicitly
 * confirming a manual bank transfer is the accepted alternative for a
 * provider that has no automated signal at all.
 */
export const ManualPaymentService = {
  async adminClaims(orderIds: string[]) {
    if (!orderIds.length) return new Map<string, { status: string; transactionReference?: string; customerNote?: string; proofStorageKey?: string }>();
    const { data, error } = await createSupabaseAdminClient().from("manual_payment_claims").select("order_id,status,transaction_reference,customer_note,proof_storage_key").in("order_id", orderIds);
    if (error) throw new Error(error.message);
    return new Map((data ?? []).map((claim) => [claim.order_id, { status: claim.status, transactionReference: claim.transaction_reference ?? undefined, customerNote: claim.customer_note ?? undefined, proofStorageKey: claim.proof_storage_key ?? undefined }]));
  },
  async adminProofUrl(orderId: string): Promise<string | undefined> {
    const { data, error } = await createSupabaseAdminClient().from("manual_payment_claims").select("proof_storage_key").eq("order_id", orderId).maybeSingle();
    if (error) throw new Error(error.message);
    return data?.proof_storage_key ? StorageService.getPrivateFileUrl(data.proof_storage_key) : undefined;
  },
  async getManualPayment(orderId: string): Promise<{ provider: string; amountMinor: number; currency: string } | undefined> {
    const { data, error } = await createSupabaseAdminClient().from("payments").select("provider,amount_minor,currency").eq("order_id", orderId).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? { provider: data.provider, amountMinor: Number(data.amount_minor), currency: String(data.currency) } : undefined;
  },
  async approveClaim(orderId: string, reviewerId: string): Promise<void> {
    const { error } = await createSupabaseAdminClient().from("manual_payment_claims").update({ status: "approved", reviewed_by: reviewerId, reviewed_at: new Date().toISOString() }).eq("order_id", orderId);
    if (error) throw new Error(error.message);
  },
  async createPendingWalletOrder(
    input: z.infer<typeof checkoutSchema>,
    walletTotalPkr: number,
    idempotencyKey?: string,
  ): Promise<Order> {
    const adReferral = normalizeAdReferral((await cookies()).get(AD_REFERRAL_COOKIE)?.value);
    const order = await OrderService.createFromCart(input, { adReferral, idempotencyKey });

    const db = createSupabaseAdminClient();
    const { error } = await db.from("payments").upsert({
      order_id: order.id,
      provider: "jazzcash",
      provider_transaction_id: `jazzcash_${order.id}`,
      status: "pending",
      amount_minor: Math.round(walletTotalPkr * 100),
      currency: "PKR",
    }, { onConflict: "provider,provider_transaction_id" });
    if (error) throw new Error(error.message);

    const { error: claimError } = await db.from("manual_payment_claims").upsert({ order_id: order.id, provider: "jazzcash" }, { onConflict: "order_id" });
    if (claimError) throw new Error(claimError.message);

    await EmailService.sendAdminNewOrderNotification({
      orderNumber: order.orderNumber,
      totalDisplay: `PKR ${walletTotalPkr.toLocaleString("en-PK")} (JazzCash, awaiting verification)`,
      customerEmail: order.customerEmail,
    });

    return order;
  },

  async submitProof(orderId: string, input: { transactionReference: string; customerNote?: string }): Promise<void> {
    const token = await OrderAccessService.getTokenFromCookie(orderId);
    if (!await OrderAccessService.verify(orderId, token)) throw new Error("Order access expired. Request a new order link.");
    const { error } = await createSupabaseAdminClient().from("manual_payment_claims").update({ status: "submitted", transaction_reference: input.transactionReference, customer_note: input.customerNote ?? null }).eq("order_id", orderId).in("status", ["awaiting_proof", "submitted"]);
    if (error) throw new Error(error.message);
  },

  async uploadProof(orderId: string, file: { name: string; type: string; bytes: Buffer }, transactionReference: string): Promise<void> {
    const token = await OrderAccessService.getTokenFromCookie(orderId);
    if (!await OrderAccessService.verify(orderId, token)) throw new Error("Order access expired. Request a new order link.");
    const uploaded = await StorageService.uploadPaymentProof(orderId, file.name, file.bytes, file.type);
    const { error } = await createSupabaseAdminClient().from("manual_payment_claims").update({ status: "submitted", transaction_reference: transactionReference, proof_storage_key: uploaded.key }).eq("order_id", orderId).in("status", ["awaiting_proof", "submitted"]);
    if (error) throw new Error(error.message);
  },

  async rejectProof(orderId: string, reviewerId: string, reviewerNote?: string): Promise<void> {
    const db = createSupabaseAdminClient();
    const order = await OrderService.getByIdAdmin(orderId);
    if (order.paymentStatus === "paid") throw new ValidationError("A paid order cannot be rejected.");
    const { data: claim, error: readError } = await db.from("manual_payment_claims").select("status").eq("order_id", orderId).maybeSingle();
    if (readError) throw new Error(readError.message);
    if (!claim || ["approved", "rejected"].includes(claim.status)) throw new Error("This payment claim is already closed.");
    const { error } = await db.from("manual_payment_claims").update({ status: "rejected", reviewed_by: reviewerId, reviewed_at: new Date().toISOString(), reviewer_note: reviewerNote ?? null }).eq("order_id", orderId);
    if (error) throw new Error(error.message);
    await OrderService.markPaymentFailed(orderId);
    await OrderService.cancel(orderId, reviewerNote);
  },
};
