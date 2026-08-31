import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { SellerService } from "@/services/SellerService";
import { isAppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { z } from "zod";

const statusSchema = z.object({ status: z.enum(["active", "suspended"]) });

/** PATCH /api/admin/sellers/[id] — set active/suspended. DELETE — remove seller status entirely. Admin only. */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = statusSchema.parse(await request.json());
    return NextResponse.json(await SellerService.adminSetSellerStatus(id, body.status));
  } catch (err) {
    if (isAppError(err)) return NextResponse.json({ error: err.publicMessage }, { status: err.statusCode });
    logger.error("PATCH /api/admin/sellers/[id] failed", { error: String(err) });
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    await SellerService.adminRemoveSeller((await params).id);
    return NextResponse.json({ deleted: true });
  } catch (err) {
    if (isAppError(err)) return NextResponse.json({ error: err.publicMessage }, { status: err.statusCode });
    logger.error("DELETE /api/admin/sellers/[id] failed", { error: String(err) });
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
