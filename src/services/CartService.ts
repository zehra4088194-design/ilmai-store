import "server-only";
import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server-admin";
import { NotFoundError, ValidationError } from "@/lib/errors";
import type { Cart } from "@/types/domain";
import type { z } from "zod";
import type { addToCartSchema, updateCartItemSchema } from "@/validators/commerce";

// Supabase's ungenerated response is contained and mapped below.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;
const CART_COOKIE = "ilmai_cart_session";

async function context() {
  const db = await createSupabaseServerClient();
  const { data: { user } } = await db.auth.getUser();
  if (user) return { db, userId: user.id, sessionToken: undefined };
  const jar = await cookies();
  let sessionToken = jar.get(CART_COOKIE)?.value;
  if (!sessionToken) { sessionToken = randomUUID(); jar.set(CART_COOKIE, sessionToken, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 30, path: "/" }); }
  return { db: createSupabaseAdminClient(), userId: undefined, sessionToken };
}

function mapCart(row: Row): Cart {
  const items = (row.cart_items ?? []).map((item: Row) => { const v = item.product_variants ?? {}; const p = v.products ?? {}; const providerPriceId = typeof v.metadata?.provider_price_id === "string" ? v.metadata.provider_price_id : undefined; return { id: item.id, variantId: item.variant_id, productId: v.product_id, productTitle: p.title ?? "Product", productType: p.product_type ?? "digital", variantName: v.name ?? "Default", quantity: item.quantity, unitPrice: { amountMinor: v.price_minor ?? item.unit_price_snapshot_minor, currency: v.currency ?? "PKR" }, providerPriceId, deliveryFeeMinor: p.delivery_fee_minor ?? 0 }; });
  const currency = items[0]?.unitPrice.currency ?? "PKR";
  return { id: row.id, userId: row.user_id ?? undefined, items, subtotal: { amountMinor: items.reduce((sum: number, item: { unitPrice: { amountMinor: number }; quantity: number }) => sum + item.unitPrice.amountMinor * item.quantity, 0), currency } };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function load(cartId: string, db: any) {
  const { data, error } = await db.from("carts").select("*, cart_items(*, product_variants(*, products(title, product_type, delivery_fee_minor)))").eq("id", cartId).single();
  if (error || !data) throw new NotFoundError("Cart not found.");
  return mapCart(data);
}

export const CartService = {
  /** Reads the current cart without creating a session cookie. */
  async getCurrentCart(): Promise<Cart | null> {
    const db = await createSupabaseServerClient();
    const { data: { user } } = await db.auth.getUser();
    if (user) {
      const { data } = await db.from("carts").select("id").eq("status", "active").eq("user_id", user.id).maybeSingle();
      return data ? load(data.id, db) : null;
    }

    const sessionToken = (await cookies()).get(CART_COOKIE)?.value;
    if (!sessionToken) return null;
    const adminDb = createSupabaseAdminClient();
    const { data } = await adminDb.from("carts").select("id").eq("status", "active").eq("session_token", sessionToken).maybeSingle();
    return data ? load(data.id, adminDb) : null;
  },
  async getOrCreateCart(): Promise<Cart> {
    const { db, userId, sessionToken } = await context();
    let query = db.from("carts").select("id").eq("status", "active");
    query = userId ? query.eq("user_id", userId) : query.eq("session_token", sessionToken!);
    const { data } = await query.maybeSingle();
    if (data) return load(data.id, db);
    const { data: created, error } = await db.from("carts").insert({ user_id: userId ?? null, session_token: sessionToken ?? null }).select("id").single();
    if (error || !created) throw new Error(error?.message ?? "Cart could not be created.");
    return load(created.id, db);
  },

  async addItem(cartId: string, input: z.infer<typeof addToCartSchema>): Promise<Cart> {
    const { db } = await context();
    const { data: variant, error: variantError } = await db.from("product_variants").select("id, price_minor, product_id, metadata, products!inner(status)").eq("id", input.variantId).eq("products.status", "published").single();
    if (variantError || !variant) throw new ValidationError("This product is unavailable.");
    const { data: existing } = await db.from("cart_items").select("quantity").eq("cart_id", cartId).eq("variant_id", input.variantId).maybeSingle();
    const quantity = (existing?.quantity ?? 0) + input.quantity;
    if (quantity > 99) throw new ValidationError("Maximum quantity is 99.");
    const { error } = await db.from("cart_items").upsert({ cart_id: cartId, variant_id: input.variantId, quantity, unit_price_snapshot_minor: variant.price_minor }, { onConflict: "cart_id,variant_id" });
    if (error) throw new Error(error.message);
    return load(cartId, db);
  },

  async updateItem(cartId: string, input: z.infer<typeof updateCartItemSchema>): Promise<Cart> {
    const { db } = await context();
    const result = input.quantity === 0 ? await db.from("cart_items").delete().eq("id", input.cartItemId).eq("cart_id", cartId) : await db.from("cart_items").update({ quantity: input.quantity }).eq("id", input.cartItemId).eq("cart_id", cartId);
    if (result.error) throw new Error(result.error.message);
    return load(cartId, db);
  },

  async clear(cartId: string): Promise<void> {
    const { db } = await context();
    const { error } = await db.from("cart_items").delete().eq("cart_id", cartId);
    if (error) throw new Error(error.message);
  },
};
