import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { WebhookError } from "@/lib/errors";
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

/** Paddle Billing API adapter. All amounts are integer minor units. */
export class PaddleProvider implements PaymentProvider {
  private readonly apiKey = process.env.PADDLE_API_KEY;
  private readonly webhookSecret = process.env.PADDLE_WEBHOOK_SECRET;
  private readonly apiBase = process.env.PADDLE_API_BASE_URL ?? "https://api.paddle.com";

  async createCheckout(input: CreateCheckoutInput): Promise<CheckoutSession> {
    if (!this.apiKey) throw new Error("PADDLE_API_KEY is not configured.");
    if (!input.lineItems.length) throw new Error("A checkout needs at least one item.");
    const calculated = input.lineItems.reduce((sum, item) => sum + item.unitPriceMinor * item.quantity, 0);
    const discountMinor = input.discountMinor ?? 0;
    if (calculated - discountMinor !== input.amountMinor || discountMinor < 0 || discountMinor > calculated) throw new Error("Checkout amount does not match the order.");

    const items = input.lineItems.map((item) => item.priceId
      ? { price_id: item.priceId, quantity: item.quantity }
      : {
          quantity: item.quantity,
          price: {
            description: item.name.slice(0, 500),
            name: item.name.slice(0, 150),
            unit_price: { amount: String(item.unitPriceMinor), currency_code: item.currency.toUpperCase() },
            product: { name: item.name.slice(0, 200) },
          },
        });

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
        custom_data: { orderId: input.orderId },
        ...(discountMinor > 0 ? { discount: { description: "Store promotion", type: "flat", amount: String(discountMinor), currency_code: input.currency.toUpperCase() } } : {}),
        checkout: { url: input.successUrl },
      }),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Paddle checkout creation failed (${response.status}).`);
    const body = await response.json() as PaddleTransactionResponse;
    const id = body.data?.id;
    const checkoutUrl = body.data?.checkout?.url ?? undefined;
    if (!id || !checkoutUrl) throw new Error("Paddle did not return a checkout URL.");
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
