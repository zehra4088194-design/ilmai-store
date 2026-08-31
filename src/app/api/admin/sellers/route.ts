import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { SellerService } from "@/services/SellerService";
import { isAppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { z } from "zod";

const addSellerSchema = z.object({
  email: z.string().email(),
  businessName: z.string().trim().max(160).optional(),
});

/** GET /api/admin/sellers — list. POST — add an existing account as a seller by email. Admin only. */
export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json(await SellerService.adminListSellers());
  } catch (err) {
    if (isAppError(err)) return NextResponse.json({ error: err.publicMessage }, { status: err.statusCode });
    logger.error("GET /api/admin/sellers failed", { error: String(err) });
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = addSellerSchema.parse(await request.json());
    const seller = await SellerService.adminAddSellerByEmail(body.email, body.businessName);
    return NextResponse.json(seller, { status: 201 });
  } catch (err) {
    if (isAppError(err)) return NextResponse.json({ error: err.publicMessage }, { status: err.statusCode });
    logger.error("POST /api/admin/sellers failed", { error: String(err) });
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
