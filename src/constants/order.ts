/** Must stay in sync with CHECK constraints in 001_initial_store_schema.sql */

export const ORDER_STATUSES = [
  "pending",
  "processing",
  "fulfilled",
  "completed",
  "cancelled",
  "refunded",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_STATUSES = ["pending", "paid", "failed", "refunded"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const FULFILLMENT_STATUSES = [
  "unfulfilled",
  "partially_fulfilled",
  "fulfilled",
  "not_applicable",
] as const;
export type FulfillmentStatus = (typeof FULFILLMENT_STATUSES)[number];

/**
 * Only the verified Safepay webhook or authenticated JazzCash admin review
 * webhook) may ever set payment_status to 'paid'. See SECURITY.md §3.
 */
export const PAYMENT_STATUS_PAID: PaymentStatus = "paid";

export const SUPPORTED_CURRENCIES = ["PKR", "USD"] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];
