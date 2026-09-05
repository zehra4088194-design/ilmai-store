import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { PromotionService } from "@/services/PromotionService";
import { bannerSchema } from "@/validators/commerce";
import { isAppError, parseOrThrow } from "@/lib/errors";
import { logger } from "@/lib/logger";

/**
 * GET /api/admin/banners — every banner (admin only).
 * POST /api/admin/banners — create a banner (admin only).
 */
export async function GET() {
  try {
    await requireAdmin();
    const banners = await PromotionService.adminListBanners();
    return NextResponse.json(banners);
  } catch (err) {
    if (isAppError(err)) return NextResponse.json({ error: err.publicMessage }, { status: err.statusCode });
    logger.error("GET /api/admin/banners failed", { error: String(err) });
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = parseOrThrow(bannerSchema, await request.json());
    const banner = await PromotionService.adminCreateBanner(body);
    return NextResponse.json(banner, { status: 201 });
  } catch (err) {
    if (isAppError(err)) return NextResponse.json({ error: err.publicMessage }, { status: err.statusCode });
    logger.error("POST /api/admin/banners failed", { error: String(err) });
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
