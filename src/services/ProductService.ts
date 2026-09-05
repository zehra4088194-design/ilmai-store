import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server-admin";
import { AppError, ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { StorageService } from "./StorageService";
import { PHYSICAL_GOODS_ENABLED, PHYSICAL_PRODUCT_TYPES } from "@/constants/product";
import type { Product } from "@/types/domain";
import type { z } from "zod";
import type { productListQuerySchema, adminCreateProductSchema, adminUpdateProductSchema } from "@/validators/product";

// Supabase responses are intentionally ungenerated in this scaffold; this
// boundary is the single mapping point from database rows to domain types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Raw = Record<string, any>;
const select = "*, product_variants(*, inventory_items(quantity_available, low_stock_threshold)), product_media(*), product_categories(category:categories(*))";
// Same shape, but with the category join forced to INNER so a `.eq()` on
// the joined category slug actually restricts which product rows come
// back (and `count: "exact"` reflects the true in-category total) instead
// of loading every product and filtering the join in JS afterward.
const selectFilteredByCategory = "*, product_variants(*, inventory_items(quantity_available, low_stock_threshold)), product_media(*), product_categories!inner(category:categories!inner(*))";

// PostgREST's `.or()` filter string uses `,` to separate conditions and
// `()` to group them, so a raw user search term containing any of those
// characters (e.g. "chemistry, physics") breaks the filter's own syntax
// and PostgREST returns a parse error rather than a match. Backslash-escape
// the reserved characters so the term is always treated as a literal value.
function escapeOrFilterValue(value: string): string {
  return value.replace(/[\\,()]/g, (c) => `\\${c}`);
}

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
    basePrice: { amountMinor: row.base_price_minor, currency: row.currency },
    compareAtPrice: row.compare_at_price_minor != null ? { amountMinor: row.compare_at_price_minor, currency: row.currency } : undefined,
    deliveryFee: { amountMinor: row.delivery_fee_minor ?? 0, currency: row.currency },
    isFeatured: row.is_featured,
    variants: (row.product_variants ?? []).map((v: Raw) => {
      // inventory_items is a to-one join expressed as an array by
      // Supabase; a digital variant has no row there at all.
      const stockQuantity = v.requires_shipping ? (v.inventory_items?.[0]?.quantity_available ?? 0) : undefined;
      const lowStockThreshold = v.requires_shipping ? (v.inventory_items?.[0]?.low_stock_threshold ?? 5) : undefined;
      return { id: v.id, productId: v.product_id, sku: v.sku, name: v.name, price: { amountMinor: v.price_minor, currency: v.currency }, isDefault: v.is_default, requiresShipping: v.requires_shipping, weightGrams: v.weight_grams ?? undefined, stockQuantity, lowStockThreshold, inStock: v.requires_shipping ? stockQuantity! > 0 : undefined, providerPriceId: typeof v.metadata?.provider_price_id === "string" ? v.metadata.provider_price_id : undefined };
    }),
    categories: (row.product_categories ?? []).map((x: Raw) => x.category).filter(Boolean).map((c: Raw) => ({ id: c.id, slug: c.slug, name: c.name, description: c.description ?? undefined, parentId: c.parent_id ?? undefined })),
    // Digital files are private entitlements, never public product media.
    media,
    sellerId: row.seller_id ?? undefined,
  };
}

// Zips the just-inserted variant rows (id, requires_shipping — in the same
// order they were sent, since it's a single bulk insert) back against the
// source variants that carried the requested stock, then builds the
// inventory_items rows for the shippable ones only.
// A product with existing orders can't be hard-deleted — order_items.
// product_id deliberately has no ON DELETE CASCADE (losing the product
// link on past orders would corrupt order history), so Postgres raises a
// foreign-key-violation (23503) instead. Surface that as a clear,
// actionable message rather than the generic 500 an unhandled Error would
// produce.
function productDeleteError(error: { message: string; code?: string }) {
  if (error.code === "23503") {
    return new ConflictError('This product has past orders and can’t be deleted. Set its status to "archived" instead — it disappears from the store but keeps order history intact.');
  }
  return new AppError(error.message, 500);
}

