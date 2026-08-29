import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { OrderService } from "@/services/OrderService";
import { isAppError } from "@/lib/errors";

export async function GET() {
  try { await requireAdmin(); return NextResponse.json({ items: await OrderService.adminList() }); }
  catch (error) { if (isAppError(error)) return NextResponse.json({ error: error.publicMessage }, { status: error.statusCode }); return NextResponse.json({ error: "Internal server error." }, { status: 500 }); }
}
