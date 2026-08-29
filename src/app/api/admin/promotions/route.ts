import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { isAppError } from "@/lib/errors";
import { PromotionService } from "@/services/PromotionService";

export async function GET() { await requireAdmin(); return NextResponse.json(await PromotionService.adminListPromotions()); }
export async function POST(request: NextRequest) { try { await requireAdmin(); const body = await request.json() as Record<string, unknown>; if (typeof body.name !== "string" || !body.name.trim() || typeof body.startsAt !== "string") return NextResponse.json({ error: "Name and start date are required." }, { status: 400 }); return NextResponse.json(await PromotionService.adminCreatePromotion({ name: body.name.trim(), startsAt: body.startsAt, discountType: body.discountType === "fixed_amount" ? "fixed_amount" : "percentage", discountValue: Number(body.discountValue) || 1, isActive: body.isActive !== false }), { status: 201 }); } catch (err) { if (isAppError(err)) return NextResponse.json({ error: err.publicMessage }, { status: err.statusCode }); return NextResponse.json({ error: "Promotion could not be created." }, { status: 500 }); } }
