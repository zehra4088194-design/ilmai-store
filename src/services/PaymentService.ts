import "server-only";
import { SafepayProvider } from "./payment/SafepayProvider";
import type { PaymentProvider, CreateCheckoutInput, CheckoutSession } from "./payment/PaymentProvider";
import { WebhookError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { createSupabaseAdminClient } from "@/lib/supabase/server-admin";
import { OrderCompletionService } from "./OrderCompletionService";

const provider: PaymentProvider = new SafepayProvider();

export const PaymentService = {
  async createCheckoutForOrder(input: CreateCheckoutInput): Promise<CheckoutSession> {
    return provider.createCheckout(input);
  },

  async handleWebhookEvent(rawBody: string, signatureHeader: string): Promise<void> {
    if (!provider.verifyWebhookSignature(rawBody, signatureHeader)) throw new WebhookError("Safepay webhook signature verification failed.");
    const event = provider.parseWebhookEvent(rawBody);
    logger.event("safepay.webhook_received", { type: event.type });
    if (event.type === "unhandled") return;

    const db = createSupabaseAdminClient();
    const { data: previous } = await db.from("payment_events").select("status").eq("provider", "safepay").eq("provider_event_id", event.eventId).maybeSingle();
    if (previous?.status === "processed") return;
    const { error: eventError } = await db.from("payment_events").upsert({ provider: "safepay", provider_event_id: event.eventId, event_type: event.type, order_id: event.orderId, payload: event.raw, status: "processing", error_message: null }, { onConflict: "provider,provider_event_id" });
    if (eventError) throw new Error(eventError.message);

    try {
      if (event.type === "transaction.failed") await OrderCompletionService.markFailed(event.orderId, event.transaction);
      else if (event.type === "transaction.refunded") await OrderCompletionService.markRefunded(event.orderId, event.transaction);
      else await OrderCompletionService.completePaidOrder({ orderId: event.orderId, provider: "safepay", transaction: event.transaction, rawEvent: event.raw });
      const { error } = await db.from("payment_events").update({ status: "processed", processed_at: new Date().toISOString(), error_message: null }).eq("provider", "safepay").eq("provider_event_id", event.eventId);
      if (error) throw new Error(error.message);
    } catch (cause) {
      await db.from("payment_events").update({ status: "failed", error_message: cause instanceof Error ? cause.message : String(cause) }).eq("provider", "safepay").eq("provider_event_id", event.eventId);
      throw cause;
    }
  },
};
