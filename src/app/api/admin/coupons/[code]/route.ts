import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { PromotionService } from "@/services/PromotionService";
import { couponUpdateSchema } from "@/validators/commerce";
import { isAppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

/** PATCH /api/admin/coupons/[code] — update (e.g. toggle isActive). DELETE — remove. Admin only. */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    await requireAdmin();
    const { code } = await params;
    const body = couponUpdateSchema.parse(await request.json());
    return NextResponse.json(await PromotionService.adminUpdateCoupon(code, body));
  } catch (err) {
    if (isAppError(err)) return NextResponse.json({ error: err.publicMessage }, { status: err.statusCode });
    logger.error("PATCH /api/admin/coupons/[code] failed", { error: String(err) });
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    await requireAdmin();
    await PromotionService.adminDeleteCoupon((await params).code);
    return NextResponse.json({ deleted: true });
  } catch (err) {
    if (isAppError(err)) return NextResponse.json({ error: err.publicMessage }, { status: err.statusCode });
    logger.error("DELETE /api/admin/coupons/[code] failed", { error: String(err) });
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
