import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ProductService } from "@/services/ProductService";
import { isAppError, parseOrThrow } from "@/lib/errors";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

/**
 * POST /api/internal/notes-product — service-to-service only (never called from a browser).
 *
 * ilmai.study's "Order printed notes" button on a library resource calls this to get (creating
 * it first if needed) the matching product on this store, so the student can be sent straight to
 * its checkout page. Same bearer-secret pattern as the cron routes and AdReferralService's
 * cross-app calls — see NOTES_PRODUCT_SYNC_SECRET in ENVIRONMENT.md. Not requireAdmin()-gated
 * because the caller is ilmai.study's own server, not a logged-in admin browser session.
 */
const bodySchema = z.object({
  resourceId: z.string().uuid(),
  title: z.string().min(1).max(200),
  priceMinor: z.number().int().min(1),
  pageCount: z.number().int().min(1),
});

export async function POST(request: NextRequest) {
  const expected = process.env.NOTES_PRODUCT_SYNC_SECRET;
  const authorization = request.headers.get("authorization");
  if (!expected || authorization !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = parseOrThrow(bodySchema, await request.json());
    const result = await ProductService.syncNotesProduct(body);
    return NextResponse.json(result);
  } catch (err) {
    if (isAppError(err)) return NextResponse.json({ error: err.publicMessage }, { status: err.statusCode });
    logger.error("POST /api/internal/notes-product failed", { error: String(err) });
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
