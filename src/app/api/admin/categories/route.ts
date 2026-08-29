import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { CategoryService } from "@/services/CategoryService";
import { categorySchema } from "@/validators/product";
import { isAppError } from "@/lib/errors";

export async function GET() {
  try { await requireAdmin(); return NextResponse.json({ items: await CategoryService.adminList() }); }
  catch (error) { if (isAppError(error)) return NextResponse.json({ error: error.publicMessage }, { status: error.statusCode }); return NextResponse.json({ error: "Internal server error." }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  try { await requireAdmin(); return NextResponse.json(await CategoryService.adminCreate(categorySchema.parse(await request.json())), { status: 201 }); }
  catch (error) { if (isAppError(error)) return NextResponse.json({ error: error.publicMessage }, { status: error.statusCode }); return NextResponse.json({ error: "Category could not be created." }, { status: 500 }); }
}
