import { NextRequest, NextResponse } from "next/server";
import { CartService } from "@/services/CartService";
import { PromotionService } from "@/services/PromotionService";
import { isAppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { getClientAddress, rateLimiter } from "@/lib/rate-limit";

/**
 * POST /api/coupons/validate — lets the checkout UI preview a coupon
 * against the current cart before the order is actually created, so the
 * amount shown/encoded (card total, JazzCash QR) can reflect the discount
 * up front instead of only being applied silently once the order lands.
 * This is a preview only — checkout itself (OrderService.createFromCart)
 * independently re-validates and reserves the coupon server-side, so a
 * stale/tampered preview here can't get a discount actually applied.
 */
export async function POST(request: NextRequest) {
  try {
    const rate = await rateLimiter.check(`coupon-validate:${getClientAddress(request)}`, 20, 60);
    if (!rate.allowed) return NextResponse.json({ error: "Too many attempts. Please try again shortly." }, { status: 429 });
    const body = await request.json().catch(() => ({}));
    const code = typeof body?.code === "string" ? body.code.trim() : "";
    if (!code) return NextResponse.json({ error: "Enter a coupon code." }, { status: 400 });
    const cart = await CartService.getCurrentCart();
    if (!cart || !cart.items.length) return NextResponse.json({ error: "Your cart is empty." }, { status: 400 });
    const { discountMinor } = await PromotionService.validateCoupon(code, cart.subtotal.amountMinor);
    return NextResponse.json({ discountMinor, currency: cart.subtotal.currency });
  } catch (err) {
    if (isAppError(err)) return NextResponse.json({ error: err.publicMessage }, { status: err.statusCode });
    logger.error("POST /api/coupons/validate failed", { error: String(err) });
    return NextResponse.json({ error: "Coupon could not be checked." }, { status: 500 });
  }
}
