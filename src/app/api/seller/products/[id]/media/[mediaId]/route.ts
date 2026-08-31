import { NextResponse } from "next/server";
import { requireSeller } from "@/lib/auth/admin";
import { ProductService } from "@/services/ProductService";
import { ProductMediaService } from "@/services/ProductMediaService";
import { isAppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

/** DELETE /api/seller/products/[id]/media/[mediaId] — ownership-checked before touching storage. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; mediaId: string }> }) {
  try {
    const { sellerId } = await requireSeller();
    const { id, mediaId } = await params;
    await ProductService.sellerGetById(sellerId, id); // throws NotFoundError if this seller doesn't own it
    if (!await ProductMediaService.adminDelete(id, mediaId)) return NextResponse.json({ error: "Media not found." }, { status: 404 });
    return NextResponse.json({ deleted: true });
  } catch (err) {
    if (isAppError(err)) return NextResponse.json({ error: err.publicMessage }, { status: err.statusCode });
    logger.error("DELETE /api/seller/products/[id]/media/[mediaId] failed", { error: String(err) });
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
