import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/server-admin";
import { mapProduct } from "./ProductService";
import type { Product } from "@/types/domain";

const select = "*, product_variants(*, inventory_items(quantity_available, low_stock_threshold)), product_media(*), product_categories(category:categories(*))";

export const WishlistService = {
  /** The current user's saved product ids only — cheap, used to mark hearts filled across the storefront/product page without loading full product rows. */
  async listProductIds(userId: string): Promise<Set<string>> {
    const { data, error } = await createSupabaseAdminClient().from("wishlist_items").select("product_id").eq("user_id", userId);
    if (error) throw new Error(error.message);
    return new Set((data ?? []).map((row: { product_id: string }) => row.product_id));
  },

  /** Full product rows for the account page's "Wishlist" section. */
  async list(userId: string): Promise<Product[]> {
    const { data, error } = await createSupabaseAdminClient()
      .from("wishlist_items")
      .select(`product:products(${select})`)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const products = (data ?? []).map((row: any) => row.product).filter(Boolean);
    return Promise.all(products.map(mapProduct));
  },

  async add(userId: string, productId: string): Promise<void> {
    const { error } = await createSupabaseAdminClient().from("wishlist_items").upsert({ user_id: userId, product_id: productId }, { onConflict: "user_id,product_id", ignoreDuplicates: true });
    if (error) throw new Error(error.message);
  },

  async remove(userId: string, productId: string): Promise<void> {
    const { error } = await createSupabaseAdminClient().from("wishlist_items").delete().eq("user_id", userId).eq("product_id", productId);
    if (error) throw new Error(error.message);
  },
};
