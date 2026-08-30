import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { PromotionService } from "@/services/PromotionService";
import { promotionUpdateSchema } from "@/validators/commerce";
import { isAppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

/** PATCH /api/admin/promotions/[id] — update (e.g. toggle isActive). DELETE — remove. Admin only. */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = promotionUpdateSchema.parse(await request.json());
    return NextResponse.json(await PromotionService.adminUpdatePromotion(id, body));
  } catch (err) {
    if (isAppError(err)) return NextResponse.json({ error: err.publicMessage }, { status: err.statusCode });
    logger.error("PATCH /api/admin/promotions/[id] failed", { error: String(err) });
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    await PromotionService.adminDeletePromotion((await params).id);
    return NextResponse.json({ deleted: true });
  } catch (err) {
    if (isAppError(err)) return NextResponse.json({ error: err.publicMessage }, { status: err.statusCode });
    logger.error("DELETE /api/admin/promotions/[id] failed", { error: String(err) });
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
