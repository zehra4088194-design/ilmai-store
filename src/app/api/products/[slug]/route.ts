import { NextResponse } from "next/server";
import { ProductService } from "@/services/ProductService";
import { isAppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

/** GET /api/products/[slug] — single published product detail. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const product = await ProductService.getBySlug(slug);
    return NextResponse.json(product);
  } catch (err) {
    if (isAppError(err)) {
      return NextResponse.json({ error: err.publicMessage }, { status: err.statusCode });
    }
    logger.error("GET /api/products/[slug] failed", { error: String(err) });
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
