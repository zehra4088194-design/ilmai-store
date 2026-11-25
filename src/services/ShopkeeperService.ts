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
  jazzcash_number: string;
  receiving_identifier: string | null;
  receiving_identifier_verified: boolean;
  status: ShopkeeperStatus;
  created_at: string;
  updated_at: string;
};

const fields = "id,user_id,jazzcash_number,receiving_identifier,receiving_identifier_verified,status,created_at,updated_at";

export const ShopkeeperService = {
  async getForUser(userId: string) {
    const { data, error } = await createSupabaseAdminClient().from("shopkeepers").select(fields).eq("user_id", userId).maybeSingle();
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
    const { data, error } = await db.from("shopkeepers").select(fields).order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return Promise.all((data ?? []).map(async (merchant) => {
      const { data: result, error: userError } = await db.auth.admin.getUserById(merchant.user_id);
      if (userError) throw new Error(userError.message);
      return { ...merchant, email: result.user.email ?? "" } as ShopkeeperAccount;
    }));
  },

  async adminAddByEmail(input: z.infer<typeof shopkeeperAdminCreateSchema>): Promise<{ invited: boolean }> {
    const db = createSupabaseAdminClient();
    const email = input.email.trim().toLowerCase();

    // Reuse an existing Auth account when present. Otherwise, create the account
    // through the admin invitation API; there is deliberately no public signup.
    const { data: existingUserId, error: lookupError } = await db.rpc("get_user_id_by_email", { p_email: email });
    if (lookupError) throw new Error(lookupError.message);

    let userId = existingUserId as string | null;
    let invited = false;

    if (!userId) {
      const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "https://ilmai.store").replace(/\/$/, "");
      const redirectTo = `${appUrl}/auth/callback?next=%2Fshopkeeper`;
      const { data: inviteData, error: inviteError } = await db.auth.admin.inviteUserByEmail(email, { redirectTo });
      if (inviteError) throw new ConflictError("The account invitation could not be sent. Check whether this email already has an account.");
      if (!inviteData.user?.id) throw new Error("Supabase did not return the invited account.");
      userId = inviteData.user.id;
      invited = true;
    }

    const { data: existing, error: existingError } = await db.from("shopkeepers").select("id").eq("user_id", userId).maybeSingle();
    if (existingError) throw new Error(existingError.message);
    if (existing) throw new ConflictError("This account is already registered as a merchant.");

    const verified = input.receivingIdentifierVerified && Boolean(input.receivingIdentifier);
    const { error } = await db.from("shopkeepers").insert({
      user_id: userId,
      jazzcash_number: input.jazzcashNumber,
      receiving_identifier: input.receivingIdentifier || null,
      receiving_identifier_verified: verified,
      status: verified ? "active" : "pending_verification",
    });
    if (error) throw new Error(error.message);

    return { invited };
  },

  async adminRemove(id: string): Promise<void> {
    const { error } = await createSupabaseAdminClient().from("shopkeepers").delete().eq("id", id);
    if (error) throw new Error(error.message);
  },

  async updateForAdmin(id: string, input: z.infer<typeof shopkeeperAdminUpdateSchema>): Promise<void> {
    const { data, error } = await createSupabaseAdminClient().from("shopkeepers").update({
      jazzcash_number: input.jazzcashNumber,
      receiving_identifier: input.receivingIdentifier || null,
      receiving_identifier_verified: input.receivingIdentifierVerified,
      status: input.status,
    }).eq("id", id).select("id").maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new NotFoundError("Merchant not found.");
  },
};
