import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { CategoryService } from "@/services/CategoryService";
import { categoryUpdateSchema } from "@/validators/product";
import { isAppError } from "@/lib/errors";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAdmin(); const { id } = await params; return NextResponse.json(await CategoryService.adminUpdate(id, categoryUpdateSchema.parse(await request.json()))); }
  catch (error) { if (isAppError(error)) return NextResponse.json({ error: error.publicMessage }, { status: error.statusCode }); return NextResponse.json({ error: "Category could not be updated." }, { status: 500 }); }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAdmin(); await CategoryService.adminDelete((await params).id); return NextResponse.json({ deleted: true }); }
  catch (error) { if (isAppError(error)) return NextResponse.json({ error: error.publicMessage }, { status: error.statusCode }); return NextResponse.json({ error: "Category could not be deleted." }, { status: 500 }); }
}
