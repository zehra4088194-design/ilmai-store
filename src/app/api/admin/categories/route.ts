import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { CategoryService } from "@/services/CategoryService";
import { categorySchema } from "@/validators/product";
import { isAppError, parseOrThrow } from "@/lib/errors";
import { logger } from "@/lib/logger";

/**
 * GET /api/admin/categories — every category, including inactive (admin only).
 * POST /api/admin/categories — create a category (admin only).
 */
export async function GET() {
  try {
    await requireAdmin();
    const categories = await CategoryService.adminList();
    return NextResponse.json(categories);
  } catch (err) {
    if (isAppError(err)) return NextResponse.json({ error: err.publicMessage }, { status: err.statusCode });
    logger.error("GET /api/admin/categories failed", { error: String(err) });
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = parseOrThrow(categorySchema, await request.json());
    const category = await CategoryService.adminCreate(body);
    return NextResponse.json(category, { status: 201 });
  } catch (err) {
    if (isAppError(err)) return NextResponse.json({ error: err.publicMessage }, { status: err.statusCode });
    logger.error("POST /api/admin/categories failed", { error: String(err) });
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
