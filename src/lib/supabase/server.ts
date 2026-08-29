import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server-side Supabase client bound to the current request's session
 * cookies. Still RLS-restricted (anon key) — this is what route handlers
 * and server components should use for anything scoped to "the current
 * user." For privileged operations that must bypass RLS, use
 * `server-admin.ts` instead, and only from within an already
 * admin-authorized code path.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component with no request context to
            // write to — safe to ignore if middleware refreshes sessions.
          }
        },
      },
    },
  );
}
