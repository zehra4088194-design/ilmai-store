import { NextRequest, NextResponse } from "next/server";
import { ProductService } from "@/services/ProductService";
import { productListQuerySchema } from "@/validators/product";
import { isAppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

/**
 * GET /api/products — public catalog listing with filters/pagination.
 * Admin creation lives at /api/admin/products, not here, to keep a single
 * admin entry point (and a single requireAdmin() choke point).
 */
export async function GET(request: NextRequest) {
  try {
    const query = productListQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams),
    );
    const result = await ProductService.list(query);
    return NextResponse.json(result);
  } catch (err) {
    if (isAppError(err)) {
      return NextResponse.json({ error: err.publicMessage }, { status: err.statusCode });
    }
    logger.error("GET /api/products failed", { error: String(err) });
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
