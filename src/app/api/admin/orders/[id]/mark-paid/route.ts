import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { ValidationError, isAppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { OrderCompletionService } from "@/services/OrderCompletionService";
import { ManualPaymentService } from "@/services/ManualPaymentService";

/**
 * POST /api/admin/orders/[id]/mark-paid — the manual counterpart to Paddle's
 * webhook-driven payment_status flip, for the JazzCash wallet method only.
 *
 * Deliberately refuses to touch a 'paddle' order: CLAUDE_CONTEXT.md §7's rule
 * ("only a signature-verified webhook may set payment_status = 'paid'") is
 * about automated provider events specifically, and this endpoint is the
 * accepted manual-verification alternative for a provider (JazzCash) that
 * has no webhook at all — but it must not become a backdoor for skipping
 * Paddle's real webhook verification, so it only acts on orders whose most
 * recent payment row is 'jazzcash'.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id: orderId } = await params;

    const payment = await ManualPaymentService.getManualPayment(orderId);
    if (!payment || payment.provider !== "jazzcash") {
      throw new ValidationError("Only manual JazzCash orders can be marked paid here.");
    }

    const completed = await OrderCompletionService.completePaidOrder({
      orderId,
      provider: "jazzcash",
      transaction: {
        providerTransactionId: `jazzcash_${orderId}`,
        status: "paid",
        amountMinor: payment.amountMinor,
        currency: payment.currency,
        paidAt: new Date().toISOString(),
      },
    });
    await ManualPaymentService.approveClaim(orderId, admin.userId);

    return NextResponse.json({ order: completed });
  } catch (err) {
    if (isAppError(err)) return NextResponse.json({ error: err.publicMessage }, { status: err.statusCode });
    logger.error("POST /api/admin/orders/[id]/mark-paid failed", { error: String(err) });
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
