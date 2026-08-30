import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { WebhookError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { getPlatformSettings } from "@/lib/platform-settings/server";
import type {
  PaymentProvider,
  CreateCheckoutInput,
  CheckoutSession,
  ProviderTransaction,
  PaymentWebhookEvent,
} from "./PaymentProvider";

type PaddleTransactionResponse = {
  data?: {
    id?: string;
    status?: string;
    checkout?: { url?: string | null };
  };
};

// Paddle Billing only settles in this fixed list of currencies — PKR is not
// among them. Orders priced in an unsupported currency (PKR, our default)
// are converted to USD for the Paddle transaction only, using the store's
// own USD/PKR rate; the order itself stays recorded in PKR everywhere else.
const PADDLE_SUPPORTED_CURRENCIES = new Set([
  "ARS", "AUD", "BRL", "CAD", "CHF", "CLP", "CNY", "COP", "CZK", "DKK", "EUR",
  "GBP", "HKD", "HUF", "ILS", "INR", "JPY", "KRW", "MXN", "NOK", "NZD", "PEN",
  "PLN", "RUB", "SEK", "SGD", "THB", "TRY", "TWD", "UAH", "USD", "VND", "ZAR",
]);

async function toPaddleCurrency(amountMinor: number, currency: string): Promise<{ amountMinor: number; currency: string }> {
  const upper = currency.toUpperCase();
  if (PADDLE_SUPPORTED_CURRENCIES.has(upper)) return { amountMinor, currency: upper };
  if (upper !== "PKR") throw new Error(`Paddle does not support the currency "${upper}" and no conversion is defined for it.`);
  const settings = await getPlatformSettings();
  const usdToPkr = settings.exchangeRate.usdToPkr;
  // amountMinor is paisa (PKR / 100). Convert to USD cents via the live rate.
  const usdCents = Math.max(1, Math.round((amountMinor / 100 / usdToPkr) * 100));
  return { amountMinor: usdCents, currency: "USD" };
}

/** Paddle Billing API adapter. All amounts are integer minor units. */
export class PaddleProvider implements PaymentProvider {
  private readonly apiKey = process.env.PADDLE_API_KEY;
  private readonly webhookSecret = process.env.PADDLE_WEBHOOK_SECRET;
  // A sandbox API key only works against sandbox-api.paddle.com — hitting
  // production api.paddle.com with a sandbox key (or vice versa) fails with
  // a 400/401 that gives no useful hint why. Default the base URL from
  // NEXT_PUBLIC_PADDLE_ENVIRONMENT so this can't silently mismatch; an
  // explicit PADDLE_API_BASE_URL still wins if someone sets one.
  private readonly apiBase =
    process.env.PADDLE_API_BASE_URL ??
    (process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT === "sandbox" ? "https://sandbox-api.paddle.com" : "https://api.paddle.com");

  async createCheckout(input: CreateCheckoutInput): Promise<CheckoutSession> {
    if (!this.apiKey) throw new Error("PADDLE_API_KEY is not configured.");
    if (!input.lineItems.length) throw new Error("A checkout needs at least one item.");
    const calculated = input.lineItems.reduce((sum, item) => sum + item.unitPriceMinor * item.quantity, 0);
    const discountMinor = input.discountMinor ?? 0;
    if (calculated - discountMinor !== input.amountMinor || discountMinor < 0 || discountMinor > calculated) throw new Error("Checkout amount does not match the order.");

    const items = await Promise.all(input.lineItems.map(async (item) => {
      if (item.priceId) return { price_id: item.priceId, quantity: item.quantity };
      const converted = await toPaddleCurrency(item.unitPriceMinor, item.currency);
      return {
        quantity: item.quantity,
        price: {
          description: item.name.slice(0, 500),
          name: item.name.slice(0, 150),
          unit_price: { amount: String(converted.amountMinor), currency_code: converted.currency },
          product: { name: item.name.slice(0, 200), tax_category: "standard" },
        },
      };
    }));

    const convertedDiscount = discountMinor > 0 ? await toPaddleCurrency(discountMinor, input.currency) : null;

    const response = await fetch(`${this.apiBase}/transactions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "Idempotency-Key": `ilmai-store-order:${input.orderId}`,
      },
      body: JSON.stringify({
        items,
        collection_mode: "automatic",
        customer: { email: input.customerEmail },
        custom_data: { orderId: input.orderId },
        ...(convertedDiscount ? { discount: { description: "Store promotion", type: "flat", amount: String(convertedDiscount.amountMinor), currency_code: convertedDiscount.currency } } : {}),
        checkout: { url: input.successUrl },
      }),
      cache: "no-store",
    });
    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      logger.error("paddle.create_checkout_failed", { status: response.status, apiBase: this.apiBase, body: errorBody.slice(0, 2000) });
      throw new Error(`Paddle checkout creation failed (${response.status}).`);
    }
    const body = await response.json() as PaddleTransactionResponse;
    const id = body.data?.id;
    const checkoutUrl = body.data?.checkout?.url ?? undefined;
    if (!id || !checkoutUrl) {
      logger.error("paddle.create_checkout_missing_url", { body: JSON.stringify(body).slice(0, 2000) });
      throw new Error("Paddle did not return a checkout URL.");
    }
    return { providerCheckoutId: id, checkoutUrl };
  }

  async getTransaction(providerTransactionId: string): Promise<ProviderTransaction> {
    if (!this.apiKey) throw new Error("PADDLE_API_KEY is not configured.");
    const response = await fetch(`${this.apiBase}/transactions/${encodeURIComponent(providerTransactionId)}`, { headers: { Authorization: `Bearer ${this.apiKey}`, Accept: "application/json" }, cache: "no-store" });
    if (!response.ok) throw new Error(`Paddle transaction lookup failed (${response.status}).`);
    const body = await response.json() as { data: { id: string; status: string; details?: { totals?: { grand_total?: { amount: string; currency_code: string } } }; customer_id?: string; billed_at?: string } };
    const status = body.data.status === "completed" ? "paid" : ["canceled", "past_due"].includes(body.data.status) ? "failed" : "pending";
    return { providerTransactionId: body.data.id, providerCustomerId: body.data.customer_id, status, amountMinor: Number(body.data.details?.totals?.grand_total?.amount ?? 0), currency: body.data.details?.totals?.grand_total?.currency_code ?? "PKR", paidAt: body.data.billed_at };
  }

  verifyWebhookSignature(rawBody: string, signatureHeader: string): boolean {
    if (!signatureHeader) throw new WebhookError("Missing Paddle webhook signature.");
    if (!this.webhookSecret) throw new WebhookError("Paddle webhook secret is not configured.");
    const values = Object.fromEntries(signatureHeader.split(";").map((part) => {
      const [key, ...rest] = part.trim().split("=");
      return [key, rest.join("=")];
    })) as { ts?: string; h1?: string };
    const timestamp = Number(values.ts);
    const tolerance = Number(process.env.PADDLE_WEBHOOK_TOLERANCE_SECONDS ?? 300);
    if (!values.ts || !values.h1 || !Number.isSafeInteger(timestamp) || Math.abs(Date.now() / 1000 - timestamp) > tolerance) return false;
    const expected = createHmac("sha256", this.webhookSecret).update(`${values.ts}:${rawBody}`).digest("hex");
    const actual = Buffer.from(values.h1, "hex");
    const wanted = Buffer.from(expected, "hex");
    return actual.length === wanted.length && timingSafeEqual(actual, wanted);
  }

  parseWebhookEvent(rawBody: string): PaymentWebhookEvent {
    // The route verifies the signature before this parser is called.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let parsed: any;
    try { parsed = JSON.parse(rawBody); } catch { throw new WebhookError("Invalid Paddle webhook JSON."); }
    const data = parsed.data ?? {};
    const orderId = data.custom_data?.orderId;
    const eventId = parsed.event_id;
    const totals = data.details?.totals?.grand_total;
    const transaction = { providerTransactionId: data.id, providerCustomerId: data.customer_id, status: parsed.event_type === "transaction.completed" ? "paid" : parsed.event_type === "transaction.payment_failed" ? "failed" : "refunded", amountMinor: Number(totals?.amount ?? 0), currency: totals?.currency_code ?? "PKR", paidAt: data.billed_at } as const;
    if (typeof orderId !== "string" || typeof eventId !== "string" || typeof data.id !== "string") return { type: "unhandled", raw: parsed };
    if (parsed.event_type === "transaction.completed") return { type: "transaction.paid", eventId, orderId, transaction, raw: parsed };
    if (parsed.event_type === "transaction.payment_failed") return { type: "transaction.failed", eventId, orderId, transaction, raw: parsed };
    if (parsed.event_type === "transaction.canceled" || parsed.event_type === "transaction.refunded") return { type: "transaction.refunded", eventId, orderId, transaction, raw: parsed };
    return { type: "unhandled", raw: parsed };
  }
}
