import { NextResponse } from "next/server";
import { manualPaymentProofSchema } from "@/validators/commerce";
import { ManualPaymentService } from "@/services/ManualPaymentService";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAppError, parseOrThrow } from "@/lib/errors";
import { logger } from "@/lib/logger";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = parseOrThrow(manualPaymentProofSchema, await request.json());
    const { data: { user } } = await (await createSupabaseServerClient()).auth.getUser();
    await ManualPaymentService.submitProof(id, body, user?.id);
    return NextResponse.json({ submitted: true });
  } catch (err) {
    if (isAppError(err)) return NextResponse.json({ error: err.publicMessage }, { status: err.statusCode });
    logger.error("POST /api/orders/[id]/manual-payment failed", { error: String(err) });
    return NextResponse.json({ error: "Payment proof could not be submitted." }, { status: 500 });
  }
}
