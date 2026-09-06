import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { SellerService } from "@/services/SellerService";
import { SellerPayoutService } from "@/services/SellerPayoutService";
import { AuditLogService } from "@/services/AuditLogService";
import { isAppError, parseOrThrow } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { z } from "zod";

const statusSchema = z.object({ status: z.enum(["active", "suspended"]).optional(), commissionRateBps: z.number().int().min(0).max(10000).optional() });

/** PATCH /api/admin/sellers/[id] — set active/suspended and/or commission rate. DELETE — remove seller status entirely. Admin only. */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const body = parseOrThrow(statusSchema, await request.json());
    let seller = await SellerService.getOwnProfile(id).catch(() => null);
    if (body.status !== undefined) {
      seller = await SellerService.adminSetSellerStatus(id, body.status);
      await AuditLogService.record({ actorId: admin.userId, actorRole: admin.role, action: "seller.set_status", entityType: "seller", entityId: id, metadata: { status: body.status } });
    }
    if (body.commissionRateBps !== undefined) {
      await SellerPayoutService.adminSetCommissionRate(id, body.commissionRateBps);
      seller = await SellerService.getOwnProfile(id);
      await AuditLogService.record({ actorId: admin.userId, actorRole: admin.role, action: "seller.set_commission_rate", entityType: "seller", entityId: id, metadata: { commissionRateBps: body.commissionRateBps } });
    }
    if (!seller) return NextResponse.json({ error: "Seller not found." }, { status: 404 });
    return NextResponse.json(seller);
  } catch (err) {
    if (isAppError(err)) return NextResponse.json({ error: err.publicMessage }, { status: err.statusCode });
    logger.error("PATCH /api/admin/sellers/[id] failed", { error: String(err) });
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    await SellerService.adminRemoveSeller(id);
    await AuditLogService.record({ actorId: admin.userId, actorRole: admin.role, action: "seller.remove", entityType: "seller", entityId: id });
    return NextResponse.json({ deleted: true });
  } catch (err) {
    if (isAppError(err)) return NextResponse.json({ error: err.publicMessage }, { status: err.statusCode });
    logger.error("DELETE /api/admin/sellers/[id] failed", { error: String(err) });
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
