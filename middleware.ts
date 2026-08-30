import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { AD_REFERRAL_COOKIE, AD_REFERRAL_MAX_AGE_SECONDS, normalizeAdReferral } from "@/constants/ad-referral";

export async function middleware(request: NextRequest) {
  // Session-refresh response: a Supabase server client bound to this
  // request/response pair, so a logged-in session's auth cookies get
  // rewritten (refreshed) on every navigation. See @supabase/ssr docs.
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  // Refreshes the session (rewriting cookies via setAll above if needed).
  await supabase.auth.getUser();

  // Existing ad-referral cookie capture — unchanged behavior, merged onto
  // the same response so both concerns' cookies survive.
  const referral = normalizeAdReferral(request.nextUrl.searchParams.get("ref"));
  if (referral) {
    response.cookies.set({
      name: AD_REFERRAL_COOKIE,
      value: referral,
      maxAge: AD_REFERRAL_MAX_AGE_SECONDS,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
