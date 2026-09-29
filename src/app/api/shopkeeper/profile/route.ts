import { NextRequest, NextResponse } from "next/server";
import { isAppError, parseOrThrow, ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { requireUser } from "@/lib/auth/admin";
import { ShopkeeperService } from "@/services/ShopkeeperService";
import { shopkeeperProfileSchema } from "@/validators/shopkeeper";

export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await requireUser();
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ValidationError("A valid JSON request is required.");
    }
    const profile = parseOrThrow(shopkeeperProfileSchema, body);
    await ShopkeeperService.saveOwnProfile(userId, profile);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isAppError(error)) return NextResponse.json({ error: error.publicMessage }, { status: error.statusCode });
    logger.error("PATCH /api/shopkeeper/profile failed", { error: String(error) });
    return NextResponse.json({ error: "Shopkeeper profile could not be saved." }, { status: 500 });
  }
}
