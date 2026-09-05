import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

/**
 * GET /auth/callback — lands here for any Supabase email link that uses the
 * PKCE code flow (the browser client is created with `createBrowserClient`,
 * which defaults to PKCE) — currently just the password-recovery link
 * `resetPasswordForEmail` sends, but written generically so any future
 * `emailRedirectTo` can point here too. Exchanges the `code` query param for
 * a real session (this has to happen server-side so the session cookies get
 * set), then forwards to wherever the flow should continue.
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = request.nextUrl.searchParams.get("next");
  const destination = next && next.startsWith("/") && !next.startsWith("//") ? next : "/auth/reset-password";

  if (code) {
    try {
      const supabase = await createSupabaseServerClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) throw error;
    } catch (error) {
      logger.error("GET /auth/callback failed", { error: error instanceof Error ? error.message : String(error) });
      return NextResponse.redirect(new URL("/login?error=link-expired", request.url));
    }
  }

  return NextResponse.redirect(new URL(destination, request.url));
}