// products.slug and product_variants.sku are both globally unique (across
// every seller, not just per-product) — reusing either from an earlier
// listing raises a 23505 unique-violation on insert/update. Surface *which*
// field collided in plain language instead of the raw Postgres constraint
// name, since silently reusing a slug/SKU is the single most common way a
// second product create/edit fails right after a first one worked fine.
function productWriteError(error: { message: string; code?: string }) {
  if (error.code === "23505") {
    if (error.message.includes("products_slug_key")) return new ConflictError("That slug (page link) is already used by another product — pick a different one.");
    if (error.message.includes("product_variants_sku_key")) return new ConflictError("That SKU is already used by another product's variant — SKUs must be unique across your whole catalog, not just this product. Pick a different one.");
    return new ConflictError("That value is already used by another product.");
  }
  return new ValidationError(error.message);
}

function stockRowsFor(inserted: Raw[] | null, source: { requiresShipping: boolean; stockQuantity?: number; lowStockThreshold?: number }[]): Raw[] {
  return (inserted ?? [])
    .map((v: Raw, i: number) => ({ id: v.id, requiresShipping: v.requires_shipping, stockQuantity: source[i]?.stockQuantity, lowStockThreshold: source[i]?.lowStockThreshold }))
    .filter((v) => v.requiresShipping)
    .map((v) => ({ variant_id: v.id, quantity_available: v.stockQuantity ?? 0, ...(v.lowStockThreshold !== undefined ? { low_stock_threshold: v.lowStockThreshold } : {}) }));
}

type VariantWrite = { sku: string; name: string; priceMinor: number; currency: string; isDefault: boolean; requiresShipping: boolean; stockQuantity?: number; lowStockThreshold?: number; weightGrams?: number; providerPriceId?: string };

// `sellerUpdate`/`adminUpdate` used to delete every variant row and
// re-insert the whole set on any save — but `cart_items.variant_id` is
// `NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE`, so that
// wiped a customer's cart line for this product on an unrelated field
// edit. SKU is globally unique and is the only stable identifier the
// product form actually sends per variant, so use it to diff: a variant
// whose SKU still appears gets updated in place (same row id, cart lines
// intact); only a variant whose SKU was actually removed gets deleted.
async function syncVariants(db: ReturnType<typeof createSupabaseAdminClient>, productId: string, variants: VariantWrite[]): Promise<void> {
  const { data: existing, error: existingError } = await db.from("product_variants").select("id, sku").eq("product_id", productId);
  if (existingError) throw productWriteError(existingError);
  const existingBySku = new Map((existing ?? []).map((v: Raw) => [v.sku as string, v.id as string]));
  const incomingSkus = new Set(variants.map((v) => v.sku));

  const toDeleteIds = (existing ?? []).filter((v: Raw) => !incomingSkus.has(v.sku)).map((v: Raw) => v.id);
  if (toDeleteIds.length) { const { error } = await db.from("product_variants").delete().in("id", toDeleteIds); if (error) throw productWriteError(error); }

  for (const v of variants) {
    const existingId = existingBySku.get(v.sku);
    if (!existingId) continue;
    const { error } = await db.from("product_variants").update({ name: v.name, price_minor: v.priceMinor, currency: v.currency, is_default: v.isDefault, requires_shipping: v.requiresShipping, weight_grams: v.weightGrams ?? null, ...(v.providerPriceId ? { metadata: { provider_price_id: v.providerPriceId } } : {}) }).eq("id", existingId);
    if (error) throw productWriteError(error);
    if (v.requiresShipping) {
      const stockUpdate: Raw = { variant_id: existingId, quantity_available: v.stockQuantity ?? 0 };
      if (v.lowStockThreshold !== undefined) stockUpdate.low_stock_threshold = v.lowStockThreshold;
      const { error: stockError } = await db.from("inventory_items").upsert(stockUpdate, { onConflict: "variant_id" });
      if (stockError) throw new ValidationError(stockError.message);
    }
  }

  const toInsert = variants.filter((v) => !existingBySku.has(v.sku));
  if (toInsert.length) {
    const { data: inserted, error: insertError } = await db.from("product_variants").insert(toInsert.map((v) => ({ product_id: productId, sku: v.sku, name: v.name, price_minor: v.priceMinor, currency: v.currency, is_default: v.isDefault, requires_shipping: v.requiresShipping, weight_grams: v.weightGrams, metadata: v.providerPriceId ? { provider_price_id: v.providerPriceId } : {} }))).select("id,requires_shipping");
    if (insertError) throw productWriteError(insertError);
    const stockRows = stockRowsFor(inserted, toInsert);
    if (stockRows.length) { const { error: stockError } = await db.from("inventory_items").insert(stockRows); if (stockError) throw new ValidationError(stockError.message); }
  }
}

