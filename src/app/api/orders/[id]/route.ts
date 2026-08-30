import { NextResponse } from "next/server";
import { OrderService } from "@/services/OrderService";
import { requireAdmin } from "@/lib/auth/admin";
import { isAppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

/**
 * GET /api/orders/[id] — current authenticated owner or guest-token viewer,
 * with an admin fallback (any admin may view any order).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    try {
      const order = await OrderService.getForCurrentViewer(id);
      return NextResponse.json(order);
    } catch (ownerErr) {
      // Owner/guest-token check failed — fall back to admin access before
      // giving up. Any error from the admin check re-raises the original
      // owner/guest error so we don't leak admin-specific failure detail.
      try {
        await requireAdmin();
      } catch {
        throw ownerErr;
      }
      const order = await OrderService.getByIdAdmin(id);
      return NextResponse.json(order);
    }
  } catch (err) {
    if (isAppError(err)) return NextResponse.json({ error: err.publicMessage }, { status: err.statusCode });
    logger.error("GET /api/orders/[id] failed", { error: String(err) });
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
