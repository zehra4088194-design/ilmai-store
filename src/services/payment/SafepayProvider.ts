import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { WebhookError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import type {
  PaymentProvider,
  CreateCheckoutInput,
  CheckoutSession,
  ProviderTransaction,
  PaymentWebhookEvent,
} from "./PaymentProvider";

/**
 * Safepay (getsafepay.com) Order API adapter — Pakistan-first payment
 * gateway, replaces PaddleProvider (see PaymentProvider.ts for why the rest
 * of the app never imports this class directly).
 *
 * Flow: create an "order" via the Order API, redirect the shopper to
 * Safepay's hosted checkout with the returned tracker, then confirm via the
 * signed webhook — same shape as the Paddle flow it replaces.
 *
 * NOTE: endpoint paths/payload fields below follow Safepay's public Order
 * API. Confirm them against the "Integration" page in your Safepay
 * dashboard once real sandbox keys are issued, and test a full sandbox
 * checkout + webhook round-trip before sending live traffic — this has not
 * been exercised against a live Safepay account yet.
 */

type SafepayInitResponse = {
  data?: { token?: string; tracker?: string };
};

export class SafepayProvider implements PaymentProvider {
  private readonly apiKey = process.env.SAFEPAY_API_KEY;
  private readonly secretKey = process.env.SAFEPAY_SECRET_KEY;
  private readonly webhookSecret = process.env.SAFEPAY_WEBHOOK_SECRET;
  private readonly environment = process.env.NEXT_PUBLIC_SAFEPAY_ENVIRONMENT === "production" ? "production" : "sandbox";
  private readonly apiBase =
    process.env.SAFEPAY_API_BASE_URL ??
    (this.environment === "production" ? "https://api.getsafepay.com" : "https://sandbox.api.getsafepay.com");
  private readonly checkoutBase =
    process.env.SAFEPAY_CHECKOUT_BASE_URL ??
    (this.environment === "production" ? "https://checkout.getsafepay.com" : "https://sandbox.getsafepay.com/checkout");

  async createCheckout(input: CreateCheckoutInput): Promise<CheckoutSession> {
    if (!this.apiKey) throw new Error("SAFEPAY_API_KEY is not configured.");
    if (!input.lineItems.length) throw new Error("A checkout needs at least one item.");
    const calculated = input.lineItems.reduce((sum, item) => sum + item.unitPriceMinor * item.quantity, 0);
    const discountMinor = input.discountMinor ?? 0;
    if (calculated - discountMinor !== input.amountMinor || discountMinor < 0 || discountMinor > calculated) throw new Error("Checkout amount does not match the order.");

    // Safepay's Order API only settles in PKR — this store's default
    // currency, so no conversion step is needed (unlike Paddle).
    if (input.currency.toUpperCase() !== "PKR") throw new Error(`Safepay checkout only supports PKR, got "${input.currency}".`);

    const response = await fetch(`${this.apiBase}/order/v1/init`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        merchant_api_key: this.apiKey,
        intent: "CYBERSOURCE",
        mode: "payment",
        currency: input.currency.toUpperCase(),
        amount: input.amountMinor,
        order_id: input.orderId,
        source: "custom",
        customer: { email: input.customerEmail },
        metadata: { orderId: input.orderId },
      }),
      cache: "no-store",
    });
    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      logger.error("safepay.create_checkout_failed", { status: response.status, apiBase: this.apiBase, body: errorBody.slice(0, 2000) });
      throw new Error(`Safepay checkout creation failed (${response.status}).`);
    }
    const body = await response.json() as SafepayInitResponse;
    const tracker = body.data?.token ?? body.data?.tracker;
    if (!tracker) {
      logger.error("safepay.create_checkout_missing_tracker", { body: JSON.stringify(body).slice(0, 2000) });
      throw new Error("Safepay did not return a checkout tracker.");
    }
    const checkoutUrl = `${this.checkoutBase}/?beacon=${encodeURIComponent(this.apiKey)}&order_id=${encodeURIComponent(tracker)}&source=hosted&env=${this.environment}&cancel_url=${encodeURIComponent(input.cancelUrl ?? "")}&redirect_url=${encodeURIComponent(input.successUrl)}`;
    return { providerCheckoutId: tracker, checkoutUrl };
  }

  async getTransaction(providerTransactionId: string): Promise<ProviderTransaction> {
    if (!this.apiKey) throw new Error("SAFEPAY_API_KEY is not configured.");
    const response = await fetch(`${this.apiBase}/order/v1/${encodeURIComponent(providerTransactionId)}?merchant_api_key=${encodeURIComponent(this.apiKey)}`, { headers: { Accept: "application/json" }, cache: "no-store" });
    if (!response.ok) throw new Error(`Safepay transaction lookup failed (${response.status}).`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body = await response.json() as any;
    const data = body.data ?? {};
    const state = String(data.state ?? data.status ?? "").toUpperCase();
    const status = state === "TRACKER_ENDED" || state === "PAID" || state === "COMPLETED" ? "paid" : state === "CANCELLED" || state === "FAILED" ? "failed" : "pending";
    return { providerTransactionId: data.token ?? providerTransactionId, providerCustomerId: data.customer?.id, status, amountMinor: Number(data.amount ?? 0), currency: data.currency ?? "PKR", paidAt: data.updated_at ?? data.updatedAt };
  }

  verifyWebhookSignature(rawBody: string, signatureHeader: string): boolean {
    if (!signatureHeader) throw new WebhookError("Missing Safepay webhook signature.");
    if (!this.webhookSecret) throw new WebhookError("Safepay webhook secret is not configured.");
    const expected = createHmac("sha256", this.webhookSecret).update(rawBody).digest("hex");
    const actual = Buffer.from(signatureHeader.trim(), "hex");
    const wanted = Buffer.from(expected, "hex");
    return actual.length === wanted.length && timingSafeEqual(actual, wanted);
  }

  parseWebhookEvent(rawBody: string): PaymentWebhookEvent {
    // The route verifies the signature before this parser is called.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let parsed: any;
    try { parsed = JSON.parse(rawBody); } catch { throw new WebhookError("Invalid Safepay webhook JSON."); }
    const data = parsed.data ?? parsed;
    const orderId: unknown = data.metadata?.orderId ?? data.order_id ?? parsed.order_id;
    const eventId: unknown = parsed.event_id ?? parsed.id ?? data.token;
    const eventType: string = String(parsed.type ?? parsed.event ?? data.state ?? "").toLowerCase();
    const transaction = {
      providerTransactionId: String(data.token ?? data.id ?? ""),
      providerCustomerId: data.customer?.id,
      status: (eventType.includes("paid") || eventType.includes("completed") || eventType.includes("tracker_ended") ? "paid" : eventType.includes("fail") ? "failed" : eventType.includes("refund") ? "refunded" : "pending") as "paid" | "failed" | "refunded" | "pending",
      amountMinor: Number(data.amount ?? 0),
      currency: String(data.currency ?? "PKR"),
      paidAt: data.updated_at ?? data.updatedAt,
    } as const;
    if (typeof orderId !== "string" || typeof eventId !== "string" || !transaction.providerTransactionId) return { type: "unhandled", raw: parsed };
    if (transaction.status === "paid") return { type: "transaction.paid", eventId, orderId, transaction, raw: parsed };
    if (transaction.status === "failed") return { type: "transaction.failed", eventId, orderId, transaction, raw: parsed };
    if (transaction.status === "refunded") return { type: "transaction.refunded", eventId, orderId, transaction, raw: parsed };
    return { type: "unhandled", raw: parsed };
  }
}
