import { NextRequest, NextResponse } from "next/server";
import { AD_REFERRAL_COOKIE, AD_REFERRAL_MAX_AGE_SECONDS, normalizeAdReferral } from "@/constants/ad-referral";

export function middleware(request: NextRequest) {
  const referral = normalizeAdReferral(request.nextUrl.searchParams.get("ref"));
  if (!referral) return NextResponse.next();

  const response = NextResponse.next();
  response.cookies.set({
    name: AD_REFERRAL_COOKIE,
    value: referral,
    maxAge: AD_REFERRAL_MAX_AGE_SECONDS,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
