import { NextRequest, NextResponse } from "next/server";
import { generatePaymentQR, validateAmount } from "@/lib/payments/paymentQr";
import { isAppError, parseOrThrow, ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { requireUser } from "@/lib/auth/admin";
import { ShopkeeperService } from "@/services/ShopkeeperService";
import { shopkeeperQrSchema } from "@/validators/shopkeeper";
import { rateLimiter } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireUser();
    const rate = await rateLimiter.check(`shopkeeper-qr:${userId}`, 120, 60);
    if (!rate.allowed) return NextResponse.json({ error: "Too many QR requests. Wait a moment and try again." }, { status: 429 });

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ValidationError("A valid JSON request is required.");
    }
    const { amount: rawAmount } = parseOrThrow(shopkeeperQrSchema, body);
    let amount: number;
    try {
      amount = validateAmount(rawAmount);
    } catch {
      throw new ValidationError("Enter a positive, whole-rupee amount within the supported range.");
    }

    const account = await ShopkeeperService.requireActiveForUser(userId);
    if (!account || !account.receiving_identifier) throw new ValidationError("This shopkeeper account has no verified JazzCash receiving identifier.");
    const { qrDataUrl } = await generatePaymentQR(amount, undefined, account.receiving_identifier);
    return NextResponse.json({ qrDataUrl }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (isAppError(error)) return NextResponse.json({ error: error.publicMessage }, { status: error.statusCode });
    logger.error("POST /api/shopkeeper/qr failed", { error: String(error) });
    return NextResponse.json({ error: "The payment QR could not be generated." }, { status: 500 });
  }
}
