import { NextResponse } from "next/server";
import { StorageService } from "@/services/StorageService";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

/**
 * GET /api/payments/[orderId]/download/[entitlementId]
 * Mints a short-lived signed B2 URL for a digital entitlement the current
 * user owns. `orderId` in the path is for readability/routing only — actual
 * ownership is re-verified against `entitlementId` inside StorageService.
 * See SECURITY.md §4.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orderId: string; entitlementId: string }> },
) {
  try {
    const { orderId, entitlementId } = await params;
    const { data: { user } } = await (await createSupabaseServerClient()).auth.getUser();
    const url = await StorageService.getDownloadUrl({ userId: user?.id, orderId }, entitlementId);
    return NextResponse.json({ url });
  } catch (err) {
    if (isAppError(err)) return NextResponse.json({ error: err.publicMessage }, { status: err.statusCode });
    logger.error("GET download url failed", { error: String(err) });
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
