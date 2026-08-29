import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { ProductMediaService } from "@/services/ProductMediaService";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; mediaId: string }> }) {
  await requireAdmin();
  const { id, mediaId } = await params;
  if (!await ProductMediaService.adminDelete(id, mediaId)) return NextResponse.json({ error: "Media not found." }, { status: 404 });
  return NextResponse.json({ deleted: true });
}
