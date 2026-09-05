import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { ManualPaymentService } from "@/services/ManualPaymentService";
import { manualPaymentReviewSchema } from "@/validators/commerce";
import { isAppError, parseOrThrow } from "@/lib/errors";
import { logger } from "@/lib/logger";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const body = parseOrThrow(manualPaymentReviewSchema, await request.json().catch(() => ({})));
    await ManualPaymentService.rejectProof(id, admin.userId, body.reviewerNote);
    return NextResponse.json({ rejected: true });
  } catch (err) {
    if (isAppError(err)) return NextResponse.json({ error: err.publicMessage }, { status: err.statusCode });
    logger.error("POST manual payment rejection failed", { error: String(err) });
    return NextResponse.json({ error: "Payment claim could not be rejected." }, { status: 500 });
  }
}
