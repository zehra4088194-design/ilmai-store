import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/server-admin";

export interface ProductStats {
  productId: string;
  views: number;
  addToCarts: number;
  unitsSold: number;
}

export const ProductEventService = {
  /** Fire-and-forget — called from the product detail page render. Never throws into the page. */
  async recordView(productId: string): Promise<void> {
    try {
      await createSupabaseAdminClient().from("product_events").insert({ product_id: productId, event_type: "view" });
    } catch {
      // A dropped view event is not worth failing a page render over.
    }
  },

  /** Fire-and-forget — called after a successful POST /api/cart. */
  async recordAddToCart(productId: string): Promise<void> {
    try {
      await createSupabaseAdminClient().from("product_events").insert({ product_id: productId, event_type: "add_to_cart" });
    } catch {
      // Same — losing one click event must never break "add to cart".
    }
  },

  /**
   * Views + add-to-cart counts (from product_events) and units actually
   * sold (from order_items on paid orders) for a set of products, in one
   * batch — this is what the seller dashboard's per-product table renders.
   */
  async statsForProducts(productIds: string[]): Promise<Map<string, ProductStats>> {
    const stats = new Map<string, ProductStats>();
    if (!productIds.length) return stats;
    for (const id of productIds) stats.set(id, { productId: id, views: 0, addToCarts: 0, unitsSold: 0 });

    const db = createSupabaseAdminClient();
    const { data: events } = await db.from("product_events").select("product_id, event_type").in("product_id", productIds);
    for (const row of events ?? []) {
      const entry = stats.get(row.product_id as string);
      if (!entry) continue;
      if (row.event_type === "view") entry.views += 1;
      else if (row.event_type === "add_to_cart") entry.addToCarts += 1;
    }

    // order_items has no direct payment_status — join through orders and
    // only count units from orders that actually got paid.
    const { data: soldRows } = await db
      .from("order_items")
      .select("product_id, quantity, orders!inner(payment_status)")
      .in("product_id", productIds)
      .eq("orders.payment_status", "paid");
    for (const row of soldRows ?? []) {
      const entry = stats.get(row.product_id as string);
      if (!entry) continue;
      entry.unitsSold += (row.quantity as number) ?? 0;
    }

    return stats;
  },
};
