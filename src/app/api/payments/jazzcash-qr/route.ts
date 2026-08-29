import { NextRequest, NextResponse } from "next/server";
import { generatePaymentQR, validateAmount } from "@/lib/payments/paymentQr";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const amountParam = request.nextUrl.searchParams.get("amount");

  try {
    const amount = validateAmount(amountParam || "");
    const { qrDataUrl } = await generatePaymentQR(amount);
    return NextResponse.json({ qrDataUrl }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json(
      { error: "A valid whole-rupee amount is required." },
      { status: 400 },
    );
  }
}
