import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/admin";
import { WishlistService } from "@/services/WishlistService";
import { isAppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

/** DELETE /api/wishlist/[productId] — remove a product from the current user's wishlist. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ productId: string }> }) {
  try {
    const { userId } = await requireUser();
    const { productId } = await params;
    await WishlistService.remove(userId, productId);
    return NextResponse.json({ removed: true });
  } catch (err) {
    if (isAppError(err)) return NextResponse.json({ error: err.publicMessage }, { status: err.statusCode });
    logger.error("DELETE /api/wishlist/[productId] failed", { error: String(err) });
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
