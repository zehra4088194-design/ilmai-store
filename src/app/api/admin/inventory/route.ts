import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { isAppError } from "@/lib/errors";
import { InventoryService } from "@/services/InventoryService";

export async function GET() { await requireAdmin(); return NextResponse.json(await InventoryService.adminList()); }
export async function POST(request: NextRequest) {
  try { await requireAdmin(); const body = await request.json() as { variantId?: string; quantityAvailable?: number; lowStockThreshold?: number }; const variantId = body.variantId; const quantity = body.quantityAvailable; const threshold = body.lowStockThreshold; if (!variantId || typeof quantity !== "number" || typeof threshold !== "number" || !Number.isInteger(quantity) || !Number.isInteger(threshold) || quantity < 0 || threshold < 0) return NextResponse.json({ error: "Invalid inventory values." }, { status: 400 }); await InventoryService.adminUpdate(variantId, quantity, threshold); return NextResponse.json({ ok: true }); } catch (err) { if (isAppError(err)) return NextResponse.json({ error: err.publicMessage }, { status: err.statusCode }); return NextResponse.json({ error: "Inventory could not be updated." }, { status: 500 }); }
}
