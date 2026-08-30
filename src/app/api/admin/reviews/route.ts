import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { ReviewService } from "@/services/ReviewService";
import { isAppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

/** GET /api/admin/reviews — every review, any moderation status (admin only). */
export async function GET() {
  try {
    await requireAdmin();
    const reviews = await ReviewService.adminList();
    return NextResponse.json(reviews);
  } catch (err) {
    if (isAppError(err)) return NextResponse.json({ error: err.publicMessage }, { status: err.statusCode });
    logger.error("GET /api/admin/reviews failed", { error: String(err) });
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
