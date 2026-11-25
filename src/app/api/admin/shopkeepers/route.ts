import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { isAppError, parseOrThrow, ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { ShopkeeperService } from "@/services/ShopkeeperService";
import { shopkeeperAdminCreateSchema } from "@/validators/shopkeeper";

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    let body: unknown;
    try { body = await request.json(); }
    catch { throw new ValidationError("A valid JSON request is required."); }

    const input = parseOrThrow(shopkeeperAdminCreateSchema, body);
    const credentials = await ShopkeeperService.adminCreateByName(input);
    return NextResponse.json({ ok: true, credentials }, { status: 201 });
  } catch (error) {
    if (isAppError(error)) return NextResponse.json({ error: error.publicMessage }, { status: error.statusCode });
    logger.error("POST /api/admin/shopkeepers failed", { error: String(error) });
    return NextResponse.json({ error: "Merchant account could not be created." }, { status: 500 });
  }
}
