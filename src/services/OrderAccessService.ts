import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { createSupabaseAdminClient } from "@/lib/supabase/server-admin";

const ACCESS_COOKIE_PREFIX = "ilmai_order_access_";
const ACCESS_TOKEN_TTL_DAYS = 30;

export function orderAccessCookieName(orderId: string) {
  return `${ACCESS_COOKIE_PREFIX}${orderId}`;
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export const OrderAccessService = {
  async issue(orderId: string): Promise<string> {
    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + ACCESS_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const { error } = await createSupabaseAdminClient().from("order_access_tokens").upsert({
      order_id: orderId,
      token_hash: hashToken(token),
      expires_at: expiresAt,
      revoked_at: null,
      last_used_at: null,
    }, { onConflict: "order_id" });
    if (error) throw new Error(error.message);
    return token;
  },

  async getTokenFromCookie(orderId: string): Promise<string | undefined> {
    return (await cookies()).get(orderAccessCookieName(orderId))?.value;
  },

  async verify(orderId: string, token: string | undefined): Promise<boolean> {
    if (!token || token.length < 32 || token.length > 128) return false;
    const db = createSupabaseAdminClient();
    const { data, error } = await db
      .from("order_access_tokens")
      .select("id")
      .eq("order_id", orderId)
      .eq("token_hash", hashToken(token))
      .is("revoked_at", null)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return false;
    await db.from("order_access_tokens").update({ last_used_at: new Date().toISOString() }).eq("id", data.id);
    return true;
  },
};
