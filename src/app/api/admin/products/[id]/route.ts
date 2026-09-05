import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { ProductService } from "@/services/ProductService";
import { adminUpdateProductSchema } from "@/validators/product";
import { isAppError, parseOrThrow } from "@/lib/errors";
import { logger } from "@/lib/logger";

/** PATCH /api/admin/products/[id] — update. DELETE — remove. Admin only. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = parseOrThrow(adminUpdateProductSchema, { ...(await request.json()), id });
    const product = await ProductService.adminUpdate(body);
    return NextResponse.json(product);
  } catch (err) {
    if (isAppError(err)) return NextResponse.json({ error: err.publicMessage }, { status: err.statusCode });
    logger.error("PATCH /api/admin/products/[id] failed", { error: String(err) });
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;
    await ProductService.adminDelete(id);
    return NextResponse.json({ deleted: true });
  } catch (err) {
    if (isAppError(err)) return NextResponse.json({ error: err.publicMessage }, { status: err.statusCode });
    logger.error("DELETE /api/admin/products/[id] failed", { error: String(err) });
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
