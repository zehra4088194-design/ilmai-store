import { NextRequest, NextResponse } from "next/server";
import { ReviewService } from "@/services/ReviewService";
import { requireUser } from "@/lib/auth/admin";
import { reviewSchema } from "@/validators/commerce";
import { isAppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { getClientAddress, rateLimiter } from "@/lib/rate-limit";

/** POST /api/reviews — submit (or update) the current user's review for a product. */
export async function POST(request: NextRequest) {
  try {
    const rate = await rateLimiter.check(`review:${getClientAddress(request)}`, 10, 3600);
    if (!rate.allowed) return NextResponse.json({ error: "Too many review submissions. Please try again later." }, { status: 429 });
    const { userId } = await requireUser();
    const body = reviewSchema.parse(await request.json());
    const review = await ReviewService.submit(userId, body);
    return NextResponse.json(review);
  } catch (err) {
    if (isAppError(err)) return NextResponse.json({ error: err.publicMessage }, { status: err.statusCode });
    logger.error("POST /api/reviews failed", { error: String(err) });
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
