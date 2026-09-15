import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/server-admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { mapProduct } from "./ProductService";
import type { Product } from "@/types/domain";

const NOTES_PREFIX = "notes-";
const select = "*, product_variants(*, inventory_items(quantity_available, low_stock_threshold)), product_media(*), product_categories(category:categories(*))";

export const IlmaiNotesService = {
  async listPublic(): Promise<Product[]> {
    const db = await createSupabaseServerClient();
    const { data, error } = await db
      .from("products")
      .select(select)
      .eq("status", "published")
      .like("slug", `${NOTES_PREFIX}%`)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return Promise.all((data ?? []).map(mapProduct));
  },

  async listAdmin(): Promise<Product[]> {
    const db = createSupabaseAdminClient();
    const { data, error } = await db
      .from("products")
      .select(select)
      .like("slug", `${NOTES_PREFIX}%`)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return Promise.all((data ?? []).map(mapProduct));
  },
};
