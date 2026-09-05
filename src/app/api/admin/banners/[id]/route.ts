import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { PromotionService } from "@/services/PromotionService";
import { bannerUpdateSchema } from "@/validators/commerce";
import { isAppError, parseOrThrow } from "@/lib/errors";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAdmin(); const { id } = await params; return NextResponse.json(await PromotionService.adminUpdateBanner(id, parseOrThrow(bannerUpdateSchema, await request.json()))); }
  catch (error) { if (isAppError(error)) return NextResponse.json({ error: error.publicMessage }, { status: error.statusCode }); return NextResponse.json({ error: "Banner could not be updated." }, { status: 500 }); }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAdmin(); await PromotionService.adminDeleteBanner((await params).id); return NextResponse.json({ deleted: true }); }
  catch (error) { if (isAppError(error)) return NextResponse.json({ error: error.publicMessage }, { status: error.statusCode }); return NextResponse.json({ error: "Banner could not be deleted." }, { status: 500 }); }
}
