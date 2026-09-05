import { NextResponse } from "next/server";
import { ManualPaymentService } from "@/services/ManualPaymentService";
import { ALLOWED_PAYMENT_PROOF_MIME_TYPES, MAX_PAYMENT_PROOF_UPLOAD_BYTES } from "@/constants/upload";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const form = await request.formData();
    const value = form.get("proof");
    const transactionReference = String(form.get("transactionReference") ?? "").trim();
    if (transactionReference.length < 3 || transactionReference.length > 120) return NextResponse.json({ error: "Enter a valid JazzCash transaction ID." }, { status: 400 });
    if (!(value instanceof File)) return NextResponse.json({ error: "Choose a payment screenshot or PDF." }, { status: 400 });
    if (!ALLOWED_PAYMENT_PROOF_MIME_TYPES.includes(value.type as typeof ALLOWED_PAYMENT_PROOF_MIME_TYPES[number])) return NextResponse.json({ error: "Only JPG, PNG, WebP, or PDF proof is allowed." }, { status: 400 });
    if (value.size < 1 || value.size > MAX_PAYMENT_PROOF_UPLOAD_BYTES) return NextResponse.json({ error: "Payment proof must be smaller than 8 MB." }, { status: 400 });
    const { data: { user } } = await (await createSupabaseServerClient()).auth.getUser();
    await ManualPaymentService.uploadProof(id, { name: value.name, type: value.type, bytes: Buffer.from(await value.arrayBuffer()) }, transactionReference, user?.id);
    return NextResponse.json({ submitted: true });
  } catch (error) {
    // Was missing the isAppError check every other route here has — a
    // real, actionable AppError (e.g. "your order link expired") fell
    // through to this generic 500 instead of reaching the customer.
    if (isAppError(error)) return NextResponse.json({ error: error.publicMessage }, { status: error.statusCode });
    logger.error("POST payment proof upload failed", { error: String(error) });
    return NextResponse.json({ error: "Payment proof could not be uploaded." }, { status: 500 });
  }
}
