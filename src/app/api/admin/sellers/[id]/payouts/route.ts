import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { SellerPayoutService } from "@/services/SellerPayoutService";
import { AuditLogService } from "@/services/AuditLogService";
import { isAppError, parseOrThrow } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { z } from "zod";

const recordPayoutSchema = z.object({
  amountMinor: z.number().int().positive(),
  currency: z.string().min(1).max(10),
  note: z.string().max(500).optional(),
});

/** GET /api/admin/sellers/[id]/payouts — earnings summary + payout history. POST — record a payout. Admin only. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const [summary, payouts] = await Promise.all([
      SellerPayoutService.getEarningsSummary(id),
      SellerPayoutService.adminListPayouts(id),
    ]);
    return NextResponse.json({ summary, payouts });
  } catch (err) {
    if (isAppError(err)) return NextResponse.json({ error: err.publicMessage }, { status: err.statusCode });
    logger.error("GET /api/admin/sellers/[id]/payouts failed", { error: String(err) });
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const body = parseOrThrow(recordPayoutSchema, await request.json());
    const payout = await SellerPayoutService.adminRecordPayout(id, body.amountMinor, body.currency, body.note, admin.userId);
    await AuditLogService.record({ actorId: admin.userId, actorRole: admin.role, action: "seller.record_payout", entityType: "seller", entityId: id, metadata: { amountMinor: body.amountMinor, currency: body.currency } });
    return NextResponse.json(payout, { status: 201 });
  } catch (err) {
    if (isAppError(err)) return NextResponse.json({ error: err.publicMessage }, { status: err.statusCode });
    logger.error("POST /api/admin/sellers/[id]/payouts failed", { error: String(err) });
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