export const ProductService = {
  async adminList(): Promise<Product[]> {
    const { data, error } = await createSupabaseAdminClient().from("products").select(select).order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return Promise.all((data ?? []).map(mapProduct));
  },
  async list(query: z.infer<typeof productListQuerySchema>): Promise<{ items: Product[]; total: number }> {
    const db = await createSupabaseServerClient();
    let request = db.from("products").select(query.categorySlug ? selectFilteredByCategory : select, { count: "exact" }).eq("status", "published");
    if (!PHYSICAL_GOODS_ENABLED) request = request.not("product_type", "in", `(${PHYSICAL_PRODUCT_TYPES.join(",")})`);
    if (query.search) request = request.or(`title.ilike.%${escapeOrFilterValue(query.search)}%,description.ilike.%${escapeOrFilterValue(query.search)}%`);
    if (query.categorySlug) request = request.eq("product_categories.category.slug", query.categorySlug);
    if (query.productType) request = request.eq("product_type", query.productType);
    if (query.minPriceMinor !== undefined) request = request.gte("base_price_minor", query.minPriceMinor);
    if (query.maxPriceMinor !== undefined) request = request.lte("base_price_minor", query.maxPriceMinor);
    request = query.sort === "price_asc" ? request.order("base_price_minor") : query.sort === "price_desc" ? request.order("base_price_minor", { ascending: false }) : request.order("created_at", { ascending: false });
    const from = (query.page - 1) * query.pageSize;
    const { data, error, count } = await request.range(from, from + query.pageSize - 1);
    if (error) {
      // A malformed filter (or any other query-shape error tied to
      // user-controlled input like search) should degrade to "no results"
      // rather than take down the whole /store page.
      if (query.search || query.categorySlug) return { items: [], total: 0 };
      throw new Error(error.message);
    }
    const items = await Promise.all((data ?? []).map(mapProduct));
    return { items, total: count ?? items.length };
  },

  /** Minimal published-product listing for sitemap.ts — slug + last-updated only, no joins. */
  async listPublishedForSitemap(): Promise<Array<{ slug: string; updatedAt: string }>> {
    let request = (await createSupabaseServerClient())
      .from("products")
      .select("slug, updated_at")
      .eq("status", "published");
    if (!PHYSICAL_GOODS_ENABLED) request = request.not("product_type", "in", `(${PHYSICAL_PRODUCT_TYPES.join(",")})`);
    const { data, error } = await request.order("updated_at", { ascending: false }).limit(5000);
    if (error) throw new Error(error.message);
    return (data ?? []).map((row: Raw) => ({ slug: row.slug as string, updatedAt: row.updated_at as string }));
  },

  async getBySlug(slug: string): Promise<Product> {
    const { data, error } = await (await createSupabaseServerClient()).from("products").select(select).eq("slug", slug).eq("status", "published").maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new NotFoundError("Product not found.");
    if (!PHYSICAL_GOODS_ENABLED && PHYSICAL_PRODUCT_TYPES.includes(data.product_type)) throw new NotFoundError("Product not found.");
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
    const { data, error } = await db.from("products").insert({ slug: input.slug, title: input.title, description: input.description, product_type: input.productType, status: input.status, base_price_minor: input.basePriceMinor, currency: input.currency, compare_at_price_minor: input.compareAtPriceMinor ?? null, delivery_fee_minor: input.deliveryFeeMinor ?? 0, is_featured: input.isFeatured }).select("id").single();
    if (error) throw productWriteError(error);
    if (!data) throw new ValidationError("Product could not be created.");
    const { data: variants, error: variantsError } = await db.from("product_variants").insert(input.variants.map((v) => ({ product_id: data.id, sku: v.sku, name: v.name, price_minor: v.priceMinor, currency: v.currency, is_default: v.isDefault, requires_shipping: v.requiresShipping, weight_grams: v.weightGrams, metadata: v.providerPriceId ? { provider_price_id: v.providerPriceId } : {} }))).select("id,requires_shipping");
    if (variantsError) throw productWriteError(variantsError);
    const stockRows = stockRowsFor(variants, input.variants);
    if (stockRows.length) { const { error: stockError } = await db.from("inventory_items").insert(stockRows); if (stockError) throw new ValidationError(stockError.message); }
    if (input.categoryIds.length) await db.from("product_categories").insert(input.categoryIds.map((categoryId) => ({ product_id: data.id, category_id: categoryId })));
    const { data: full, error: readError } = await db.from("products").select(select).eq("id", data.id).single();
    if (readError || !full) throw new AppError(readError?.message ?? "Product could not be loaded.", 500);
    return mapProduct(full);
  },

  async adminUpdate(input: z.infer<typeof adminUpdateProductSchema>): Promise<Product> {
    const db = createSupabaseAdminClient();
    const { id, variants, categoryIds, ...fields } = input;
    const update: Raw = {};
    for (const [key, value] of Object.entries(fields)) if (value !== undefined) update[key.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`)] = value;
    const { error } = await db.from("products").update(update).eq("id", id);
    if (error) throw productWriteError(error);
    if (variants) await syncVariants(db, id, variants);
    if (categoryIds) { await db.from("product_categories").delete().eq("product_id", id); if (categoryIds.length) await db.from("product_categories").insert(categoryIds.map((categoryId) => ({ product_id: id, category_id: categoryId }))); }
    const { data, error: readError } = await db.from("products").select(select).eq("id", id).single();
    if (readError || !data) throw new NotFoundError("Product not found.");
    return mapProduct(data);
  },

  async adminDelete(productId: string): Promise<void> {
    const { error } = await createSupabaseAdminClient().from("products").delete().eq("id", productId);
    if (error) throw productDeleteError(error);
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
    const { data, error } = await db.from("products").insert({ slug: input.slug, title: input.title, description: input.description, product_type: input.productType, status: "draft", base_price_minor: input.basePriceMinor, currency: input.currency, compare_at_price_minor: input.compareAtPriceMinor ?? null, delivery_fee_minor: input.deliveryFeeMinor ?? 0, is_featured: false, seller_id: sellerId }).select("id").single();
    if (error) throw productWriteError(error);
    if (!data) throw new ValidationError("Product could not be created.");
    const { data: variants, error: variantsError } = await db.from("product_variants").insert(input.variants.map((v) => ({ product_id: data.id, sku: v.sku, name: v.name, price_minor: v.priceMinor, currency: v.currency, is_default: v.isDefault, requires_shipping: v.requiresShipping, weight_grams: v.weightGrams }))).select("id,requires_shipping");
    if (variantsError) throw productWriteError(variantsError);
    const stockRows = stockRowsFor(variants, input.variants);
    if (stockRows.length) { const { error: stockError } = await db.from("inventory_items").insert(stockRows); if (stockError) throw new ValidationError(stockError.message); }
    if (input.categoryIds.length) await db.from("product_categories").insert(input.categoryIds.map((categoryId) => ({ product_id: data.id, category_id: categoryId })));
    const { data: full, error: readError } = await db.from("products").select(select).eq("id", data.id).single();
    if (readError || !full) throw new AppError(readError?.message ?? "Product could not be loaded.", 500);
    return mapProduct(full);
  },

  async sellerUpdate(sellerId: string, input: z.infer<typeof adminUpdateProductSchema>): Promise<Product> {
    const db = createSupabaseAdminClient();
    const { id, variants, categoryIds, status: _status, isFeatured: _isFeatured, ...fields } = input;
    void _status; void _isFeatured; // a seller edits their listing's content, not its publish/featured state — admin-only.
    const update: Raw = {};
    for (const [key, value] of Object.entries(fields)) if (value !== undefined) update[key.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`)] = value;
    const { data: updated, error } = await db.from("products").update(update).eq("id", id).eq("seller_id", sellerId).select("id");
    if (error) throw productWriteError(error);
    if (!updated?.length) throw new NotFoundError("Product not found.");
    if (variants) await syncVariants(db, id, variants);
    if (categoryIds) { await db.from("product_categories").delete().eq("product_id", id); if (categoryIds.length) await db.from("product_categories").insert(categoryIds.map((categoryId) => ({ product_id: id, category_id: categoryId }))); }
    const { data, error: readError } = await db.from("products").select(select).eq("id", id).single();
    if (readError || !data) throw new NotFoundError("Product not found.");
    return mapProduct(data);
  },

  async sellerDelete(sellerId: string, productId: string): Promise<void> {
    const { data: deleted, error } = await createSupabaseAdminClient().from("products").delete().eq("id", productId).eq("seller_id", sellerId).select("id");
    if (error) throw productDeleteError(error);
    if (!deleted?.length) throw new NotFoundError("Product not found.");
  },
};
