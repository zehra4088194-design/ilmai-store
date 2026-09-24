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

/** Converts the order total to the whole-rupee amount to send for the manual wallet method. */
export function manualPaymentTotalPkr(
  amountMinor: number,
  currency: string,
  exchangeRate: number,
): number {
  return currency === "USD"
    ? usdToPkr(amountMinor / 100, exchangeRate)
    : Math.round(amountMinor / 100);
}

// ilmai.study's auto-synced printed notes/book/pairing-scheme products all share the
// deterministic slug "notes-<resourceId>" (see the store's ProductService.syncNotesProduct) —
// that prefix is the one stable signal that a cart line is one of "our" print-on-demand items
// rather than an ordinary seller-listed physical product, which keeps its own flat
// product.deliveryFeeMinor untouched by the tiers below.
export function isNotesOrderSlug(slug: string | undefined | null): boolean {
  return Boolean(slug?.startsWith("notes-"));
}

// Delivery for printed IlmAI notes scales with how many copies are in the order.
export const NOTES_DELIVERY_TIERS = [
  { maxQty: 5, feeMinor: 29900, label: "PKR 299" },
  { maxQty: 10, feeMinor: 49900, label: "PKR 499" },
  { maxQty: Number.POSITIVE_INFINITY, feeMinor: 69900, label: "PKR 699" },
] as const;

export const OTHER_CITY_NOTES_DELIVERY_TIERS = [
  { maxQty: 5, feeMinor: 39900, label: "PKR 399" },
  { maxQty: 10, feeMinor: 59900, label: "PKR 599" },
  { maxQty: Number.POSITIVE_INFINITY, feeMinor: 69900, label: "PKR 699" },
] as const;

export const CARD_PROCESSING_FEE_USD = 0.5;

function notesDeliveryFeeMinor(totalQty: number, city?: string): number {
  if (totalQty <= 0) return 0;
  const normalizedCity = city?.trim().toLocaleLowerCase();
  if (!normalizedCity) return 0;
  const tiers = normalizedCity === "lahore" ? NOTES_DELIVERY_TIERS : OTHER_CITY_NOTES_DELIVERY_TIERS;
  return (tiers.find((tier) => totalQty <= tier.maxQty) ?? tiers[tiers.length - 1]!).feeMinor;
}

export function hasNotesItems(items: { productSlug?: string | null; quantity: number }[]): boolean {
  return items.some((item) => isNotesOrderSlug(item.productSlug));
}

export function cardProcessingFeeMinor(currency: string, exchangeRate: number): number {
  if (currency.toUpperCase() !== "PKR" || !Number.isFinite(exchangeRate) || exchangeRate <= 0) return 0;
  return Math.round(CARD_PROCESSING_FEE_USD * exchangeRate * 100);
}

export function cardProcessingFeePkr(currency: string, exchangeRate: number): number {
  return cardProcessingFeeMinor(currency, exchangeRate) / 100;
}

/**
 * One order = one parcel, priced at the single highest delivery fee among shippable items in the
 * cart (never summed). Printed IlmAI notes use the combined quantity across the order:
 * Lahore: PKR 299 for 1–5, PKR 499 for 6–10, PKR 699 for 11+.
 * Other Pakistani cities: PKR 399 for 1–5, PKR 599 for 6–10, PKR 699 for 11+.
 */
export function computeShippingMinor(items: { productType: string; productSlug?: string; quantity: number; deliveryFeeMinor: number }[], city?: string): number {
  const shippable = items.filter((item) => ["physical", "book"].includes(item.productType));
  if (!shippable.length) return 0;
  const notesItems = shippable.filter((item) => isNotesOrderSlug(item.productSlug));
  const otherItems = shippable.filter((item) => !isNotesOrderSlug(item.productSlug));
  const notesFeeMinor = notesDeliveryFeeMinor(notesItems.reduce((sum, item) => sum + item.quantity, 0), city);
  const otherFeeMinor = otherItems.length ? Math.max(...otherItems.map((item) => item.deliveryFeeMinor)) : 0;
  return Math.max(notesFeeMinor, otherFeeMinor);
}
