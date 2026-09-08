import "server-only";
import { SafepayProvider } from "./payment/SafepayProvider";
import type { PaymentProvider, CreateCheckoutInput, CheckoutSession } from "./payment/PaymentProvider";
import { WebhookError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { createSupabaseAdminClient } from "@/lib/supabase/server-admin";
import { OrderCompletionService } from "./OrderCompletionService";

const provider: PaymentProvider = new SafepayProvider();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Raw = Record<string, any>;

export type AdminPaymentRow = {
  id: string;
  orderId: string;
  orderNumber?: string;
  customerEmail?: string;
  provider: string;
  status: string;
  amountMinor: number;
  currency: string;
  paidAt?: string;
  createdAt: string;
};

export type PaymentBucket = { key: string; label: string; amountMinor: number; count: number };

export type PaymentAnalytics = {
  currency: string;
  daily: PaymentBucket[];
  weekly: PaymentBucket[];
  monthly: PaymentBucket[];
  yearly: PaymentBucket[];
};

const mapRow = (r: Raw): AdminPaymentRow => ({
  id: r.id,
  orderId: r.order_id,
  orderNumber: r.orders?.order_number ?? undefined,
  customerEmail: r.orders?.customer_email ?? undefined,
  provider: r.provider,
  status: r.status,
  amountMinor: r.amount_minor,
  currency: r.currency,
  paidAt: r.paid_at ?? undefined,
  createdAt: r.created_at,
});

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Monday-start ISO week key (yyyy-mm-dd of that week's Monday). */
function weekStartKey(d: Date): string {
  const utc = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dow = (utc.getUTCDay() + 6) % 7; // Mon=0 .. Sun=6
  utc.setUTCDate(utc.getUTCDate() - dow);
  return `${utc.getUTCFullYear()}-${pad(utc.getUTCMonth() + 1)}-${pad(utc.getUTCDate())}`;
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Builds a fixed-length, chronologically-ordered series of buckets ending
 * "now" — including zero-amount buckets for any period with no paid
 * payments, so a bar chart never silently skips a quiet day/week/month.
 */
function buildSeries(
  amountByKey: Map<string, { amountMinor: number; count: number }>,
  granularity: "daily" | "weekly" | "monthly" | "yearly",
  periods: number,
): PaymentBucket[] {
  const now = new Date();
  const buckets: PaymentBucket[] = [];

  for (let i = periods - 1; i >= 0; i--) {
    let key: string;
    let label: string;
    if (granularity === "daily") {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i));
      key = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
      label = `${MONTH_LABELS[d.getUTCMonth()]} ${d.getUTCDate()}`;
    } else if (granularity === "weekly") {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i * 7));
      key = weekStartKey(d);
      const [, m, day] = key.split("-").map(Number);
      label = `${MONTH_LABELS[(m ?? 1) - 1]} ${day}`;
    } else if (granularity === "monthly") {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      key = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
      label = `${MONTH_LABELS[d.getUTCMonth()]} '${String(d.getUTCFullYear()).slice(2)}`;
    } else {
      const year = now.getUTCFullYear() - i;
      key = String(year);
      label = key;
    }
    const found = amountByKey.get(key);
    buckets.push({ key, label, amountMinor: found?.amountMinor ?? 0, count: found?.count ?? 0 });
  }
  return buckets;
}

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

  /** Full payments list for the admin panel, most recent first. */
  async adminList(opts: { limit?: number; status?: string; provider?: string } = {}): Promise<AdminPaymentRow[]> {
    let request = createSupabaseAdminClient()
      .from("payments")
      .select("id, order_id, provider, status, amount_minor, currency, paid_at, created_at, orders(order_number, customer_email)")
      .order("created_at", { ascending: false })
      .limit(opts.limit ?? 300);
    if (opts.status) request = request.eq("status", opts.status);
    if (opts.provider) request = request.eq("provider", opts.provider);
    const { data, error } = await request;
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapRow);
  },

  /**
   * Daily/weekly/monthly/yearly revenue series, one set per currency that
   * has ever had a paid payment. Computed in JS over the most recent paid
   * payments (same "small enough order volume" tradeoff as
   * OrderService.adminStats — a real SQL date_trunc GROUP BY becomes worth
   * it once payment counts are in the thousands).
   */
  async adminAnalytics(): Promise<PaymentAnalytics[]> {
    const { data, error } = await createSupabaseAdminClient()
      .from("payments")
      .select("amount_minor, currency, paid_at")
      .eq("status", "paid")
      .not("paid_at", "is", null)
      .order("paid_at", { ascending: false })
      .limit(5000);
    if (error) throw new Error(error.message);

    const byCurrency = new Map<string, Raw[]>();
    for (const row of (data ?? []) as Raw[]) {
      const list = byCurrency.get(row.currency) ?? [];
      list.push(row);
      byCurrency.set(row.currency, list);
    }

    return Array.from(byCurrency.entries()).map(([currency, rows]) => {
      const dailyMap = new Map<string, { amountMinor: number; count: number }>();
      const weeklyMap = new Map<string, { amountMinor: number; count: number }>();
      const monthlyMap = new Map<string, { amountMinor: number; count: number }>();
      const yearlyMap = new Map<string, { amountMinor: number; count: number }>();

      for (const row of rows) {
        const d = new Date(row.paid_at as string);
        const dayKey = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
        const weekKey = weekStartKey(d);
        const monthKey = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
        const yearKey = String(d.getUTCFullYear());
        for (const [map, key] of [[dailyMap, dayKey], [weeklyMap, weekKey], [monthlyMap, monthKey], [yearlyMap, yearKey]] as const) {
          const existing = map.get(key) ?? { amountMinor: 0, count: 0 };
          existing.amountMinor += row.amount_minor;
          existing.count += 1;
          map.set(key, existing);
        }
      }

      return {
        currency,
        daily: buildSeries(dailyMap, "daily", 30),
        weekly: buildSeries(weeklyMap, "weekly", 12),
        monthly: buildSeries(monthlyMap, "monthly", 12),
        yearly: buildSeries(yearlyMap, "yearly", Math.max(1, Math.min(10, new Set(rows.map((r) => new Date(r.paid_at as string).getUTCFullYear())).size))),
      };
    });
  },
};
