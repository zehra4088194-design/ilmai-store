import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { CartService } from "@/services/CartService";
import { ProductEventService } from "@/services/ProductEventService";
import { addToCartSchema, updateCartItemSchema } from "@/validators/commerce";
import { isAppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { getClientAddress, rateLimiter } from "@/lib/rate-limit";

/**
 * GET /api/cart — current user's (or guest session's) cart.
 * POST /api/cart — add an item.
 * PATCH /api/cart — update/remove an item (quantity 0 = remove).
 */
export async function GET() {
  try {
    const cart = await CartService.getOrCreateCart();
    return NextResponse.json(cart);
  } catch (err) {
    if (isAppError(err)) return NextResponse.json({ error: err.publicMessage }, { status: err.statusCode });
    logger.error("GET /api/cart failed", { error: String(err) });
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const rate = await rateLimiter.check(`cart-write:${getClientAddress(request)}`, 60, 60);
    if (!rate.allowed) return NextResponse.json({ error: "Too many cart updates. Please try again shortly." }, { status: 429 });
    const body = addToCartSchema.parse(await request.json());
    const cart = await CartService.getOrCreateCart();
    const updated = await CartService.addItem(cart.id, body);
    const addedProductId = updated.items.find((item) => item.variantId === body.variantId)?.productId;
    if (addedProductId) after(() => ProductEventService.recordAddToCart(addedProductId));
    return NextResponse.json(updated);
  } catch (err) {
    if (isAppError(err)) return NextResponse.json({ error: err.publicMessage }, { status: err.statusCode });
    logger.error("POST /api/cart failed", { error: String(err) });
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const rate = await rateLimiter.check(`cart-write:${getClientAddress(request)}`, 60, 60);
    if (!rate.allowed) return NextResponse.json({ error: "Too many cart updates. Please try again shortly." }, { status: 429 });
    const body = updateCartItemSchema.parse(await request.json());
    const cart = await CartService.getOrCreateCart();
    const updated = await CartService.updateItem(cart.id, body);
    return NextResponse.json(updated);
  } catch (err) {
    if (isAppError(err)) return NextResponse.json({ error: err.publicMessage }, { status: err.statusCode });
    logger.error("PATCH /api/cart failed", { error: String(err) });
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
