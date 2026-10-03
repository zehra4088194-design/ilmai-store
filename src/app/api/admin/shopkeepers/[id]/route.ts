import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { isAppError, parseOrThrow, ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { ShopkeeperService } from "@/services/ShopkeeperService";
import { shopkeeperAdminUpdateSchema } from "@/validators/shopkeeper";
import { z } from "zod";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = parseOrThrow(z.object({ id: z.string().uuid() }), await params);
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ValidationError("A valid JSON request is required.");
    }
    const update = parseOrThrow(shopkeeperAdminUpdateSchema, body);
    await ShopkeeperService.updateForAdmin(id, update);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isAppError(error)) return NextResponse.json({ error: error.publicMessage }, { status: error.statusCode });
    logger.error("PATCH /api/admin/shopkeepers/[id] failed", { error: String(error) });
    return NextResponse.json({ error: "Shopkeeper account could not be updated." }, { status: 500 });
  }
}


export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = parseOrThrow(z.object({ id: z.string().uuid() }), await params);
    await ShopkeeperService.adminRemove(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isAppError(error)) return NextResponse.json({ error: error.publicMessage }, { status: error.statusCode });
    logger.error("DELETE /api/admin/shopkeepers/[id] failed", { error: String(error) });
    return NextResponse.json({ error: "Shopkeeper access could not be removed." }, { status: 500 });
  }
}
