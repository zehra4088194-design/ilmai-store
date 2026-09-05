import "server-only";
import { PaymentError } from "@/lib/errors";
import { formatMoney } from "@/lib/pricing";
import { createSupabaseAdminClient } from "@/lib/supabase/server-admin";
import { AdReferralService } from "./AdReferralService";
import { EmailService } from "./EmailService";
import { InventoryService } from "./InventoryService";
import { OrderService } from "./OrderService";
import { PromotionService } from "./PromotionService";
import { ReferralService } from "./ReferralService";
import type { ProviderTransaction } from "./payment/PaymentProvider";
import type { Order } from "@/types/domain";

const DIGITAL_TYPES = ["digital", "course", "notes", "test_series"];

type PaidInput = {
  orderId: string;
  provider: "safepay" | "jazzcash";
  transaction: ProviderTransaction;
  rawEvent?: unknown;
};

async function hasEvent(orderId: string, eventType: string) {
  const { data, error } = await createSupabaseAdminClient().from("order_events").select("id").eq("order_id", orderId).eq("event_type", eventType).maybeSingle();
  if (error) throw new Error(error.message);
  return Boolean(data);
}

async function saveEvent(orderId: string, eventType: string, data: Record<string, unknown> = {}) {
  const { error } = await createSupabaseAdminClient().from("order_events").upsert({ order_id: orderId, event_type: eventType, data }, { onConflict: "order_id,event_type", ignoreDuplicates: true });
  if (error) throw new Error(error.message);
}

async function createDigitalEntitlements(order: Order) {
  const db = createSupabaseAdminClient();
  const { data: items, error: itemError } = await db.from("order_items").select("id,product_id,product_type_snapshot").eq("order_id", order.id);
  if (itemError) throw new Error(itemError.message);
  for (const item of items ?? []) {
    if (!item.product_id || !DIGITAL_TYPES.includes(item.product_type_snapshot)) continue;
    const { data: media, error: mediaError } = await db.from("product_media").select("storage_key").eq("product_id", item.product_id).eq("media_type", "digital_file").order("sort_order").limit(1).maybeSingle();
    if (mediaError) throw new Error(mediaError.message);
    if (!media) continue;
    const { error } = await db.from("digital_entitlements").upsert({ user_id: order.userId ?? null, order_id: order.id, order_item_id: item.id, product_id: item.product_id, storage_key: media.storage_key }, { onConflict: "order_item_id" });
    if (error) throw new Error(error.message);
  }
}

export const OrderCompletionService = {
  async completePaidOrder(input: PaidInput): Promise<Order> {
    if (input.transaction.status !== "paid") throw new PaymentError("The payment is not completed.");
    const order = await OrderService.getByIdAdmin(input.orderId);
    if (order.paymentStatus === "refunded") throw new PaymentError("A refunded order cannot be paid again.");
    const paymentMatchesOrder = input.provider === "safepay"
      ? order.total.amountMinor === input.transaction.amountMinor && order.total.currency.toUpperCase() === input.transaction.currency.toUpperCase()
      : input.transaction.amountMinor > 0 && input.transaction.currency.toUpperCase() === "PKR";
    if (!paymentMatchesOrder) {
      throw new PaymentError("Payment amount or currency did not match the order.");
    }

    const db = createSupabaseAdminClient();
    const { error: paymentError } = await db.from("payments").upsert({
      order_id: order.id,
      provider: input.provider,
      provider_customer_id: input.transaction.providerCustomerId ?? null,
      provider_transaction_id: input.transaction.providerTransactionId,
      status: "paid",
      amount_minor: input.transaction.amountMinor,
      currency: input.transaction.currency,
      paid_at: input.transaction.paidAt ?? new Date().toISOString(),
      raw_event: input.rawEvent ?? null,
    }, { onConflict: "provider,provider_transaction_id" });
    if (paymentError) throw new Error(paymentError.message);

    const hasPhysical = order.items.some((item) => ["physical", "book"].includes(item.productType));
    const { error: orderError } = await db.from("orders").update({
      payment_status: "paid",
      status: hasPhysical ? (order.status === "pending" ? "processing" : order.status) : "fulfilled",
      fulfillment_status: hasPhysical ? order.fulfillmentStatus : "fulfilled",
    }).eq("id", order.id).neq("payment_status", "refunded");
    if (orderError) throw new Error(orderError.message);

    await InventoryService.commitForOrder(order.id);
    await PromotionService.commitCouponForOrder(order.id);
    await createDigitalEntitlements(order);
    if (order.userId) await ReferralService.rewardReferrerIfEligible(order.id, order.userId);

    if (!await hasEvent(order.id, "payment_confirmation_email")) {
      await EmailService.sendPaymentConfirmation(order.customerEmail, { orderNumber: order.orderNumber, totalDisplay: formatMoney(order.total) });
      await saveEvent(order.id, "payment_confirmation_email");
    }

    const clickId = await OrderService.getAdReferral(order.id);
    if (clickId && !await hasEvent(order.id, "ad_referral_purchase_reported")) {
      await AdReferralService.reportPurchase({ clickId, order: { id: order.id, orderNumber: order.orderNumber, total: order.total }, transaction: input.transaction });
      await saveEvent(order.id, "ad_referral_purchase_reported", { clickId });
    }

    return OrderService.getByIdAdmin(order.id);
  },

  async markFailed(orderId: string, transaction?: ProviderTransaction) {
    await OrderService.markPaymentFailed(orderId);
    if (transaction) {
      const { error } = await createSupabaseAdminClient().from("payments").upsert({ order_id: orderId, provider: "safepay", provider_transaction_id: transaction.providerTransactionId, status: "failed", amount_minor: transaction.amountMinor, currency: transaction.currency }, { onConflict: "provider,provider_transaction_id" });
      if (error) throw new Error(error.message);
    }
  },

  async markRefunded(orderId: string, transaction?: ProviderTransaction) {
    const db = createSupabaseAdminClient();
    const order = await OrderService.getByIdAdmin(orderId);
    const { error } = await db.from("orders").update({ payment_status: "refunded", status: "refunded" }).eq("id", orderId);
    if (error) throw new Error(error.message);
    await InventoryService.refundForOrder(orderId);
    if (transaction) {
      const { error: paymentError } = await db.from("payments").upsert({ order_id: orderId, provider: "safepay", provider_transaction_id: transaction.providerTransactionId, status: "refunded", amount_minor: transaction.amountMinor, currency: transaction.currency }, { onConflict: "provider,provider_transaction_id" });
      if (paymentError) throw new Error(paymentError.message);
    }
    if (!await hasEvent(orderId, "refund_notification_email")) {
      await EmailService.sendRefundNotification(order.customerEmail, { orderNumber: order.orderNumber, amountDisplay: formatMoney(transaction ? { amountMinor: transaction.amountMinor, currency: transaction.currency } : order.total) });
      await saveEvent(orderId, "refund_notification_email");
    }
  },
};
