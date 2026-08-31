/* eslint-disable @typescript-eslint/no-explicit-any */
import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/server-admin";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";

export interface SellerAccount {
  id: string;
  email: string | null;
  businessName: string | null;
  status: "active" | "suspended";
  createdAt: string;
  productCount: number;
}

function mapSeller(row: any): SellerAccount {
  return {
    id: row.id,
    email: row.email ?? null,
    businessName: row.business_name ?? null,
    status: row.status,
    createdAt: row.created_at,
    productCount: Array.isArray(row.products) ? row.products.length : (row.product_count ?? 0),
  };
}

export const SellerService = {
  /**
   * The whole "add a seller" flow: admin types an email, we resolve it to
   * an existing auth user (get_user_id_by_email — see migration 015) and
   * create the sellers row. Deliberately does NOT create a new auth account
   * — the person has to have already signed up on the store themselves
   * (same pattern this repo already uses for granting admin access), so an
   * admin can never plant a password-less account they'd have to hand
   * credentials for.
   */
  async adminAddSellerByEmail(email: string, businessName?: string): Promise<SellerAccount> {
    const db = createSupabaseAdminClient();
    const { data: userId, error: lookupError } = await db.rpc("get_user_id_by_email", { p_email: email.trim().toLowerCase() });
    if (lookupError) throw new Error(lookupError.message);
    if (!userId) throw new NotFoundError("No account found for that email — they need to sign up on the store first.");

    const { data: existing } = await db.from("sellers").select("id").eq("id", userId).maybeSingle();
    if (existing) throw new ConflictError("This person is already a seller.");

    const { data, error } = await db
      .from("sellers")
      .insert({ id: userId, email: email.trim().toLowerCase(), business_name: businessName?.trim() || null, status: "active" })
      .select("*, products(id)")
      .single();
    if (error || !data) throw new ValidationError(error?.message ?? "Seller could not be added.");
    return mapSeller(data);
  },

  async adminListSellers(): Promise<SellerAccount[]> {
    const { data, error } = await createSupabaseAdminClient()
      .from("sellers")
      .select("*, products(id)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapSeller);
  },

  async adminSetSellerStatus(sellerId: string, status: "active" | "suspended"): Promise<SellerAccount> {
    const { data, error } = await createSupabaseAdminClient()
      .from("sellers")
      .update({ status })
      .eq("id", sellerId)
      .select("*, products(id)")
      .maybeSingle();
    if (error) throw new ValidationError(error.message);
    if (!data) throw new NotFoundError("Seller not found.");
    return mapSeller(data);
  },

  async adminRemoveSeller(sellerId: string): Promise<void> {
    // Their products fall back to platform-owned (seller_id -> null via the
    // FK's ON DELETE SET NULL) rather than disappearing — see migration 015.
    const { error } = await createSupabaseAdminClient().from("sellers").delete().eq("id", sellerId);
    if (error) throw new Error(error.message);
  },

  async getOwnProfile(sellerId: string): Promise<SellerAccount> {
    const { data, error } = await createSupabaseAdminClient()
      .from("sellers")
      .select("*, products(id)")
      .eq("id", sellerId)
      .single();
    if (error || !data) throw new NotFoundError("Seller not found.");
    return mapSeller(data);
  },
};
