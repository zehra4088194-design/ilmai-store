/* eslint-disable @typescript-eslint/no-explicit-any */
import "server-only";
import { randomInt } from "node:crypto";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server-admin";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { CartService } from "./CartService";
import { PromotionService } from "./PromotionService";
import { InventoryService } from "./InventoryService";
import { OrderAccessService } from "./OrderAccessService";
import { EmailService } from "./EmailService";
import type { Order } from "@/types/domain";
import type { z } from "zod";
import type { checkoutSchema, fulfillmentUpdateSchema } from "@/validators/commerce";

// Supabase's ungenerated response is contained and mapped below.
type Raw = Record<string, any>;
const select = "*, order_items(*), order_addresses(*), payments(provider, status, created_at)";
const money = (amountMinor: number, currency: string) => ({ amountMinor, currency });

function mapOrder(row: Raw): Order {
  const currency = row.currency ?? "PKR";
  const address = (type: string) => (row.order_addresses ?? []).find((a: Raw) => a.address_type === type);
  const mapAddress = (a: Raw | undefined) => a ? ({ id: a.id, fullName: a.full_name, phone: a.phone, line1: a.line1, line2: a.line2 ?? undefined, city: a.city, state: a.state ?? undefined, postalCode: a.postal_code ?? undefined, country: a.country }) : undefined;
  const latestPayment = (row.payments ?? []).slice().sort((a: Raw, b: Raw) => (a.created_at < b.created_at ? 1 : -1))[0];
  return { id: row.id, orderNumber: row.order_number, userId: row.user_id ?? undefined, status: row.status, paymentStatus: row.payment_status, fulfillmentStatus: row.fulfillment_status, items: (row.order_items ?? []).map((i: Raw) => ({ id: i.id, productId: i.product_id ?? undefined, variantId: i.variant_id ?? undefined, productName: i.product_name_snapshot, variantName: i.variant_name_snapshot ?? undefined, productType: i.product_type_snapshot, sku: i.sku_snapshot ?? undefined, unitPrice: money(i.unit_price_snapshot_minor, currency), quantity: i.quantity, lineTotal: money(i.line_total_minor, currency), providerPriceId: i.provider_price_id ?? undefined })), subtotal: money(row.subtotal_minor, currency), discount: money(row.discount_minor, currency), shipping: money(row.shipping_minor, currency), tax: money(row.tax_minor, currency), total: money(row.total_minor, currency), couponCode: row.coupon_code ?? undefined, customerEmail: row.customer_email, customerPhone: row.customer_phone ?? undefined, shippingAddress: mapAddress(address("shipping")), billingAddress: mapAddress(address("billing")), createdAt: row.created_at, checkoutProviderId: row.checkout_provider_id ?? undefined, checkoutUrl: row.checkout_url ?? undefined, shippingCarrier: row.shipping_carrier ?? undefined, trackingNumber: row.tracking_number ?? undefined, shippedAt: row.shipped_at ?? undefined, deliveredAt: row.delivered_at ?? undefined, paymentProvider: latestPayment?.provider };
}

async function currentUserId() { const { data: { user } } = await (await createSupabaseServerClient()).auth.getUser(); return user?.id; }

