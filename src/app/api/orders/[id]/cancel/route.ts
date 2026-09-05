import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/admin";
import { OrderService } from "@/services/OrderService";
import { ValidationError, isAppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

/**
 * POST /api/orders/[id]/cancel — customer self-serve cancel, ownership
 * enforced. Only for an order that hasn't been paid yet (a QR was
 * generated / a card checkout was started but never completed) — once
 * payment_status is 'paid', cancelling here would silently drop the order
 * without refunding it, so those must go through a return/refund request
 * instead (POST /api/orders/[id]/return-request), reviewed by an admin.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await requireUser();
    const { id } = await params;
    const order = await OrderService.getForCurrentViewer(id);
    if (order.userId !== userId) throw new ValidationError("Order not found.");
    if (order.paymentStatus === "paid") throw new ValidationError("This order is already paid — submit a return/refund request instead.");
    if (!["pending", "processing"].includes(order.status)) throw new ValidationError("This order can no longer be cancelled.");
    const cancelled = await OrderService.cancel(id);
    return NextResponse.json({ order: cancelled });
  } catch (err) {
    if (isAppError(err)) return NextResponse.json({ error: err.publicMessage }, { status: err.statusCode });
    logger.error("POST /api/orders/[id]/cancel failed", { error: String(err) });
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
