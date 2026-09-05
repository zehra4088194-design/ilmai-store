import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { PromotionService } from "@/services/PromotionService";
import { couponSchema } from "@/validators/commerce";
import { isAppError, parseOrThrow } from "@/lib/errors";
import { logger } from "@/lib/logger";

/**
 * GET /api/admin/coupons — every coupon (admin only).
 * POST /api/admin/coupons — create a coupon (admin only).
 */
export async function GET() {
  try {
    await requireAdmin();
    const coupons = await PromotionService.adminListCoupons();
    return NextResponse.json(coupons);
  } catch (err) {
    if (isAppError(err)) return NextResponse.json({ error: err.publicMessage }, { status: err.statusCode });
    logger.error("GET /api/admin/coupons failed", { error: String(err) });
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = parseOrThrow(couponSchema, await request.json());
    const coupon = await PromotionService.adminCreateCoupon(body);
    return NextResponse.json(coupon, { status: 201 });
  } catch (err) {
    if (isAppError(err)) return NextResponse.json({ error: err.publicMessage }, { status: err.statusCode });
    logger.error("POST /api/admin/coupons failed", { error: String(err) });
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
