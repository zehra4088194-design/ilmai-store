import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/server-admin";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

export interface RateLimiter {
  check(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult>;
}

export class PostgresRateLimiter implements RateLimiter {
  async check(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
    const { data, error } = await createSupabaseAdminClient().rpc("consume_rate_limit", {
      p_bucket_key: key,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });
    if (error) throw new Error(error.message);
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) throw new Error("Rate limiter returned no result.");
    return {
      allowed: Boolean(row.allowed),
      remaining: Number(row.remaining),
      resetAt: new Date(String(row.reset_at)),
    };
  }
}

export const rateLimiter: RateLimiter = new PostgresRateLimiter();

/** Uses the first proxy address, as Coolify/Oracle sits behind a proxy. */
export function getClientAddress(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip")?.trim() || "unknown";
}
