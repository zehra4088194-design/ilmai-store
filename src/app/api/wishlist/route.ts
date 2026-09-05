import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/admin";
import { WishlistService } from "@/services/WishlistService";
import { isAppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

/** GET /api/wishlist — the current user's saved product ids. POST { productId } — save one. */
export async function GET() {
  try {
    const { userId } = await requireUser();
    return NextResponse.json({ productIds: Array.from(await WishlistService.listProductIds(userId)) });
  } catch (err) {
    if (isAppError(err)) return NextResponse.json({ error: err.publicMessage }, { status: err.statusCode });
    logger.error("GET /api/wishlist failed", { error: String(err) });
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireUser();
    const body = await request.json() as { productId?: string };
    if (!body.productId) return NextResponse.json({ error: "productId is required." }, { status: 400 });
    await WishlistService.add(userId, body.productId);
    return NextResponse.json({ saved: true });
  } catch (err) {
    if (isAppError(err)) return NextResponse.json({ error: err.publicMessage }, { status: err.statusCode });
    logger.error("POST /api/wishlist failed", { error: String(err) });
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
