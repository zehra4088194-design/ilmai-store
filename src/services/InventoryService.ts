import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/server-admin";
import { ValidationError } from "@/lib/errors";

type InventoryRow = { id: string; variant_id: string; quantity_available: number; low_stock_threshold: number; variant?: { name?: string; product?: { title?: string } } };

function inventoryError(error: { message: string }) {
  if (/insufficient inventory|inventory is not configured/i.test(error.message)) {
    return new ValidationError("One or more physical products are out of stock.");
  }
  return new Error(error.message);
}

export const InventoryService = {
  async adminList(): Promise<Array<{ id: string; variantId: string; productTitle: string; variantName: string; quantityAvailable: number; lowStockThreshold: number }>> {
    const { data, error } = await createSupabaseAdminClient().from("inventory_items").select("id,variant_id,quantity_available,low_stock_threshold,variant:product_variants(name,product:products(title))").order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data as InventoryRow[] ?? []).map((row) => ({ id: row.id, variantId: row.variant_id, productTitle: row.variant?.product?.title ?? "Unknown product", variantName: row.variant?.name ?? "Variant", quantityAvailable: row.quantity_available, lowStockThreshold: row.low_stock_threshold }));
  },
  async adminUpdate(variantId: string, quantityAvailable: number, lowStockThreshold: number): Promise<void> {
    const { error } = await createSupabaseAdminClient().from("inventory_items").upsert({ variant_id: variantId, quantity_available: quantityAvailable, low_stock_threshold: lowStockThreshold }, { onConflict: "variant_id" });
    if (error) throw new ValidationError(error.message);
  },
  async reserveForOrder(orderId: string): Promise<void> {
    const { error } = await createSupabaseAdminClient().rpc("reserve_order_inventory", { p_order_id: orderId });
    if (error) throw inventoryError(error);
  },

  async commitForOrder(orderId: string): Promise<void> {
    const { error } = await createSupabaseAdminClient().rpc("commit_order_inventory", { p_order_id: orderId });
    if (error) throw new Error(error.message);
  },

  async releaseForOrder(orderId: string): Promise<void> {
    const { error } = await createSupabaseAdminClient().rpc("release_order_inventory", { p_order_id: orderId });
    if (error) throw new Error(error.message);
  },

  async releaseExpired(): Promise<number> {
    const { data, error } = await createSupabaseAdminClient().rpc("release_expired_inventory_reservations");
    if (error) throw new Error(error.message);
    return Number(data ?? 0);
  },

  async refundForOrder(orderId: string): Promise<void> {
    const { error } = await createSupabaseAdminClient().rpc("refund_order_inventory", { p_order_id: orderId });
    if (error) throw new Error(error.message);
  },
};
