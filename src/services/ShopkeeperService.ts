import "server-only";
import { AuthorizationError, ConflictError, NotFoundError } from "@/lib/errors";
import { canGenerateShopkeeperQr } from "@/lib/shopkeeper/access";
import { createSupabaseAdminClient } from "@/lib/supabase/server-admin";
import type { ShopkeeperStatus } from "@/constants/shopkeeper";
import type { shopkeeperAdminCreateSchema, shopkeeperAdminUpdateSchema } from "@/validators/shopkeeper";
import type { User } from "@supabase/supabase-js";
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

const fields = "id,user_id,jazzcash_number,receiving_identifier,receiving_identifier_verified,status,created_at,updated_at";
const AUTH_USERS_PER_PAGE = 1000;

function getShopName(user: User): string {
  const appName = user.app_metadata?.shop_name;
  if (typeof appName === "string" && appName.trim()) return appName.trim();

  const fullName = user.user_metadata?.full_name;
  if (typeof fullName === "string" && fullName.trim()) return fullName.trim();

  return "Merchant";
}

/**
 * Find an Auth user by email with Supabase's supported server-side Auth Admin API.
 * The previous implementation called a Postgres RPC named
 * get_user_id_by_email, but no migration created that function, so every add
 * request failed before it could insert the merchant.
 */
async function findAuthUserByEmail(email: string): Promise<User | null> {
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

    if (match) return match;
    if (data.users.length < AUTH_USERS_PER_PAGE) return null;
  }

  throw new Error("Merchant account lookup reached its safety limit.");
}

/** Store the public-facing shop label in server-managed metadata, not user-editable metadata. */
async function setShopName(user: User, displayName: string): Promise<void> {
  const { error } = await createSupabaseAdminClient().auth.admin.updateUserById(user.id, {
    app_metadata: {
      ...(user.app_metadata ?? {}),
      shop_name: displayName.trim(),
    },
  });

  if (error) throw new Error("The merchant shop name could not be saved.");
}

export const ShopkeeperService = {
  async getForUser(userId: string) {
    const db = createSupabaseAdminClient();
    const { data, error } = await db
      .from("shopkeepers")
      .select(fields)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return null;

    const { data: userData, error: userError } = await db.auth.admin.getUserById(userId);
    if (userError || !userData.user) throw new Error("Merchant sign-in profile could not be loaded.");

    return {
      ...data,
      display_name: getShopName(userData.user),
    } as Omit<ShopkeeperAccount, "email">;
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
      if (userError || !result.user) throw new Error("Merchant sign-in profile could not be loaded.");

      return {
        ...merchant,
        email: result.user.email ?? "",
        display_name: getShopName(result.user),
      } as ShopkeeperAccount;
    }));
  },

  async adminAddByEmail(input: z.infer<typeof shopkeeperAdminCreateSchema>): Promise<{ invited: boolean }> {
    const db = createSupabaseAdminClient();
    const email = input.email.trim().toLowerCase();

    let authUser = await findAuthUserByEmail(email);
    let invited = false;

    if (!authUser) {
      const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "https://ilmai.store").replace(/\/$/, "");
      const redirectTo = `${appUrl}/auth/callback?next=%2Fshopkeeper`;

      const { data: inviteData, error: inviteError } = await db.auth.admin.inviteUserByEmail(email, {
        redirectTo,
        data: { full_name: input.displayName.trim() },
      });

      if (inviteError) {
        throw new ConflictError("The merchant invitation could not be sent. Check the email address and Supabase Auth email settings.");
      }
      if (!inviteData.user) {
        throw new Error("Supabase did not return the invited account.");
      }

      authUser = inviteData.user;
      invited = true;
    }

    const { data: existing, error: existingError } = await db
      .from("shopkeepers")
      .select("id")
      .eq("user_id", authUser.id)
      .maybeSingle();

    if (existingError) throw new Error(existingError.message);
    if (existing) throw new ConflictError("This account is already registered as a merchant.");

    const { error: insertError } = await db.from("shopkeepers").insert({
      user_id: authUser.id,
      jazzcash_number: input.jazzcashNumber,
      receiving_identifier: input.receivingIdentifier || null,
      receiving_identifier_verified: input.receivingIdentifierVerified && Boolean(input.receivingIdentifier),
      status: input.receivingIdentifierVerified && input.receivingIdentifier ? "active" : "pending_verification",
    });

    if (insertError) throw new Error(insertError.message);

    await setShopName(authUser, input.displayName);
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
    const db = createSupabaseAdminClient();
    const { data: current, error: currentError } = await db
      .from("shopkeepers")
      .select("user_id")
      .eq("id", id)
      .maybeSingle();

    if (currentError) throw new Error(currentError.message);
    if (!current) throw new NotFoundError("Merchant not found.");

    const { data: userData, error: userError } = await db.auth.admin.getUserById(current.user_id);
    if (userError || !userData.user) throw new NotFoundError("Merchant sign-in account not found.");

    await setShopName(userData.user, input.displayName);

    const { data, error } = await db.from("shopkeepers").update({
      jazzcash_number: input.jazzcashNumber,
      receiving_identifier: input.receivingIdentifier || null,
      receiving_identifier_verified: input.receivingIdentifierVerified,
      status: input.status,
    }).eq("id", id).select("id").maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) throw new NotFoundError("Merchant not found.");
  },
};
