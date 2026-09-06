import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { CategoryService } from "@/services/CategoryService";
import { AuditLogService } from "@/services/AuditLogService";
import { categoryUpdateSchema } from "@/validators/product";
import { isAppError, parseOrThrow } from "@/lib/errors";
import { logger } from "@/lib/logger";

/** PATCH /api/admin/categories/[id] — update. DELETE — remove. Admin only. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const body = parseOrThrow(categoryUpdateSchema, await request.json());
    const category = await CategoryService.adminUpdate({ id, ...body });
    await AuditLogService.record({ actorId: admin.userId, actorRole: admin.role, action: "category.update", entityType: "category", entityId: id, metadata: { fields: Object.keys(body) } });
    return NextResponse.json(category);
  } catch (err) {
    if (isAppError(err)) return NextResponse.json({ error: err.publicMessage }, { status: err.statusCode });
    logger.error("PATCH /api/admin/categories/[id] failed", { error: String(err) });
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
    await CategoryService.adminDelete(id);
    await AuditLogService.record({ actorId: admin.userId, actorRole: admin.role, action: "category.delete", entityType: "category", entityId: id });
    return NextResponse.json({ deleted: true });
  } catch (err) {
    if (isAppError(err)) return NextResponse.json({ error: err.publicMessage }, { status: err.statusCode });
    logger.error("DELETE /api/admin/categories/[id] failed", { error: String(err) });
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
