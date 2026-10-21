import { NextResponse } from "next/server";

/**
 * 307 redirect with a relative Location header. Behind a proxy that does not
 * forward the original Host, `request.url` is the container's internal address
 * (e.g. http://0.0.0.0:3000), so absolute redirects built from it send browsers
 * to an unroutable URL. Browsers resolve a relative Location against the URL
 * they actually requested, which stays correct under any proxy config.
 */
export function safeRedirect(destination: string) {
  const response = NextResponse.redirect(new URL(destination, "https://relative.invalid"));
  response.headers.set("Location", destination);
  return response;
}
