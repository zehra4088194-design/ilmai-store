import { NextRequest, NextResponse } from "next/server";
import { CheckoutService } from "@/services/CheckoutService";
import { checkoutSchema } from "@/validators/commerce";
import { isAppError, parseOrThrow } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { getClientAddress, rateLimiter } from "@/lib/rate-limit";
import { orderAccessCookieName } from "@/services/OrderAccessService";
import { verifyRecaptcha } from "@/lib/recaptcha";
import { ValidationError } from "@/lib/errors";

/**
 * POST /api/checkout — creates a pending order from the cart and returns a
 * Safepay checkout session. Never marks anything paid — that only happens
 * via the verified webhook at /api/webhooks/safepay. See SECURITY.md §3.
 */
export async function POST(request: NextRequest) {
  try {
    const rate = await rateLimiter.check(`checkout:${getClientAddress(request)}`, 10, 60);
    if (!rate.allowed) return NextResponse.json({ error: "Too many checkout attempts. Please try again shortly." }, { status: 429, headers: { "Retry-After": String(Math.max(1, Math.ceil((rate.resetAt.getTime() - Date.now()) / 1000))) } });
    const body = parseOrThrow(checkoutSchema, await request.json());
    if (!await verifyRecaptcha(body.recaptchaToken, "checkout")) throw new ValidationError("Verification failed — please try again.");
    const result = await CheckoutService.startCheckout(body, request.headers.get("idempotency-key")?.trim() || undefined);
    const response = NextResponse.json(result);
    if (result.guestAccessToken) response.cookies.set({ name: orderAccessCookieName(result.orderId), value: result.guestAccessToken, httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 30, path: "/" });
    return response;
  } catch (err) {
    if (isAppError(err)) return NextResponse.json({ error: err.publicMessage }, { status: err.statusCode });
    logger.error("POST /api/checkout failed", { error: String(err) });
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
