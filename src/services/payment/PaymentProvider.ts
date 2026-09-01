/**
 * Provider-agnostic payment interface. `PaymentService` is the only thing
 * the rest of the app imports; it depends on this interface, not on
 * `SafepayProvider` directly, so adding a second provider later never
 * touches checkout/order code. See CLAUDE_CONTEXT.md §7.
 */

export interface CreateCheckoutInput {
  orderId: string;
  customerEmail: string;
  amountMinor: number;
  discountMinor?: number;
  currency: string;
  lineItems: Array<{
    name: string;
    quantity: number;
    unitPriceMinor: number;
    currency: string;
    priceId?: string;
  }>;
  successUrl: string;
  cancelUrl?: string;
}

export interface CheckoutSession {
  /** Opaque provider session/transaction id to correlate with webhooks. */
  providerCheckoutId: string;
  /** URL or token the client uses to render the provider's checkout UI. */
  checkoutUrl?: string;
  clientToken?: string;
}

export interface ProviderTransaction {
  providerTransactionId: string;
  providerCustomerId?: string;
  status: "pending" | "paid" | "failed" | "refunded";
  amountMinor: number;
  currency: string;
  paidAt?: string;
}

export type PaymentWebhookEvent =
  | { type: "transaction.paid"; eventId: string; orderId: string; transaction: ProviderTransaction; raw: unknown }
  | { type: "transaction.failed"; eventId: string; orderId: string; transaction: ProviderTransaction; raw: unknown }
  | { type: "transaction.refunded"; eventId: string; orderId: string; transaction: ProviderTransaction; raw: unknown }
  | { type: "unhandled"; raw: unknown };

export interface PaymentProvider {
  createCheckout(input: CreateCheckoutInput): Promise<CheckoutSession>;
  getTransaction(providerTransactionId: string): Promise<ProviderTransaction>;
  /**
   * Verifies the raw webhook body against the provided signature header
   * using the provider's webhook secret. Must be called before
   * `parseWebhookEvent` — never trust an unverified payload.
   */
  verifyWebhookSignature(rawBody: string, signatureHeader: string): boolean;
  parseWebhookEvent(rawBody: string): PaymentWebhookEvent;
}
