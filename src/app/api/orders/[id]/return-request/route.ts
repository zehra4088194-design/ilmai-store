import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/admin";
import { ReturnRequestService } from "@/services/ReturnRequestService";
import { ValidationError, isAppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

/** POST /api/orders/[id]/return-request — customer submits a return/refund request on a paid order they own, with a reason. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await requireUser();
    const { id } = await params;
    const body = await request.json().catch(() => ({})) as { reason?: string };
    const reason = (body.reason ?? "").trim();
    if (reason.length < 5) throw new ValidationError("Please describe the reason for your return.");
    await ReturnRequestService.submit(userId, id, reason);
    return NextResponse.json({ submitted: true });
  } catch (err) {
    if (isAppError(err)) return NextResponse.json({ error: err.publicMessage }, { status: err.statusCode });
    logger.error("POST /api/orders/[id]/return-request failed", { error: String(err) });
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
