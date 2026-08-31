import { NextRequest, NextResponse } from "next/server";
import { CartService } from "@/services/CartService";
import { ManualPaymentService } from "@/services/ManualPaymentService";
import { PromotionService } from "@/services/PromotionService";
import { getPlatformSettings } from "@/lib/platform-settings/server";
import { manualPaymentTotalPkr } from "@/lib/pricing";
import { checkoutSchema } from "@/validators/commerce";
import { ValidationError, isAppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { getClientAddress, rateLimiter } from "@/lib/rate-limit";
import { orderAccessCookieName } from "@/services/OrderAccessService";
import { verifyRecaptcha } from "@/lib/recaptcha";

/**
 * POST /api/checkout/jazzcash — creates a `pending` order + a `pending`
 * 'jazzcash' payment row for the manual wallet method (see
 * ManualPaymentService). Unlike POST /api/checkout, this never returns a
 * provider checkout session — there is nothing to redirect to. The amount is
 * always recomputed server-side from the current cart + live exchange rate,
 * never trusted from the request body, so it always matches what the QR the
 * buyer just scanned was generated for.
 */
export async function POST(request: NextRequest) {
  try {
    const rate = await rateLimiter.check(`jazzcash-checkout:${getClientAddress(request)}`, 10, 60);
    if (!rate.allowed) return NextResponse.json({ error: "Too many checkout attempts. Please try again shortly." }, { status: 429, headers: { "Retry-After": String(Math.max(1, Math.ceil((rate.resetAt.getTime() - Date.now()) / 1000))) } });
    const body = checkoutSchema.parse(await request.json());
    if (!await verifyRecaptcha(body.recaptchaToken, "checkout")) throw new ValidationError("Verification failed — please try again.");

    const [cart, settings] = await Promise.all([CartService.getCurrentCart(), getPlatformSettings()]);
    if (!cart || !cart.items.length) throw new ValidationError("Your cart is empty.");

    // Must mirror OrderService.createFromCart's own total_minor computation
    // exactly (subtotal - coupon discount) — validateCoupon is a read-only
    // check (no reservation side effect; that happens separately inside
    // createFromCart), so calling it here just to preview the discount is
    // safe. Without this, a couponCode on the request would discount the
    // order's own total_minor but leave the QR/payments.amount_minor
    // demanding the full pre-discount amount.
    const discountMinor = body.couponCode
      ? (await PromotionService.validateCoupon(body.couponCode, cart.subtotal.amountMinor)).discountMinor
      : 0;
    const netAmountMinor = Math.max(0, cart.subtotal.amountMinor - discountMinor);

    const walletTotalPkr = manualPaymentTotalPkr(
      netAmountMinor,
      cart.subtotal.currency,
      settings.exchangeRate.usdToPkr,
    );

    const order = await ManualPaymentService.createPendingWalletOrder(body, walletTotalPkr, request.headers.get("idempotency-key")?.trim() || undefined);
    const response = NextResponse.json({ orderId: order.id, orderNumber: order.orderNumber, totalPkr: walletTotalPkr });
    if (order.guestAccessToken) response.cookies.set({ name: orderAccessCookieName(order.id), value: order.guestAccessToken, httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 30, path: "/" });
    return response;
  } catch (err) {
    if (isAppError(err)) return NextResponse.json({ error: err.publicMessage }, { status: err.statusCode });
    logger.error("POST /api/checkout/jazzcash failed", { error: String(err) });
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
