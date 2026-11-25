import "server-only";
import { randomBytes } from "node:crypto";
import { AuthorizationError, ConflictError, NotFoundError, StorageError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { canGenerateShopkeeperQr } from "@/lib/shopkeeper/access";
import { createSupabaseAdminClient } from "@/lib/supabase/server-admin";
import type { ShopkeeperStatus } from "@/constants/shopkeeper";
import type {
  shopkeeperAdminCreateSchema,
  shopkeeperAdminUpdateSchema,
  shopkeeperAccountSchema,
} from "@/validators/shopkeeper";
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

export type MerchantCredentials = { loginId: string; temporaryPassword: string };

const fields = "id,user_id,jazzcash_number,receiving_identifier,receiving_identifier_verified,status,created_at,updated_at";
const PENDING_JAZZCASH_NUMBER = "PENDING1";

function getShopName(user: { app_metadata?: Record<string, unknown>; user_metadata?: Record<string, unknown> }): string {
  const appName = user.app_metadata?.shop_name;
  if (typeof appName === "string" && appName.trim()) return appName.trim();
  const fullName = user.user_metadata?.full_name;
  if (typeof fullName === "string" && fullName.trim()) return fullName.trim();
  return "Merchant";
}

async function setShopName(userId: string, displayName: string): Promise<void> {
  const db = createSupabaseAdminClient();
  const { data, error } = await db.auth.admin.getUserById(userId);
  if (error || !data.user) throw new Error("Merchant sign-in profile could not be loaded.");

  const { error: updateError } = await db.auth.admin.updateUserById(userId, {
    app_metadata: { ...(data.user.app_metadata ?? {}), shop_name: displayName.trim() },
  });
  if (updateError) throw new Error("The merchant shop name could not be saved.");
}

export const ShopkeeperService = {
  async getForUser(userId: string) {
    const db = createSupabaseAdminClient();
    const { data, error } = await db.from("shopkeepers").select(fields).eq("user_id", userId).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;

    const { data: userData, error: userError } = await db.auth.admin.getUserById(userId);
    if (userError || !userData.user) throw new Error("Merchant sign-in profile could not be loaded.");

    return { ...data, display_name: getShopName(userData.user) } as Omit<ShopkeeperAccount, "email">;
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
      if (userError || !result.user) throw new Error("Merchant sign-in profile could not be loaded.");
      return {
        ...merchant,
        email: result.user.email ?? "",
        display_name: getShopName(result.user),
      } as ShopkeeperAccount;
    }));
  },

  /** Admin provides only the shop name; the server creates the merchant login. */
  async adminCreateByName(input: z.infer<typeof shopkeeperAdminCreateSchema>): Promise<MerchantCredentials> {
    const db = createSupabaseAdminClient();
    const code = randomBytes(5).toString("hex").toUpperCase();
    const loginId = `ilm-${code.toLowerCase()}@merchant.ilmai.store`;
    const temporaryPassword = `Ilm!${randomBytes(18).toString("base64url")}9A`;

    const { data: userData, error: createError } = await db.auth.admin.createUser({
      email: loginId,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: { full_name: input.displayName.trim() },
      app_metadata: { shop_name: input.displayName.trim(), merchant_account: true },
    });

    if (createError || !userData.user) {
      throw new ConflictError("A merchant login could not be created. Please try again or check Supabase Auth settings.");
    }

    const { error: insertError } = await db.from("shopkeepers").insert({
      user_id: userData.user.id,
      jazzcash_number: PENDING_JAZZCASH_NUMBER,
      receiving_identifier: null,
      receiving_identifier_verified: false,
      status: "pending_verification",
    });

    if (insertError) {
      const { error: cleanupError } = await db.auth.admin.deleteUser(userData.user.id);
      logger.error("Merchant provisioning: shopkeepers insert failed", {
        code: insertError.code ?? null,
        message: insertError.message,
      });
      if (cleanupError) {
        logger.error("Merchant provisioning: orphan Auth user cleanup failed", {
          code: cleanupError.code ?? null,
          message: cleanupError.message,
        });
      }

      if (insertError.code === "23505") {
        throw new ConflictError("This merchant account already exists.");
      }
      if (insertError.code === "42501") {
        throw new StorageError("Supabase denied INSERT access to public.shopkeepers. Apply migration 032_merchant_provisioning_permissions.sql to the Supabase project used by ilmai.store.");
      }
      if (insertError.code === "23514") {
        throw new ConflictError("The production shopkeepers table rejected the pending merchant record. Its JazzCash/status check constraint does not match the app's pending-account schema.");
      }
      if (insertError.code === "42P01") {
        throw new StorageError("The shopkeepers table is missing from the Supabase project used by ilmai.store. Apply migration 028_shopkeeper_jazzcash_qr.sql first.");
      }
      if (insertError.code === "42703") {
        throw new StorageError("The production shopkeepers table is missing a column required by this app. Its database migrations are out of date.");
      }
      throw new StorageError(`Merchant record could not be saved (database error ${insertError.code ?? "unknown"}). Check the ilmai.store app logs for the underlying database message.`);
    }

    return { loginId, temporaryPassword };
  },

  /** Merchants may submit only their own JazzCash details; admin verification is still required. */
  async submitReceivingDetails(userId: string, input: z.infer<typeof shopkeeperAccountSchema>): Promise<void> {
    const { data, error } = await createSupabaseAdminClient()
      .from("shopkeepers")
      .update({
        jazzcash_number: input.jazzcashNumber,
        receiving_identifier: input.receivingIdentifier,
        receiving_identifier_verified: false,
        status: "pending_verification",
      })
      .eq("user_id", userId)
      .select("id")
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) throw new NotFoundError("Merchant account not found. Ask an IlmAI administrator to add you.");
  },

  async adminRemove(id: string): Promise<void> {
    const { error } = await createSupabaseAdminClient().from("shopkeepers").delete().eq("id", id);
    if (error) throw new Error(error.message);
  },

  async updateForAdmin(id: string, input: z.infer<typeof shopkeeperAdminUpdateSchema>): Promise<void> {
    const db = createSupabaseAdminClient();
    const { data: current, error: currentError } = await db.from("shopkeepers").select("user_id").eq("id", id).maybeSingle();
    if (currentError) throw new Error(currentError.message);
    if (!current) throw new NotFoundError("Merchant not found.");

    await setShopName(current.user_id, input.displayName);

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
