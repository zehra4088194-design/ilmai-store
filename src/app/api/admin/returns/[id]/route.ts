import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { ReturnRequestService } from "@/services/ReturnRequestService";
import { isAppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

/** PATCH /api/admin/returns/[id] — approve/reject/refund a customer return request. */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json() as { status?: "approved" | "rejected" | "refunded"; adminNote?: string };
    if (!body.status || !["approved", "rejected", "refunded"].includes(body.status)) return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    await ReturnRequestService.adminUpdateStatus(id, body.status, body.adminNote);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (isAppError(err)) return NextResponse.json({ error: err.publicMessage }, { status: err.statusCode });
    logger.error("PATCH /api/admin/returns/[id] failed", { error: String(err) });
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
