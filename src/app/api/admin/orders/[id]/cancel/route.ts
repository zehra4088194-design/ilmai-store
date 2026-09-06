import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { OrderService } from "@/services/OrderService";
import { AuditLogService } from "@/services/AuditLogService";
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
    const admin = await requireAdmin();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const reason = typeof body?.reason === "string" ? body.reason : undefined;
    const order = await OrderService.cancel(id, reason);
    await AuditLogService.record({ actorId: admin.userId, actorRole: admin.role, action: "order.cancel", entityType: "order", entityId: id, metadata: { reason, orderNumber: order.orderNumber } });
    return NextResponse.json({ order });
  } catch (err) {
    if (isAppError(err)) return NextResponse.json({ error: err.publicMessage }, { status: err.statusCode });
    logger.error("POST /api/admin/orders/[id]/cancel failed", { error: String(err) });
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
