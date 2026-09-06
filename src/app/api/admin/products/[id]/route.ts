import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { ProductService } from "@/services/ProductService";
import { AuditLogService } from "@/services/AuditLogService";
import { adminUpdateProductSchema } from "@/validators/product";
import { isAppError, parseOrThrow } from "@/lib/errors";
import { logger } from "@/lib/logger";

/** PATCH /api/admin/products/[id] — update. DELETE — remove. Admin only. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const rawBody = await request.json();
    const body = parseOrThrow(adminUpdateProductSchema, { ...rawBody, id });
    const product = await ProductService.adminUpdate(body);
    // Price/status changes are the ones worth being able to trace later —
    // record the fields actually sent, not the whole resulting product.
    await AuditLogService.record({ actorId: admin.userId, actorRole: admin.role, action: "product.update", entityType: "product", entityId: id, metadata: { fields: Object.keys(rawBody as object) } });
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
    const admin = await requireAdmin();
    const { id } = await params;
    await ProductService.adminDelete(id);
    await AuditLogService.record({ actorId: admin.userId, actorRole: admin.role, action: "product.delete", entityType: "product", entityId: id });
    return NextResponse.json({ deleted: true });
  } catch (err) {
    if (isAppError(err)) return NextResponse.json({ error: err.publicMessage }, { status: err.statusCode });
    logger.error("DELETE /api/admin/products/[id] failed", { error: String(err) });
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
