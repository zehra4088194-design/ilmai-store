import { NextResponse } from "next/server";

/** Keep callback redirects relative so they continue to work behind Coolify's reverse proxy. */
export function safeRedirect(destination: string) {
  const response = NextResponse.redirect(new URL(destination, "https://relative.invalid"));
  response.headers.set("Location", destination);
  return response;
}
