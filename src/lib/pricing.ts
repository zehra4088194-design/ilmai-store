import { TRANSACTION_FEE_USD } from "@/constants/manual-payment";

/**
 * "Compare at" anchor price shown crossed out next to the real price — a
 * flat $2 (or currency-equivalent) above what's actually charged, so every
 * product reads as a small discount off a slightly higher price. Purely a
 * display computation: nothing is stored, the real price everywhere else
 * (cart, checkout, order, Safepay) is always the actual base/variant price.
 */
export function compareAtAmountMinor(amountMinor: number, currency: string, usdToPkrRate: number): { amountMinor: number; currency: string } {
  const extraUsd = 2;
  const upper = currency.toUpperCase();
  const extraMinor = upper === "PKR" ? Math.round(extraUsd * usdToPkrRate) * 100 : extraUsd * 100;
  return { amountMinor: amountMinor + extraMinor, currency: upper };
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
