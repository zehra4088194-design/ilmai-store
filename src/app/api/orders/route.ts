import { NextResponse } from "next/server";
import { OrderService } from "@/services/OrderService";
import { requireUser } from "@/lib/auth/admin";
import { isAppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

/** GET /api/orders — current user's order history. */
export async function GET() {
  try {
    const { userId } = await requireUser();
    const orders = await OrderService.listForUser(userId);
    return NextResponse.json({ items: orders });
  } catch (err) {
    if (isAppError(err)) return NextResponse.json({ error: err.publicMessage }, { status: err.statusCode });
    logger.error("GET /api/orders failed", { error: String(err) });
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
