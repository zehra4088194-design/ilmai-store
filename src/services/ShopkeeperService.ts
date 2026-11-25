import "server-only";
import { AuthorizationError, ConflictError, NotFoundError } from "@/lib/errors";
import { canGenerateShopkeeperQr } from "@/lib/shopkeeper/access";
import { createSupabaseAdminClient } from "@/lib/supabase/server-admin";
import type { ShopkeeperStatus } from "@/constants/shopkeeper";
import type { shopkeeperAdminCreateSchema, shopkeeperAdminUpdateSchema } from "@/validators/shopkeeper";
import type { z } from "zod";

export type ShopkeeperAccount = {
  id: string;
  user_id: string;
  email: string;
  display_name: string;
  jazzcash_number: string;
  receiving_identifier: string | null;
  receiving_identifier_verified: boolean;
  status: ShopkeeperStatus;
  created_at: string;
  updated_at: string;
};

const fields = "id,user_id,display_name,jazzcash_number,receiving_identifier,receiving_identifier_verified,status,created_at,updated_at";
const AUTH_USERS_PER_PAGE = 1000;

/**
 * Find an Auth user by email with Supabase's supported server-side Auth Admin API.
 * The previous implementation called a Postgres RPC named
 * get_user_id_by_email, but no migration created that function, so every add
 * request failed before it could insert the merchant.
 */
async function findAuthUserIdByEmail(email: string): Promise<string | null> {
  const db = createSupabaseAdminClient();

  for (let page = 1; page <= 1000; page += 1) {
    const { data, error } = await db.auth.admin.listUsers({
      page,
      perPage: AUTH_USERS_PER_PAGE,
    });

    if (error) {
      throw new Error("Could not look up the merchant's existing sign-in account.");
    }

    const match = data.users.find(
      (user) => user.email?.trim().toLowerCase() === email,
    );

    if (match) return match.id;
    if (data.users.length < AUTH_USERS_PER_PAGE) return null;
  }

  throw new Error("Merchant account lookup reached its safety limit.");
}

export const ShopkeeperService = {
  async getForUser(userId: string) {
    const { data, error } = await createSupabaseAdminClient()
      .from("shopkeepers")
      .select(fields)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data as Omit<ShopkeeperAccount, "email"> | null;
  },

  async requireActiveForUser(userId: string) {
    const account = await this.getForUser(userId);
    if (!account || !canGenerateShopkeeperQr(account, userId)) {
      throw new AuthorizationError("Merchant QR access is not active for this account.");
    }
    return account;
  },

  async listForAdmin(): Promise<ShopkeeperAccount[]> {
    const db = createSupabaseAdminClient();
    const { data, error } = await db
      .from("shopkeepers")
      .select(fields)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    return Promise.all((data ?? []).map(async (merchant) => {
      const { data: result, error: userError } = await db.auth.admin.getUserById(merchant.user_id);
      if (userError) throw new Error(userError.message);

      return {
        ...merchant,
        email: result.user.email ?? "",
        display_name: merchant.display_name || "Merchant",
      } as ShopkeeperAccount;
    }));
  },

  async adminAddByEmail(input: z.infer<typeof shopkeeperAdminCreateSchema>): Promise<{ invited: boolean }> {
    const db = createSupabaseAdminClient();
    const email = input.email.trim().toLowerCase();

    let userId = await findAuthUserIdByEmail(email);
    let invited = false;

    if (!userId) {
      const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "https://ilmai.store").replace(/\/$/, "");
      const redirectTo = `${appUrl}/auth/callback?next=%2Fshopkeeper`;

      const { data: inviteData, error: inviteError } = await db.auth.admin.inviteUserByEmail(email, {
        redirectTo,
        data: { full_name: input.displayName.trim() },
      });

      if (inviteError) {
        throw new ConflictError("The merchant invitation could not be sent. Check the email address and Supabase Auth email settings.");
      }
      if (!inviteData.user?.id) {
        throw new Error("Supabase did not return the invited account.");
      }

      userId = inviteData.user.id;
      invited = true;
    }

    const { data: existing, error: existingError } = await db
      .from("shopkeepers")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (existingError) throw new Error(existingError.message);
    if (existing) throw new ConflictError("This account is already registered as a merchant.");

    const verified = input.receivingIdentifierVerified && Boolean(input.receivingIdentifier);
    const { error } = await db.from("shopkeepers").insert({
      user_id: userId,
      display_name: input.displayName.trim(),
      jazzcash_number: input.jazzcashNumber,
      receiving_identifier: input.receivingIdentifier || null,
      receiving_identifier_verified: verified,
      status: verified ? "active" : "pending_verification",
    });

    if (error) throw new Error(error.message);
    return { invited };
  },

  async adminRemove(id: string): Promise<void> {
    const { error } = await createSupabaseAdminClient()
      .from("shopkeepers")
      .delete()
      .eq("id", id);

    if (error) throw new Error(error.message);
  },

  async updateForAdmin(id: string, input: z.infer<typeof shopkeeperAdminUpdateSchema>): Promise<void> {
    const { data, error } = await createSupabaseAdminClient()
      .from("shopkeepers")
      .update({
        display_name: input.displayName.trim(),
        jazzcash_number: input.jazzcashNumber,
        receiving_identifier: input.receivingIdentifier || null,
        receiving_identifier_verified: input.receivingIdentifierVerified,
        status: input.status,
      })
      .eq("id", id)
      .select("id")
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) throw new NotFoundError("Merchant not found.");
  },
};
