import { NextResponse } from "next/server";
import { CategoryService } from "@/services/CategoryService";
import { isAppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

/**
 * GET /api/categories — public, active categories only. Admin
 * create/update/delete lives at /api/admin/categories.
 */
export async function GET() {
  try {
    const categories = await CategoryService.list();
    return NextResponse.json(categories);
  } catch (err) {
    if (isAppError(err)) return NextResponse.json({ error: err.publicMessage }, { status: err.statusCode });
    logger.error("GET /api/categories failed", { error: String(err) });
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
