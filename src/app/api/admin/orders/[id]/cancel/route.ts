import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { OrderService } from "@/services/OrderService";
import { isAppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

/**
 * POST /api/admin/orders/[id]/cancel — admin cancels a pending/processing
 * order (e.g. customer asked to cancel, or a duplicate/mistaken order).
 * OrderService.cancel() only allows this from 'pending' or 'processing'
 * status — a fulfilled/completed order cannot be cancelled here.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const order = await OrderService.cancel(id, typeof body?.reason === "string" ? body.reason : undefined);
    return NextResponse.json({ order });
  } catch (err) {
    if (isAppError(err)) return NextResponse.json({ error: err.publicMessage }, { status: err.statusCode });
    logger.error("POST /api/admin/orders/[id]/cancel failed", { error: String(err) });
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
