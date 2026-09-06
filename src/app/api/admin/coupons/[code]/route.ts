import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { PromotionService } from "@/services/PromotionService";
import { AuditLogService } from "@/services/AuditLogService";
import { couponUpdateSchema } from "@/validators/commerce";
import { isAppError, parseOrThrow } from "@/lib/errors";
import { logger } from "@/lib/logger";

/** PATCH /api/admin/coupons/[code] — update (e.g. toggle isActive). DELETE — remove. Admin only. */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    const admin = await requireAdmin();
    const { code } = await params;
    const body = parseOrThrow(couponUpdateSchema, await request.json());
    const coupon = await PromotionService.adminUpdateCoupon(code, body);
    await AuditLogService.record({ actorId: admin.userId, actorRole: admin.role, action: "coupon.update", entityType: "coupon", entityId: code, metadata: { fields: Object.keys(body) } });
    return NextResponse.json(coupon);
  } catch (err) {
    if (isAppError(err)) return NextResponse.json({ error: err.publicMessage }, { status: err.statusCode });
    logger.error("PATCH /api/admin/coupons/[code] failed", { error: String(err) });
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const admin = await requireAdmin();
    const { code } = await params;
    await PromotionService.adminDeleteCoupon(code);
    await AuditLogService.record({ actorId: admin.userId, actorRole: admin.role, action: "coupon.delete", entityType: "coupon", entityId: code });
    return NextResponse.json({ deleted: true });
  } catch (err) {
    if (isAppError(err)) return NextResponse.json({ error: err.publicMessage }, { status: err.statusCode });
    logger.error("DELETE /api/admin/coupons/[code] failed", { error: String(err) });
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
