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

/**
 * One order = one parcel, priced at the single highest delivery fee among
 * shippable items in the cart (never summed — see OrderService.createFromCart,
 * POST /api/checkout/jazzcash, and CheckoutOptions.tsx, which all need this
 * exact figure to agree so the amount a customer is shown/charged always
 * matches what the order actually needs). Extracted here — and covered by
 * pricing.test.ts — after a past bug where the checkout page computed the
 * JazzCash total from the subtotal alone and silently dropped this.
 */
export function computeShippingMinor(items: { productType: string; deliveryFeeMinor: number }[]): number {
  const shippable = items.filter((item) => ["physical", "book"].includes(item.productType));
  return shippable.length ? Math.max(...shippable.map((item) => item.deliveryFeeMinor)) : 0;
}
