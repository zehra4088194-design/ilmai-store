import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server-admin";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { StorageService } from "./StorageService";
import type { Product } from "@/types/domain";
import type { z } from "zod";
import type { productListQuerySchema, adminCreateProductSchema, adminUpdateProductSchema } from "@/validators/product";

// Supabase responses are intentionally ungenerated in this scaffold; this
// boundary is the single mapping point from database rows to domain types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Raw = Record<string, any>;
const select = "*, product_variants(*), product_media(*), product_categories(category:categories(*))";

// Exported so PromotionService.getFeaturedProducts can map raw product rows
// the same way instead of skipping the media-URL step entirely.
export async function mapProduct(row: Raw): Promise<Product> {
  const mediaRows = (row.product_media ?? []).filter((m: Raw) => m.media_type !== "digital_file");
  const media = await Promise.all(mediaRows.map(async (m: Raw) => ({
    id: m.id,
    url: await StorageService.getProductMediaUrl(m.storage_key),
    mediaType: m.media_type,
    altText: m.alt_text ?? undefined,
    isPrimary: m.is_primary,
    sortOrder: m.sort_order,
  })));
  return {
    id: row.id, slug: row.slug, title: row.title, description: row.description ?? undefined,
    productType: row.product_type, status: row.status,
    basePrice: { amountMinor: row.base_price_minor, currency: row.currency }, isFeatured: row.is_featured,
    variants: (row.product_variants ?? []).map((v: Raw) => ({ id: v.id, productId: v.product_id, sku: v.sku, name: v.name, price: { amountMinor: v.price_minor, currency: v.currency }, isDefault: v.is_default, requiresShipping: v.requires_shipping, weightGrams: v.weight_grams ?? undefined, providerPriceId: typeof v.metadata?.paddle_price_id === "string" ? v.metadata.paddle_price_id : undefined })),
    categories: (row.product_categories ?? []).map((x: Raw) => x.category).filter(Boolean).map((c: Raw) => ({ id: c.id, slug: c.slug, name: c.name, description: c.description ?? undefined, parentId: c.parent_id ?? undefined })),
    // Digital files are private entitlements, never public product media.
    media,
    sellerId: row.seller_id ?? undefined,
  };
}

