import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/admin";
import { isAppError, parseOrThrow, ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { ShopkeeperService } from "@/services/ShopkeeperService";
import { shopkeeperAccountSchema } from "@/validators/shopkeeper";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireUser();
    let body: unknown;
    try { body = await request.json(); }
    catch { throw new ValidationError("A valid JSON request is required."); }

    const input = parseOrThrow(shopkeeperAccountSchema, body);
    await ShopkeeperService.submitReceivingDetails(userId, input);
    return NextResponse.json({ ok: true, message: "JazzCash details submitted for admin verification." });
  } catch (error) {
    if (isAppError(error)) return NextResponse.json({ error: error.publicMessage }, { status: error.statusCode });
    logger.error("POST /api/shopkeeper/account failed", { error: String(error) });
    return NextResponse.json({ error: "JazzCash details could not be saved." }, { status: 500 });
  }
}
