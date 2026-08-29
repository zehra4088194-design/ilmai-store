import { TRANSACTION_FEE_USD } from "@/constants/manual-payment";

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