export const ProductService = {
  async adminList(): Promise<Product[]> {
    const { data, error } = await createSupabaseAdminClient().from("products").select(select).order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return Promise.all((data ?? []).map(mapProduct));
  },
  async list(query: z.infer<typeof productListQuerySchema>): Promise<{ items: Product[]; total: number }> {
    const db = await createSupabaseServerClient();
    let request = db.from("products").select(select, { count: "exact" }).eq("status", "published");
    if (query.search) request = request.or(`title.ilike.%${query.search}%,description.ilike.%${query.search}%`);
    if (query.productType) request = request.eq("product_type", query.productType);
    if (query.minPriceMinor !== undefined) request = request.gte("base_price_minor", query.minPriceMinor);
    if (query.maxPriceMinor !== undefined) request = request.lte("base_price_minor", query.maxPriceMinor);
    request = query.sort === "price_asc" ? request.order("base_price_minor") : query.sort === "price_desc" ? request.order("base_price_minor", { ascending: false }) : request.order("created_at", { ascending: false });
    const from = (query.page - 1) * query.pageSize;
    const { data, error, count } = await request.range(from, from + query.pageSize - 1);
    if (error) throw new Error(error.message);
    let items = await Promise.all((data ?? []).map(mapProduct));
    if (query.categorySlug) items = items.filter((p) => p.categories.some((c) => c.slug === query.categorySlug));
    return { items, total: count ?? items.length };
  },

  /** Minimal published-product listing for sitemap.ts — slug + last-updated only, no joins. */
  async listPublishedForSitemap(): Promise<Array<{ slug: string; updatedAt: string }>> {
    const { data, error } = await (await createSupabaseServerClient())
      .from("products")
      .select("slug, updated_at")
      .eq("status", "published")
      .order("updated_at", { ascending: false })
      .limit(5000);
    if (error) throw new Error(error.message);
    return (data ?? []).map((row: Raw) => ({ slug: row.slug as string, updatedAt: row.updated_at as string }));
  },

  async getBySlug(slug: string): Promise<Product> {
    const { data, error } = await (await createSupabaseServerClient()).from("products").select(select).eq("slug", slug).eq("status", "published").maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new NotFoundError("Product not found.");
    return mapProduct(data);
  },

  async adminGetById(id: string): Promise<Product> {
    const { data, error } = await createSupabaseAdminClient().from("products").select(select).eq("id", id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new NotFoundError("Product not found.");
    return mapProduct(data);
  },

  async adminCreate(input: z.infer<typeof adminCreateProductSchema>): Promise<Product> {
    const db = createSupabaseAdminClient();
    const { data, error } = await db.from("products").insert({ slug: input.slug, title: input.title, description: input.description, product_type: input.productType, status: input.status, base_price_minor: input.basePriceMinor, currency: input.currency, is_featured: input.isFeatured }).select("id").single();
    if (error || !data) throw new ValidationError(error?.message ?? "Product could not be created.");
    const { data: variants, error: variantsError } = await db.from("product_variants").insert(input.variants.map((v) => ({ product_id: data.id, sku: v.sku, name: v.name, price_minor: v.priceMinor, currency: v.currency, is_default: v.isDefault, requires_shipping: v.requiresShipping, weight_grams: v.weightGrams, metadata: v.paddlePriceId ? { paddle_price_id: v.paddlePriceId } : {} }))).select("id,requires_shipping");
    if (variantsError) throw new ValidationError(variantsError.message);
    const stockRows = (variants ?? []).filter((v: Raw) => v.requires_shipping).map((v: Raw) => ({ variant_id: v.id, quantity_available: 0 }));
    if (stockRows.length) { const { error: stockError } = await db.from("inventory_items").insert(stockRows); if (stockError) throw new ValidationError(stockError.message); }
    if (input.categoryIds.length) await db.from("product_categories").insert(input.categoryIds.map((categoryId) => ({ product_id: data.id, category_id: categoryId })));
    const { data: full, error: readError } = await db.from("products").select(select).eq("id", data.id).single();
    if (readError || !full) throw new Error(readError?.message ?? "Product could not be loaded.");
    return mapProduct(full);
  },

  async adminUpdate(input: z.infer<typeof adminUpdateProductSchema>): Promise<Product> {
    const db = createSupabaseAdminClient();
    const { id, variants, categoryIds, ...fields } = input;
    const update: Raw = {};
    for (const [key, value] of Object.entries(fields)) if (value !== undefined) update[key.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`)] = value;
    const { error } = await db.from("products").update(update).eq("id", id);
    if (error) throw new ValidationError(error.message);
    if (variants) { await db.from("product_variants").delete().eq("product_id", id); const { data: inserted, error: variantError } = await db.from("product_variants").insert(variants.map((v) => ({ product_id: id, sku: v.sku, name: v.name, price_minor: v.priceMinor, currency: v.currency, is_default: v.isDefault, requires_shipping: v.requiresShipping, weight_grams: v.weightGrams, metadata: v.paddlePriceId ? { paddle_price_id: v.paddlePriceId } : {} }))).select("id,requires_shipping"); if (variantError) throw new ValidationError(variantError.message); const stockRows = (inserted ?? []).filter((v: Raw) => v.requires_shipping).map((v: Raw) => ({ variant_id: v.id, quantity_available: 0 })); if (stockRows.length) { const { error: stockError } = await db.from("inventory_items").insert(stockRows); if (stockError) throw new ValidationError(stockError.message); } }
    if (categoryIds) { await db.from("product_categories").delete().eq("product_id", id); if (categoryIds.length) await db.from("product_categories").insert(categoryIds.map((categoryId) => ({ product_id: id, category_id: categoryId }))); }
    const { data, error: readError } = await db.from("products").select(select).eq("id", id).single();
    if (readError || !data) throw new NotFoundError("Product not found.");
    return mapProduct(data);
  },

  async adminDelete(productId: string): Promise<void> {
    const { error } = await createSupabaseAdminClient().from("products").delete().eq("id", productId);
    if (error) throw new Error(error.message);
  },

  // ── Seller-scoped: every query below is filtered to seller_id = sellerId,
  // both for listing (so a seller only ever sees their own catalog) and for
  // update/delete (so even a tampered request body naming another
  // product's id can never touch a product this seller doesn't own — the
  // ownership check lives in the query itself, not just in app logic). ──

  async sellerList(sellerId: string): Promise<Product[]> {
    const { data, error } = await createSupabaseAdminClient().from("products").select(select).eq("seller_id", sellerId).order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return Promise.all((data ?? []).map(mapProduct));
  },

  async sellerGetById(sellerId: string, id: string): Promise<Product> {
    const { data, error } = await createSupabaseAdminClient().from("products").select(select).eq("id", id).eq("seller_id", sellerId).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new NotFoundError("Product not found.");
    return mapProduct(data);
  },

  async sellerCreate(sellerId: string, input: z.infer<typeof adminCreateProductSchema>): Promise<Product> {
    const db = createSupabaseAdminClient();
    // A seller-created listing starts in 'draft' regardless of what the
    // form sent — an admin (or the seller, once reviewed) publishes it
    // deliberately rather than a seller being able to go live unmoderated.
    const { data, error } = await db.from("products").insert({ slug: input.slug, title: input.title, description: input.description, product_type: input.productType, status: "draft", base_price_minor: input.basePriceMinor, currency: input.currency, is_featured: false, seller_id: sellerId }).select("id").single();
    if (error || !data) throw new ValidationError(error?.message ?? "Product could not be created.");
    const { data: variants, error: variantsError } = await db.from("product_variants").insert(input.variants.map((v) => ({ product_id: data.id, sku: v.sku, name: v.name, price_minor: v.priceMinor, currency: v.currency, is_default: v.isDefault, requires_shipping: v.requiresShipping, weight_grams: v.weightGrams }))).select("id,requires_shipping");
    if (variantsError) throw new ValidationError(variantsError.message);
    const stockRows = (variants ?? []).filter((v: Raw) => v.requires_shipping).map((v: Raw) => ({ variant_id: v.id, quantity_available: 0 }));
    if (stockRows.length) { const { error: stockError } = await db.from("inventory_items").insert(stockRows); if (stockError) throw new ValidationError(stockError.message); }
    if (input.categoryIds.length) await db.from("product_categories").insert(input.categoryIds.map((categoryId) => ({ product_id: data.id, category_id: categoryId })));
    const { data: full, error: readError } = await db.from("products").select(select).eq("id", data.id).single();
    if (readError || !full) throw new Error(readError?.message ?? "Product could not be loaded.");
    return mapProduct(full);
  },

  async sellerUpdate(sellerId: string, input: z.infer<typeof adminUpdateProductSchema>): Promise<Product> {
    const db = createSupabaseAdminClient();
    const { id, variants, categoryIds, status: _status, isFeatured: _isFeatured, ...fields } = input;
    void _status; void _isFeatured; // a seller edits their listing's content, not its publish/featured state — admin-only.
    const update: Raw = {};
    for (const [key, value] of Object.entries(fields)) if (value !== undefined) update[key.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`)] = value;
    const { data: updated, error } = await db.from("products").update(update).eq("id", id).eq("seller_id", sellerId).select("id");
    if (error) throw new ValidationError(error.message);
    if (!updated?.length) throw new NotFoundError("Product not found.");
    if (variants) { await db.from("product_variants").delete().eq("product_id", id); const { data: inserted, error: variantError } = await db.from("product_variants").insert(variants.map((v) => ({ product_id: id, sku: v.sku, name: v.name, price_minor: v.priceMinor, currency: v.currency, is_default: v.isDefault, requires_shipping: v.requiresShipping, weight_grams: v.weightGrams }))).select("id,requires_shipping"); if (variantError) throw new ValidationError(variantError.message); const stockRows = (inserted ?? []).filter((v: Raw) => v.requires_shipping).map((v: Raw) => ({ variant_id: v.id, quantity_available: 0 })); if (stockRows.length) { const { error: stockError } = await db.from("inventory_items").insert(stockRows); if (stockError) throw new ValidationError(stockError.message); } }
    if (categoryIds) { await db.from("product_categories").delete().eq("product_id", id); if (categoryIds.length) await db.from("product_categories").insert(categoryIds.map((categoryId) => ({ product_id: id, category_id: categoryId }))); }
    const { data, error: readError } = await db.from("products").select(select).eq("id", id).single();
    if (readError || !data) throw new NotFoundError("Product not found.");
    return mapProduct(data);
  },

  async sellerDelete(sellerId: string, productId: string): Promise<void> {
    const { data: deleted, error } = await createSupabaseAdminClient().from("products").delete().eq("id", productId).eq("seller_id", sellerId).select("id");
    if (error) throw new Error(error.message);
    if (!deleted?.length) throw new NotFoundError("Product not found.");
  },
};
