import "server-only";
import { logger } from "@/lib/logger";

/**
 * Verifies a Google reCAPTCHA v3 token server-side. v3 has no challenge UI —
 * it returns a 0.0-1.0 confidence score per request, which only Google's own
 * siteverify endpoint can be trusted to check (a client can fake anything it
 * sends, so the score itself must come from this call, never from the
 * client).
 *
 * If RECAPTCHA_SECRET_KEY isn't set, this passes everything through — the
 * store must keep working before/without reCAPTCHA being configured, not
 * silently lock everyone out.
 */
export async function verifyRecaptcha(token: string | null | undefined, action: string, minScore = 0.5): Promise<boolean> {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) return true;
  if (!token) return false;

  try {
    const response = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }),
      cache: "no-store",
    });
    const data = (await response.json()) as { success?: boolean; score?: number; action?: string; "error-codes"?: string[] };
    if (!data.success) {
      logger.warn("recaptcha.verify_failed", { errors: (data["error-codes"] ?? []).join(","), action });
      return false;
    }
    if (data.action && data.action !== action) {
      logger.warn("recaptcha.action_mismatch", { expected: action, got: data.action });
      return false;
    }
    if ((data.score ?? 0) < minScore) {
      logger.warn("recaptcha.low_score", { score: data.score, action });
      return false;
    }
    return true;
  } catch (error) {
    // A Google outage should not be able to take checkout/signup down —
    // log it and fail open, same as the "not configured" case above.
    logger.error("recaptcha.verify_error", { error: String(error) });
    return true;
  }
}
