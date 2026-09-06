import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/server-admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

/**
 * POST /api/account/delete — permanently deletes the current user's auth
 * account. `profiles.id` is `references auth.users(id) on delete cascade`,
 * and every per-user table cascades from there (addresses, wishlist_items,
 * carts, reviews) — `orders.user_id` is the one deliberate exception
 * (`on delete set null`), so past orders survive with the account link
 * simply cleared, preserving the financial/fulfillment record without
 * keeping the account itself. No "delete my account" path existed before
 * this at all.
 */
export async function POST() {
  try {
    const { userId } = await requireUser();
    const admin = createSupabaseAdminClient();
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) throw new Error(error.message);

    // Clear the now-invalid session cookies on the way out.
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();

    return NextResponse.json({ deleted: true });
  } catch (err) {
    if (isAppError(err)) return NextResponse.json({ error: err.publicMessage }, { status: err.statusCode });
    logger.error("POST /api/account/delete failed", { error: String(err) });
    return NextResponse.json({ error: "Your account could not be deleted. Please contact support." }, { status: 500 });
  }
}
