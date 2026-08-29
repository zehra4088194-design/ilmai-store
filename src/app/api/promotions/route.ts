import { NextRequest, NextResponse } from "next/server";
import { PromotionService } from "@/services/PromotionService";
import { PROMOTION_PLACEMENTS, type PromotionPlacement } from "@/constants/promotion";
import { isAppError, ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";

/**
 * GET /api/promotions?placement=store_home
 * Returns active banners + featured products for a given placement. Used
 * both by the Store itself and by the main ilmai.study app (placements
 * like ilmai_app_home, ilmai_dashboard, subject_page, study_page) to embed
 * Store promotions — this endpoint is meant to be called cross-origin.
 */
export async function GET(request: NextRequest) {
  try {
    const placement = request.nextUrl.searchParams.get("placement") as PromotionPlacement | null;
    if (!placement || !PROMOTION_PLACEMENTS.includes(placement)) {
      throw new ValidationError("A valid `placement` query param is required.");
    }
    const [banners, featuredProducts] = await Promise.all([
      PromotionService.getActiveBanners(placement),
      PromotionService.getFeaturedProducts(placement),
    ]);
    return NextResponse.json({ banners, featuredProducts });
  } catch (err) {
    if (isAppError(err)) return NextResponse.json({ error: err.publicMessage }, { status: err.statusCode });
    logger.error("GET /api/promotions failed", { error: String(err) });
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
