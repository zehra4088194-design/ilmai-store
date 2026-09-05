import { NextRequest, NextResponse } from "next/server";
import { requireSeller } from "@/lib/auth/admin";
import { ProductService } from "@/services/ProductService";
import { adminCreateProductSchema } from "@/validators/product";
import { isAppError, parseOrThrow } from "@/lib/errors";
import { logger } from "@/lib/logger";

/** GET /api/seller/products — this seller's own catalog. POST — create (always lands as 'draft'). */
export async function GET() {
  try {
    const { sellerId } = await requireSeller();
    return NextResponse.json(await ProductService.sellerList(sellerId));
  } catch (err) {
    if (isAppError(err)) return NextResponse.json({ error: err.publicMessage }, { status: err.statusCode });
    logger.error("GET /api/seller/products failed", { error: String(err) });
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { sellerId } = await requireSeller();
    const body = parseOrThrow(adminCreateProductSchema, await request.json());
    const product = await ProductService.sellerCreate(sellerId, body);
    return NextResponse.json(product, { status: 201 });
  } catch (err) {
    if (isAppError(err)) return NextResponse.json({ error: err.publicMessage }, { status: err.statusCode });
    logger.error("POST /api/seller/products failed", { error: String(err) });
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
