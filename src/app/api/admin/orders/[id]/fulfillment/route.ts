import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { OrderService } from "@/services/OrderService";
import { fulfillmentUpdateSchema } from "@/validators/commerce";
import { isAppError } from "@/lib/errors";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAdmin(); const input = fulfillmentUpdateSchema.parse(await request.json()); return NextResponse.json(await OrderService.updateFulfillment((await params).id, input)); }
  catch (error) { if (isAppError(error)) return NextResponse.json({ error: error.publicMessage }, { status: error.statusCode }); return NextResponse.json({ error: "Fulfillment could not be updated." }, { status: 500 }); }
}
