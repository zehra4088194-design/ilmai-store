import "server-only";
import { cookies } from "next/headers";
import type { z } from "zod";
import type { checkoutSchema } from "@/validators/commerce";
import { AD_REFERRAL_COOKIE, normalizeAdReferral } from "@/constants/ad-referral";
import { OrderService } from "./OrderService";
import { PaymentService } from "./PaymentService";
import type { CheckoutSession } from "./payment/PaymentProvider";

/**
 * Orchestrates the cart → order → provider-checkout-session hand-off.
 * This is what POST /api/checkout calls — it never talks to Supabase or
 * Paddle directly, only to OrderService/PaymentService/PromotionService.
 */
export const CheckoutService = {
  async startCheckout(
    input: z.infer<typeof checkoutSchema>,
    idempotencyKey?: string,
  ): Promise<{ orderId: string; session: CheckoutSession; guestAccessToken?: string }> {
    // Paddle's webhook is a separate request and cannot read the shopper's
    // browser cookies. Snapshot the referral on the pending order now so the
    // verified paid event can report it later.
    const adReferral = normalizeAdReferral((await cookies()).get(AD_REFERRAL_COOKIE)?.value);
    const order = await OrderService.createFromCart(input, { adReferral, idempotencyKey });

    const session = order.checkoutProviderId && order.checkoutUrl
      ? { providerCheckoutId: order.checkoutProviderId, checkoutUrl: order.checkoutUrl }
      : await PaymentService.createCheckoutForOrder({
        orderId: order.id,
        customerEmail: order.customerEmail,
        amountMinor: order.total.amountMinor,
        discountMinor: order.discount.amountMinor,
        currency: order.total.currency,
        lineItems: order.items.map((item) => ({
          name: item.productName,
          quantity: item.quantity,
          unitPriceMinor: item.unitPrice.amountMinor,
          currency: item.unitPrice.currency,
          priceId: item.providerPriceId,
        })),
        successUrl: `${process.env.NEXT_PUBLIC_STORE_URL ?? process.env.NEXT_PUBLIC_APP_URL}/orders/${order.id}`,
        cancelUrl: `${process.env.NEXT_PUBLIC_STORE_URL ?? process.env.NEXT_PUBLIC_APP_URL}/checkout`,
      });

    if (!order.checkoutProviderId) await OrderService.saveCheckoutSession(order.id, session);

    return { orderId: order.id, session, guestAccessToken: order.guestAccessToken };
  },
};
