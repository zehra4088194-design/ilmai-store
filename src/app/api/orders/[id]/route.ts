import { NextResponse } from "next/server";
import { OrderService } from "@/services/OrderService";
import { isAppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

/** GET /api/orders/[id] — current authenticated owner or guest-token viewer. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const order = await OrderService.getForCurrentViewer(id);
    return NextResponse.json(order);
  } catch (err) {
    if (isAppError(err)) return NextResponse.json({ error: err.publicMessage }, { status: err.statusCode });
    logger.error("GET /api/orders/[id] failed", { error: String(err) });
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
