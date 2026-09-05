import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/admin";
import { reviewSchema } from "@/validators/commerce";
import { ReviewService } from "@/services/ReviewService";
import { isAppError, parseOrThrow } from "@/lib/errors";
import { logger } from "@/lib/logger";

/** POST /api/reviews — submit a review for a product the current user has purchased. */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireUser();
    const body = parseOrThrow(reviewSchema, await request.json());
    const review = await ReviewService.submit(userId, body);
    return NextResponse.json(review);
  } catch (err) {
    if (isAppError(err)) return NextResponse.json({ error: err.publicMessage }, { status: err.statusCode });
    logger.error("POST /api/reviews failed", { error: String(err) });
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
