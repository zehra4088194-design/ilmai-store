import "server-only";
import { createHmac, timingSafeEqual } from "crypto";

// Verifier for the short-lived handoff token ilmai.study's
// /api/store-handoff mints (src/lib/store-handoff.ts there — the payload
// shape and HMAC scheme here must stay byte-for-byte identical to that file).
// STORE_HANDOFF_SECRET must be the same value on both deployments.

export type StoreHandoffPayload = {
  sub: string; // ilmai.study's auth.users.id — cross-linked via profiles.ilmai_study_user_id
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  iat: number;
  exp: number;
};

function sign(payloadB64: string, secret: string) {
  return createHmac("sha256", secret).update(payloadB64).digest("hex");
}

export function verifyStoreHandoffToken(token: string): StoreHandoffPayload | null {
  const secret = process.env.STORE_HANDOFF_SECRET;
  if (!secret) return null;

  const [payloadB64, signature] = token.split(".");
  if (!payloadB64 || !signature) return null;

  const expected = sign(payloadB64, secret);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8")) as StoreHandoffPayload;
    if (typeof payload.exp !== "number" || Date.now() > payload.exp) return null;
    if (typeof payload.sub !== "string" || typeof payload.email !== "string") return null;
    return payload;
  } catch {
    return null;
  }
}
