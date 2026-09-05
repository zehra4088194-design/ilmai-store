import { NextRequest, NextResponse } from "next/server";
import { requireSeller } from "@/lib/auth/admin";
import { ProductService } from "@/services/ProductService";
import { adminUpdateProductSchema } from "@/validators/product";
import { isAppError, parseOrThrow } from "@/lib/errors";
import { logger } from "@/lib/logger";

/** PATCH /api/seller/products/[id] — update, ownership-enforced. DELETE — remove, ownership-enforced. */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { sellerId } = await requireSeller();
    const { id } = await params;
    const body = parseOrThrow(adminUpdateProductSchema, { ...(await request.json()), id });
    const product = await ProductService.sellerUpdate(sellerId, body);
    return NextResponse.json(product);
  } catch (err) {
    if (isAppError(err)) return NextResponse.json({ error: err.publicMessage }, { status: err.statusCode });
    logger.error("PATCH /api/seller/products/[id] failed", { error: String(err) });
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { sellerId } = await requireSeller();
    const { id } = await params;
    await ProductService.sellerDelete(sellerId, id);
    return NextResponse.json({ deleted: true });
  } catch (err) {
    if (isAppError(err)) return NextResponse.json({ error: err.publicMessage }, { status: err.statusCode });
    logger.error("DELETE /api/seller/products/[id] failed", { error: String(err) });
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
