import "server-only";
import type { Order } from "@/types/domain";
import type { ProviderTransaction } from "./payment/PaymentProvider";
import { logger } from "@/lib/logger";

const REQUEST_TIMEOUT_MS = 5_000;

interface AdPurchaseConversion {
  click_id: string;
  event: "purchase";
  order_id: string;
  order_number: string;
  amount_minor: number;
  currency: string;
  occurred_at: string;
  provider_transaction_id: string;
}

/** Report an attributed paid order to the sister app over a server-only call. */
export const AdReferralService = {
  async reportPurchase(input: {
    clickId: string;
    order: Pick<Order, "id" | "orderNumber" | "total">;
    transaction: ProviderTransaction;
  }): Promise<void> {
    const endpoint = process.env.ILMAI_STUDY_AD_CONVERSION_URL?.trim();
    if (!endpoint) {
      logger.warn("ad_referral.conversion_not_configured", { orderId: input.order.id });
      return;
    }

    const payload: AdPurchaseConversion = {
      click_id: input.clickId,
      event: "purchase",
      order_id: input.order.id,
      order_number: input.order.orderNumber,
      amount_minor: input.transaction.amountMinor,
      currency: input.transaction.currency,
      occurred_at: input.transaction.paidAt ?? new Date().toISOString(),
      provider_transaction_id: input.transaction.providerTransactionId,
    };

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      "Idempotency-Key": `ilmai-store-purchase:${input.order.id}`,
    };
    const secret = process.env.ILMAI_STUDY_AD_CONVERSION_SECRET?.trim();
    if (secret) headers.Authorization = `Bearer ${secret}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        cache: "no-store",
        signal: controller.signal,
      });
    } catch (error) {
      logger.error("ad_referral.conversion_failed", {
        orderId: input.order.id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error("Ad conversion reporting failed.");
    } finally {
      clearTimeout(timeout);
    }

    // Treat an idempotent duplicate as success so webhook retries can finish.
    if (!response.ok && response.status !== 409) {
      logger.error("ad_referral.conversion_failed", {
        orderId: input.order.id,
        status: response.status,
      });
      throw new Error(`Ad conversion reporting failed (${response.status}).`);
    }

    logger.event("ad_referral.conversion_reported", {
      orderId: input.order.id,
      status: response.status,
    });
  },
};
