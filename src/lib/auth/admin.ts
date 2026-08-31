import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server-admin";
import { AuthenticationError, AuthorizationError } from "@/lib/errors";
import type { AdminUser } from "@/types/domain";

/**
 * The single choke point for every `/api/admin/**` route handler and admin
 * server action. Resolves the current session, checks `admin_users`, and
 * throws if the caller isn't an admin. See SECURITY.md §8.
 *
 * Usage in a route handler:
 *   const admin = await requireAdmin();
 *   // ... proceed, admin.userId is trusted
 */
export async function requireAdmin(): Promise<AdminUser> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new AuthenticationError();
  }

  // admin_users has no client-readable RLS policy for other users' rows,
  // so this check goes through the service-role client. The caller's
  // identity has already been established above via the session-bound
  // client, so this is not a privilege escalation — just a lookup.
  const adminClient = createSupabaseAdminClient();
  const { data: adminRow } = await adminClient
    .from("admin_users")
    .select("user_id, role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!adminRow) {
    throw new AuthorizationError("Admin access required.");
  }

  return { userId: adminRow.user_id, role: adminRow.role };
}

/** Returns the current authenticated user id, or throws AuthenticationError. */
export async function requireUser(): Promise<{ userId: string; email: string | null }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new AuthenticationError();
  }

  return { userId: user.id, email: user.email ?? null };
}

/**
 * The choke point for every `/api/seller/**` route handler and every
 * /seller/** page. Mirrors requireAdmin() exactly, just against the
 * `sellers` table instead of `admin_users` — a seller can only ever act on
 * their OWN products (every SellerService method takes the returned
 * `sellerId` and scopes its query to it), never anyone else's. Full,
 * unscoped control over every product/order/etc. stays admin-only.
 */
export async function requireSeller(): Promise<{ sellerId: string; businessName: string | null; status: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new AuthenticationError();
  }

  const adminClient = createSupabaseAdminClient();
  const { data: sellerRow } = await adminClient
    .from("sellers")
    .select("id, business_name, status")
    .eq("id", user.id)
    .maybeSingle();

  if (!sellerRow) {
    throw new AuthorizationError("Seller access required.");
  }
  if (sellerRow.status !== "active") {
    throw new AuthorizationError("This seller account is suspended.");
  }

  return { sellerId: sellerRow.id, businessName: sellerRow.business_name, status: sellerRow.status };
}
