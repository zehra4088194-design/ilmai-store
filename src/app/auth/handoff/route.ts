import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server-admin";
import { verifyStoreHandoffToken } from "@/lib/auth/handoff";
import { logger } from "@/lib/logger";

/**
 * GET /auth/handoff — the landing point for ilmai.study's "Store" link
 * (src/app/api/store-handoff/route.ts there mints the token). The two apps
 * run on separate Supabase Auth projects, so this signs the browser into the
 * matching (or newly created) store account instead of leaving the visitor
 * logged out. `profiles.ilmai_study_user_id` is the cross-link key.
 *
 * On any failure (missing/expired/tampered token, Supabase error) this falls
 * through to a plain logged-out redirect rather than an error page — a
 * broken handoff should never be worse than just landing on the store.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const next = request.nextUrl.searchParams.get("next");
  const destination = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";

  const payload = token ? verifyStoreHandoffToken(token) : null;
  if (!payload) {
    return NextResponse.redirect(new URL(destination, request.url));
  }

  try {
    const admin = createSupabaseAdminClient();

    const { data: linked } = await admin
      .from("profiles")
      .select("id, full_name, avatar_url, ilmai_study_user_id")
      .eq("ilmai_study_user_id", payload.sub)
      .maybeSingle();

    let userId = linked?.id as string | undefined;

    // Not linked yet — admin.generateLink's 'magiclink' type both finds an
    // existing user by email and creates one if none exists, so this single
    // call covers "returning store user, first time via the bridge" and
    // "brand-new store account" together. We still verify the id we get
    // back and fall back to an explicit createUser if generateLink somehow
    // reports the user as missing (defensive — covers a Supabase version
    // where 'magiclink' does NOT auto-create).
    let hashedToken: string | undefined;
    let resolvedEmail = payload.email;

    if (userId) {
      const { data: existingUser, error: getUserError } = await admin.auth.admin.getUserById(userId);
      if (getUserError || !existingUser?.user?.email) throw getUserError ?? new Error("Linked store user not found.");
      resolvedEmail = existingUser.user.email;
    }

    const link = await admin.auth.admin.generateLink(
      userId
        ? { type: "magiclink", email: resolvedEmail }
        : { type: "magiclink", email: payload.email }
    );

    if (link.error || !link.data?.properties?.hashed_token) {
      // Only path left: the account genuinely doesn't exist and this
      // Supabase version's 'magiclink' didn't auto-create it.
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email: payload.email,
        email_confirm: true,
        user_metadata: { full_name: payload.fullName, avatar_url: payload.avatarUrl },
      });
      if (createError || !created?.user) throw createError ?? new Error("Store account could not be created.");
      userId = created.user.id;
      const retry = await admin.auth.admin.generateLink({ type: "magiclink", email: payload.email });
      if (retry.error || !retry.data?.properties?.hashed_token) {
        throw retry.error ?? new Error("Sign-in link could not be generated.");
      }
      hashedToken = retry.data.properties.hashed_token;
    } else {
      userId = link.data.user?.id ?? userId;
      hashedToken = link.data.properties.hashed_token;
    }

    if (!userId || !hashedToken) throw new Error("Handoff could not resolve a store account.");

    // Backfill the cross-link + any profile fields the store account is
    // still missing — never overwrites what the user already set here.
    const profileUpdates: Record<string, unknown> = {};
    if (!linked || !linked.ilmai_study_user_id) profileUpdates.ilmai_study_user_id = payload.sub;
    if (!linked?.full_name && payload.fullName) profileUpdates.full_name = payload.fullName;
    if (!linked?.avatar_url && payload.avatarUrl) profileUpdates.avatar_url = payload.avatarUrl;
    if (Object.keys(profileUpdates).length) {
      await admin.from("profiles").update(profileUpdates).eq("id", userId);
    }

    const supabase = await createSupabaseServerClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({
      type: "magiclink",
      token_hash: hashedToken,
      email: resolvedEmail,
    });
    if (verifyError) throw verifyError;

    return NextResponse.redirect(new URL(destination, request.url));
  } catch (error) {
    logger.error("GET /auth/handoff failed", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.redirect(new URL(destination, request.url));
  }
}
