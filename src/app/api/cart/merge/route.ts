import { NextResponse } from "next/server";
import { CartService } from "@/services/CartService";
import { logger } from "@/lib/logger";

/**
 * POST /api/cart/merge — call right after a client establishes a
 * signed-in session (login, signup, OTP verify) to fold the guest cart
 * built up under the anonymous session cookie into the user's own cart.
 * Best-effort: a merge failure must never block the sign-in flow that
 * triggered it, so this always responds 200.
 */
export async function POST() {
  try {
    await CartService.mergeGuestCartOnLogin();
  } catch (err) {
    logger.error("POST /api/cart/merge failed", { error: String(err) });
  }
  return NextResponse.json({ ok: true });
}