export const OrderService = {
  /**
   * Lightweight admin dashboard stats — revenue per currency, order counts
   * by status, and the top-selling products by units, all computed in JS
   * over the most recent orders rather than a SQL aggregate (this store's
   * order volume is small enough that this is simpler and fast enough; a
   * proper GROUP BY becomes worth it once order counts are in the
   * thousands).
   */
  async adminStats(): Promise<{
    revenueByCurrency: Array<{ currency: string; amountMinor: number }>;
    ordersByStatus: Array<{ status: string; count: number }>;
    paidOrderCount: number;
    bestSellers: Array<{ productName: string; quantity: number }>;
  }> {
    const { data, error } = await createSupabaseAdminClient()
      .from("orders")
      .select("status, payment_status, total_minor, currency, order_items(product_name_snapshot, quantity)")
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) throw new Error(error.message);
    const rows = data ?? [];

    const revenueByCurrencyMap = new Map<string, number>();
    const statusCounts = new Map<string, number>();
    const sellerCounts = new Map<string, number>();
    let paidOrderCount = 0;

    for (const row of rows as Raw[]) {
      statusCounts.set(row.status, (statusCounts.get(row.status) ?? 0) + 1);
      if (row.payment_status === "paid") {
        paidOrderCount += 1;
        revenueByCurrencyMap.set(row.currency, (revenueByCurrencyMap.get(row.currency) ?? 0) + row.total_minor);
        for (const item of (row.order_items ?? []) as Raw[]) {
          sellerCounts.set(item.product_name_snapshot, (sellerCounts.get(item.product_name_snapshot) ?? 0) + item.quantity);
        }
      }
    }

    return {
      revenueByCurrency: Array.from(revenueByCurrencyMap, ([currency, amountMinor]) => ({ currency, amountMinor })),
      ordersByStatus: Array.from(statusCounts, ([status, count]) => ({ status, count })),
      paidOrderCount,
      bestSellers: Array.from(sellerCounts, ([productName, quantity]) => ({ productName, quantity })).sort((a, b) => b.quantity - a.quantity).slice(0, 5),
    };
  },

  async adminList(): Promise<Order[]> {
    const { data, error } = await createSupabaseAdminClient().from("orders").select(select).order("created_at", { ascending: false }).limit(100);
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapOrder);
  },
  async createFromCart(input: z.infer<typeof checkoutSchema>, options: { adReferral?: string; idempotencyKey?: string } = {}): Promise<Order> {
    const db = createSupabaseAdminClient();
    if (options.idempotencyKey) {
      const { data: existing } = await db.from("orders").select(select).eq("checkout_idempotency_key", options.idempotencyKey).maybeSingle();
      if (existing) {
        const order = mapOrder(existing);
        if (!order.userId) order.guestAccessToken = await OrderAccessService.issue(order.id);
        return order;
      }
    }
    const cart = await CartService.getOrCreateCart();
    if (!cart.items.length) throw new ValidationError("Your cart is empty.");
    const userId = await currentUserId();
    const discount = input.couponCode ? (await PromotionService.validateCoupon(input.couponCode, cart.subtotal.amountMinor)).discountMinor : 0;
    const shippableItems = cart.items.filter((item) => ["physical", "book"].includes(item.productType));
    const hasShipping = shippableItems.length > 0;
    if (hasShipping && !input.shippingAddress) throw new ValidationError("A shipping address is required for physical products.");
    // One order = one parcel: when the cart mixes products with different
    // delivery fees, charge the single highest one rather than stacking
    // every item's fee — mirrors how a real shipment is priced.
    const shipping = shippableItems.length ? Math.max(...shippableItems.map((item) => item.deliveryFeeMinor)) : 0;
    const orderNumber = `IL-${new Date().getFullYear()}-${randomInt(100000, 999999)}`;
    const { data: row, error } = await db.from("orders").insert({ order_number: orderNumber, user_id: userId ?? null, status: "pending", payment_status: "pending", fulfillment_status: "unfulfilled", subtotal_minor: cart.subtotal.amountMinor, discount_minor: discount, shipping_minor: shipping, tax_minor: 0, total_minor: Math.max(0, cart.subtotal.amountMinor - discount + shipping), currency: cart.subtotal.currency, coupon_code: input.couponCode?.toUpperCase() ?? null, customer_email: input.customerEmail, customer_phone: input.customerPhone ?? null, customer_note: input.customerNote, checkout_idempotency_key: options.idempotencyKey ?? null, ...(options.adReferral ? { metadata: { ad_referral: options.adReferral } } : {}) }).select("id").single();
    if (error || !row) throw new Error(error?.message ?? "Order could not be created.");
    try {
      const source = cart.items.map((item) => ({ order_id: row.id, product_id: item.productId, variant_id: item.variantId, product_name_snapshot: item.productTitle, variant_name_snapshot: item.variantName, product_type_snapshot: item.productType, sku_snapshot: null, provider_price_id: item.providerPriceId ?? null, unit_price_snapshot_minor: item.unitPrice.amountMinor, quantity: item.quantity, line_total_minor: item.unitPrice.amountMinor * item.quantity }));
      const { error: itemError } = await db.from("order_items").insert(source);
      if (itemError) throw new Error(itemError.message);
      for (const [type, address] of [["shipping", input.shippingAddress], ["billing", input.billingAddress ?? input.shippingAddress]] as const) if (address) { const { error: addressError } = await db.from("order_addresses").insert({ order_id: row.id, address_type: type, full_name: address.fullName, phone: address.phone, line1: address.line1, line2: address.line2, city: address.city, state: address.state, postal_code: address.postalCode, country: address.country }); if (addressError) throw new Error(addressError.message); }
      await InventoryService.reserveForOrder(row.id);
      if (input.couponCode) await PromotionService.reserveCouponForOrder(row.id, input.couponCode);
      const { data: full, error: readError } = await db.from("orders").select(select).eq("id", row.id).single();
      if (readError || !full) throw new Error(readError?.message ?? "Order could not be loaded.");
      const order = mapOrder(full);
      if (!userId) order.guestAccessToken = await OrderAccessService.issue(row.id);
      await CartService.clear(cart.id);
      return order;
    } catch (cause) {
      await InventoryService.releaseForOrder(row.id).catch(() => undefined);
      await PromotionService.releaseCouponForOrder(row.id).catch(() => undefined);
      await db.from("orders").delete().eq("id", row.id);
      throw cause;
    }
  },
  async getById(orderId: string): Promise<Order> {
    const { data, error } = await (await createSupabaseServerClient()).from("orders").select(select).eq("id", orderId).single();
    if (error || !data) throw new NotFoundError("Order not found.");
    return mapOrder(data);
  },
  async getByIdAdmin(orderId: string): Promise<Order> {
    const { data, error } = await createSupabaseAdminClient().from("orders").select(select).eq("id", orderId).single();
    if (error || !data) throw new NotFoundError("Order not found.");
    return mapOrder(data);
  },
  async getForCurrentViewer(orderId: string): Promise<Order> {
    const userId = await currentUserId();
    if (userId) {
      const { data, error } = await (await createSupabaseServerClient()).from("orders").select(select).eq("id", orderId).eq("user_id", userId).single();
      if (data) return mapOrder(data);
      if (error && error.code !== "PGRST116") throw new Error(error.message);
    }
    const token = await OrderAccessService.getTokenFromCookie(orderId);
    if (!await OrderAccessService.verify(orderId, token)) throw new NotFoundError("Order not found.");
    const { data, error } = await createSupabaseAdminClient().from("orders").select(select).eq("id", orderId).single();
    if (error || !data) throw new NotFoundError("Order not found.");
    return mapOrder(data);
  },
  async saveCheckoutSession(orderId: string, session: { providerCheckoutId: string; checkoutUrl?: string }): Promise<void> {
    const { error } = await createSupabaseAdminClient().from("orders").update({ checkout_provider_id: session.providerCheckoutId, checkout_url: session.checkoutUrl ?? null }).eq("id", orderId);
    if (error) throw new Error(error.message);
  },
  async getAdReferral(orderId: string): Promise<string | undefined> {
    const { data, error } = await createSupabaseAdminClient().from("orders").select("metadata").eq("id", orderId).single();
    if (error || !data) throw new NotFoundError("Order not found.");
    const referral = (data.metadata as { ad_referral?: unknown } | null)?.ad_referral;
    return typeof referral === "string" && referral.length > 0 ? referral : undefined;
  },
  async markPaymentFailed(orderId: string): Promise<void> {
    const { error } = await createSupabaseAdminClient().from("orders").update({ payment_status: "failed" }).eq("id", orderId).neq("payment_status", "paid");
    if (error) throw new Error(error.message);
    await InventoryService.releaseForOrder(orderId);
    await PromotionService.releaseCouponForOrder(orderId);
  },
  async listForUser(userId: string): Promise<Order[]> {
    const { data, error } = await (await createSupabaseServerClient()).from("orders").select(select).eq("user_id", userId).order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapOrder);
  },
  /**
   * Maps order_items -> digital_entitlements ids for a single order, scoped
   * to `userId` so callers can never enumerate another user's entitlements.
   * Uses the service-role client only to read `digital_entitlements`
   * (no client-readable RLS policy for arbitrary order lookups), but the
   * user_id filter below keeps this safe — see StorageService for the
   * re-check performed at actual download time.
   */
  async getEntitlementsForOrder(orderId: string, userId?: string): Promise<Array<{ orderItemId: string; entitlementId: string }>> {
    if (!userId && !await OrderAccessService.verify(orderId, await OrderAccessService.getTokenFromCookie(orderId))) return [];
    let query = createSupabaseAdminClient().from("digital_entitlements").select("id, order_item_id").eq("order_id", orderId);
    if (userId) query = query.eq("user_id", userId);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []).map((row: Raw) => ({ orderItemId: row.order_item_id, entitlementId: row.id }));
  },
  async markFulfilled(orderId: string): Promise<Order> {
    const { data, error } = await createSupabaseAdminClient().from("orders").update({ status: "fulfilled", fulfillment_status: "fulfilled" }).eq("id", orderId).select(select).single();
    if (error || !data) throw new NotFoundError("Order not found.");
    return mapOrder(data);
  },
  async updateFulfillment(orderId: string, input: z.infer<typeof fulfillmentUpdateSchema>): Promise<Order> {
    const db = createSupabaseAdminClient();
    const { data: current, error: readError } = await db.from("orders").select("payment_status, shipped_at, delivered_at, customer_email, order_number").eq("id", orderId).single();
    if (readError || !current) throw new NotFoundError("Order not found.");
    if (current.payment_status !== "paid") throw new ValidationError("Only paid orders can be fulfilled.");
    const now = new Date().toISOString();
    const { data, error } = await db.from("orders").update({ fulfillment_status: input.fulfillmentStatus, status: input.fulfillmentStatus === "fulfilled" ? "fulfilled" : "processing", shipping_carrier: input.shippingCarrier ?? null, tracking_number: input.trackingNumber ?? null, shipped_at: input.fulfillmentStatus !== "unfulfilled" ? now : null, delivered_at: input.delivered ? now : null }).eq("id", orderId).select(select).single();
    if (error || !data) throw new Error(error?.message ?? "Fulfillment could not be updated.");
    // Fire the customer email only on the actual shipped/delivered
    // transition, not on every fulfillment PATCH (e.g. editing the
    // tracking number after it's already shipped shouldn't re-notify).
    const justDelivered = input.delivered && !current.delivered_at;
    const justShipped = !justDelivered && input.fulfillmentStatus !== "unfulfilled" && !current.shipped_at;
    if (justDelivered || justShipped) {
      await EmailService.sendShipmentUpdate(current.customer_email, { orderNumber: current.order_number, carrier: input.shippingCarrier, trackingNumber: input.trackingNumber, delivered: Boolean(justDelivered) });
    }
    return mapOrder(data);
  },
  async cancel(orderId: string, _reason?: string): Promise<Order> {
    void _reason;
    await InventoryService.releaseForOrder(orderId);
    await PromotionService.releaseCouponForOrder(orderId);
    const { data, error } = await createSupabaseAdminClient().from("orders").update({ status: "cancelled" }).eq("id", orderId).in("status", ["pending", "processing"]).select(select).single();
    if (error || !data) throw new NotFoundError("Order cannot be cancelled.");
    return mapOrder(data);
  },
};
