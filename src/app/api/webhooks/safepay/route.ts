import { NextRequest, NextResponse } from "next/server";
import { PaymentService } from "@/services/PaymentService";
import { isAppError, WebhookError } from "@/lib/errors";
import { logger } from "@/lib/logger";

/**
 * POST /api/webhooks/safepay
 *
 * This is the verified Safepay path that transitions an order's payment
 * state payment_status to 'paid'. See SECURITY.md §3 and CLAUDE_CONTEXT.md
 * §7.
 *
 * Reads the raw body (not parsed JSON) because signature verification must
 * happen against the exact bytes Safepay sent — parsing first can change
 * whitespace/ordering and break HMAC verification.
 *
 * Register this URL as the webhook endpoint in the Safepay dashboard
 * (Settings → Webhooks) once live keys are issued, and confirm the exact
 * signature header name there — "x-sfpy-signature" is Safepay's documented
 * default, adjust below if the dashboard shows something else.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-sfpy-signature") ?? "";

  try {
    await PaymentService.handleWebhookEvent(rawBody, signature);
    return NextResponse.json({ received: true });
  } catch (err) {
    if (err instanceof WebhookError) {
      logger.warn("safepay.webhook_rejected", { reason: err.publicMessage });
      return NextResponse.json({ error: err.publicMessage }, { status: err.statusCode });
    }
    if (isAppError(err)) {
      return NextResponse.json({ error: err.publicMessage }, { status: err.statusCode });
    }
    logger.error("safepay.webhook_handler_failed", { error: String(err) });
    // Still 500 (not 200) so Safepay retries — do not swallow unexpected errors.
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
