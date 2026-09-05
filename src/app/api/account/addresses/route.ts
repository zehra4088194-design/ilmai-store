import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/admin";
import { addressSchema } from "@/validators/commerce";
import { CustomerService } from "@/services/CustomerService";
import { isAppError, parseOrThrow } from "@/lib/errors";
import { logger } from "@/lib/logger";

/**
 * GET /api/account/addresses — list the current user's saved addresses
 * (account page "Saved addresses" section, and the checkout address picker).
 * POST — save a new one.
 */
export async function GET() {
  try {
    const { userId } = await requireUser();
    return NextResponse.json(await CustomerService.listAddresses(userId));
  } catch (err) {
    if (isAppError(err)) return NextResponse.json({ error: err.publicMessage }, { status: err.statusCode });
    logger.error("GET /api/account/addresses failed", { error: String(err) });
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireUser();
    const body = parseOrThrow(addressSchema, await request.json());
    return NextResponse.json(await CustomerService.upsertAddress(userId, body));
  } catch (err) {
    if (isAppError(err)) return NextResponse.json({ error: err.publicMessage }, { status: err.statusCode });
    logger.error("POST /api/account/addresses failed", { error: String(err) });
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
