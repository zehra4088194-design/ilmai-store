import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/server-admin";
import { NotFoundError, ValidationError } from "@/lib/errors";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Raw = Record<string, any>;

export type SellerEarningsByCurrency = {
  currency: string;
  /** Gross revenue from this seller's paid order items, before commission. */
  grossMinor: number;
  /** What the seller is owed after the platform's commission cut. */
  payableMinor: number;
  /** Already recorded as paid out. */
  paidOutMinor: number;
  /** payableMinor - paidOutMinor. Can go negative if a payout was recorded generously; shown as-is. */
  owedMinor: number;
};

export type SellerPayout = {
  id: string;
  sellerId: string;
  amountMinor: number;
  currency: string;
  note?: string;
  recordedBy?: string;
  createdAt: string;
};

const mapPayout = (r: Raw): SellerPayout => ({ id: r.id, sellerId: r.seller_id, amountMinor: r.amount_minor, currency: r.currency, note: r.note ?? undefined, recordedBy: r.recorded_by ?? undefined, createdAt: r.created_at });

export const SellerPayoutService = {
  /**
   * Revenue is summed from order_items joined through product_id →
   * products.seller_id (order_items carries no seller snapshot of its
   * own), restricted to orders that have actually been paid. A product
   * that's since been hard-deleted (order_items.product_id ON DELETE SET
   * NULL) drops out of this sum — the same accepted tradeoff as
   * ProductService's delete-blocked-by-past-orders guard makes rare in
   * practice, since a product with any order can't be hard-deleted at all.
   */
  async getEarningsSummary(sellerId: string): Promise<SellerEarningsByCurrency[]> {
    const db = createSupabaseAdminClient();
    const { data: seller, error: sellerError } = await db.from("sellers").select("commission_rate_bps").eq("id", sellerId).maybeSingle();
    if (sellerError) throw new Error(sellerError.message);
    if (!seller) throw new NotFoundError("Seller not found.");
    const commissionBps = seller.commission_rate_bps as number;

    const { data: rows, error } = await db
      .from("order_items")
      .select("line_total_minor, orders!inner(payment_status, currency), products!inner(seller_id)")
      .eq("products.seller_id", sellerId)
      .eq("orders.payment_status", "paid");
    if (error) throw new Error(error.message);

    const grossByCurrency = new Map<string, number>();
    for (const row of (rows ?? []) as Raw[]) {
      const currency = (row.orders as Raw)?.currency ?? "PKR";
      grossByCurrency.set(currency, (grossByCurrency.get(currency) ?? 0) + Number(row.line_total_minor ?? 0));
    }

    const { data: payouts, error: payoutsError } = await db.from("seller_payouts").select("amount_minor, currency").eq("seller_id", sellerId);
    if (payoutsError) throw new Error(payoutsError.message);
    const paidOutByCurrency = new Map<string, number>();
    for (const p of payouts ?? []) paidOutByCurrency.set(p.currency, (paidOutByCurrency.get(p.currency) ?? 0) + Number(p.amount_minor));

    const currencies = new Set([...grossByCurrency.keys(), ...paidOutByCurrency.keys()]);
    return Array.from(currencies).map((currency) => {
      const grossMinor = grossByCurrency.get(currency) ?? 0;
      const payableMinor = Math.round(grossMinor * (10000 - commissionBps) / 10000);
      const paidOutMinor = paidOutByCurrency.get(currency) ?? 0;
      return { currency, grossMinor, payableMinor, paidOutMinor, owedMinor: payableMinor - paidOutMinor };
    });
  },

  async adminRecordPayout(sellerId: string, amountMinor: number, currency: string, note: string | undefined, recordedBy: string): Promise<SellerPayout> {
    if (amountMinor <= 0) throw new ValidationError("Payout amount must be positive.");
    const { data, error } = await createSupabaseAdminClient()
      .from("seller_payouts")
      .insert({ seller_id: sellerId, amount_minor: amountMinor, currency, note: note ?? null, recorded_by: recordedBy })
      .select()
      .single();
    if (error || !data) throw new ValidationError(error?.message ?? "Payout could not be recorded.");
    return mapPayout(data);
  },

  async adminListPayouts(sellerId: string): Promise<SellerPayout[]> {
    const { data, error } = await createSupabaseAdminClient().from("seller_payouts").select("*").eq("seller_id", sellerId).order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapPayout);
  },

  async adminSetCommissionRate(sellerId: string, commissionRateBps: number): Promise<void> {
    if (commissionRateBps < 0 || commissionRateBps > 10000) throw new ValidationError("Commission rate must be between 0% and 100%.");
    const { error } = await createSupabaseAdminClient().from("sellers").update({ commission_rate_bps: commissionRateBps }).eq("id", sellerId);
    if (error) throw new Error(error.message);
  },
};
