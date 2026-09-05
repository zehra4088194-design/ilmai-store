import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { ProductService } from "@/services/ProductService";
import { adminCreateProductSchema } from "@/validators/product";
import { isAppError, parseOrThrow } from "@/lib/errors";
import { logger } from "@/lib/logger";

/**
 * POST /api/admin/products — create a product (admin only).
 * This is the single entry point for product creation — there is no
 * duplicate at /api/products, to keep one requireAdmin() choke point.
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = parseOrThrow(adminCreateProductSchema, await request.json());
    const product = await ProductService.adminCreate(body);
    return NextResponse.json(product, { status: 201 });
  } catch (err) {
    if (isAppError(err)) return NextResponse.json({ error: err.publicMessage }, { status: err.statusCode });
    logger.error("POST /api/admin/products failed", { error: String(err) });
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
