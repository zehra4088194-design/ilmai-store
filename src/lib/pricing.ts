import { TRANSACTION_FEE_USD } from "@/constants/manual-payment";

/**
 * Shared money formatter for every price shown across the storefront,
 * cart, checkout, orders and admin/seller panels. USD renders with a `$`
 * sign (`$4`) instead of the generic `USD 4` — every other currency keeps
 * the `CODE amount` form (e.g. `PKR 500`).
 */
export function formatMoney(m: { amountMinor: number; currency: string }): string {
  const amount = new Intl.NumberFormat("en-PK").format(m.amountMinor / 100);
  return m.currency.toUpperCase() === "USD" ? `$${amount}` : `${m.currency} ${amount}`;
}

/** Converts a USD major-unit price to a whole PKR rupee amount. */
export function usdToPkr(usdPrice: number, exchangeRate: number): number {
  return Math.round(usdPrice * exchangeRate);
}

/** Computes the whole-rupee amount to send for the manual wallet method. */
export function manualPaymentTotalPkr(
  amountMinor: number,
  currency: string,
  exchangeRate: number,
): number {
  const basePkr = currency === "USD"
    ? usdToPkr(amountMinor / 100, exchangeRate)
    : Math.round(amountMinor / 100);
  return basePkr + Math.round(TRANSACTION_FEE_USD * exchangeRate);
}

// ilmai.study's auto-synced printed notes/book/pairing-scheme products all share the
// deterministic slug "notes-<resourceId>" (see the store's ProductService.syncNotesProduct) —
// that prefix is the one stable signal that a cart line is one of "our" print-on-demand items
// rather than an ordinary seller-listed physical product, which keeps its own flat
// product.deliveryFeeMinor untouched by the tiers below.
export function isNotesOrderSlug(slug: string | undefined | null): boolean {
  return Boolean(slug?.startsWith("notes-"));
}

// Delivery for these copies scales with how many are in the order, not a flat per-product fee —
// shown on the product page (product-detail.tsx) and applied in computeShippingMinor below; keep
// both in sync if this schedule ever changes.
export const NOTES_DELIVERY_TIERS = [
  { maxQty: 5, feeMinor: 15000, label: "PKR 150" },
  { maxQty: 10, feeMinor: 30000, label: "PKR 300" },
  { maxQty: 20, feeMinor: 50000, label: "PKR 500" },
] as const;

function notesDeliveryFeeMinor(totalQty: number): number {
  if (totalQty <= 0) return 0;
  // Beyond the top documented tier (20 copies), keep charging the highest one rather than
  // quietly reverting to free delivery for a bulk order.
  return (NOTES_DELIVERY_TIERS.find((tier) => totalQty <= tier.maxQty) ?? NOTES_DELIVERY_TIERS[NOTES_DELIVERY_TIERS.length - 1]!).feeMinor;
}

/**
 * One order = one parcel, priced at the single highest delivery fee among shippable items in the
 * cart (never summed — see OrderService.createFromCart, POST /api/checkout/jazzcash, and
 * CheckoutOptions.tsx, which all need this exact figure to agree so the amount a customer is
 * shown/charged always matches what the order actually needs). Extracted here — and covered by
 * pricing.test.ts — after a past bug where the checkout page computed the JazzCash total from the
 * subtotal alone and silently dropped this.
 *
 * ilmai.study notes/book orders (see isNotesOrderSlug) are the one exception to "flat per-item
 * fee": their combined quantity is priced off NOTES_DELIVERY_TIERS instead of each line's own
 * (zero) deliveryFeeMinor, then that tiered figure competes with every other shippable item's
 * flat fee the same "single highest, never summed" way.
 */
export function computeShippingMinor(items: { productType: string; productSlug?: string; quantity: number; deliveryFeeMinor: number }[]): number {
  const shippable = items.filter((item) => ["physical", "book"].includes(item.productType));
  if (!shippable.length) return 0;
  const notesItems = shippable.filter((item) => isNotesOrderSlug(item.productSlug));
  const otherItems = shippable.filter((item) => !isNotesOrderSlug(item.productSlug));
  const notesFeeMinor = notesDeliveryFeeMinor(notesItems.reduce((sum, item) => sum + item.quantity, 0));
  const otherFeeMinor = otherItems.length ? Math.max(...otherItems.map((item) => item.deliveryFeeMinor)) : 0;
  return Math.max(notesFeeMinor, otherFeeMinor);
}
