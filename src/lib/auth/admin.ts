import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server-admin";
import { AuthenticationError, AuthorizationError } from "@/lib/errors";

export type AdminUser = { userId: string; role: "admin" };

/** The single authorization gate for every merchant-admin route and page. */
export async function requireAdmin(): Promise<AdminUser> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new AuthenticationError();

  const { data: adminRow } = await createSupabaseAdminClient()
    .from("admin_users")
    .select("user_id, role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!adminRow) throw new AuthorizationError("Admin access required.");
  return { userId: adminRow.user_id, role: "admin" };
}

/** Resolve the current authenticated account for merchant-only operations. */
export async function requireUser(): Promise<{ userId: string; email: string | null }> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new AuthenticationError();
  return { userId: user.id, email: user.email ?? null };
}
