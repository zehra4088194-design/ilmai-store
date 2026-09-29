import "server-only";
import { AuthorizationError, NotFoundError } from "@/lib/errors";
import { SHOPKEEPER_QR_PRODUCT_SLUG } from "@/constants/shopkeeper";
import { canGenerateShopkeeperQr } from "@/lib/shopkeeper/access";
import { createSupabaseAdminClient } from "@/lib/supabase/server-admin";
import type { ShopkeeperStatus } from "@/constants/shopkeeper";
import type { shopkeeperAdminUpdateSchema, shopkeeperProfileSchema } from "@/validators/shopkeeper";
import type { z } from "zod";

type Account = {
  id: string;
  user_id: string;
  service_order_id: string;
  business_name: string | null;
  jazzcash_number: string | null;
  jazzcash_account_name: string | null;
  receiving_identifier: string | null;
  receiving_identifier_verified: boolean;
  status: ShopkeeperStatus;
  created_at: string;
  updated_at: string;
};

const accountFields = "id,user_id,service_order_id,business_name,jazzcash_number,jazzcash_account_name,receiving_identifier,receiving_identifier_verified,status,created_at,updated_at";

async function orderIsPaid(orderId: string): Promise<boolean> {
  const { data, error } = await createSupabaseAdminClient().from("orders").select("payment_status,status").eq("id", orderId).maybeSingle();
  if (error) throw new Error(error.message);
  return data?.payment_status === "paid" && !["cancelled", "refunded"].includes(data.status);
}

export const ShopkeeperService = {
  async getForUser(userId: string) {
    const { data, error } = await createSupabaseAdminClient().from("shopkeepers").select(accountFields).eq("user_id", userId).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    const account = data as Account;
    return { ...account, orderPaid: await orderIsPaid(account.service_order_id) };
  },

  async requireActiveForUser(userId: string) {
    const account = await this.getForUser(userId);
    if (!canGenerateShopkeeperQr(account, userId)) {
      throw new AuthorizationError("An active, verified shopkeeper QR service entitlement is required.");
    }
    return account;
  },

  async saveOwnProfile(userId: string, input: z.infer<typeof shopkeeperProfileSchema>) {
    const account = await this.getForUser(userId);
    if (!account || !account.orderPaid) throw new AuthorizationError("Purchase the Dynamic JazzCash QR service before setting up a shopkeeper account.");
    if (account.status === "suspended" || account.status === "revoked") {
      throw new AuthorizationError("This shopkeeper account cannot be changed while access is suspended or revoked.");
    }
    const { error } = await createSupabaseAdminClient().from("shopkeepers").update({
      business_name: input.businessName,
      jazzcash_number: input.jazzcashNumber,
      jazzcash_account_name: input.jazzcashAccountName,
      status: "pending_verification",
      receiving_identifier_verified: false,
    }).eq("id", account.id).eq("user_id", userId);
    if (error) throw new Error(error.message);
  },

  async listForAdmin(): Promise<Account[]> {
    const { data, error } = await createSupabaseAdminClient().from("shopkeepers").select(accountFields).order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as Account[];
  },

  async updateForAdmin(id: string, input: z.infer<typeof shopkeeperAdminUpdateSchema>) {
    const { data: account, error: readError } = await createSupabaseAdminClient().from("shopkeepers").select("service_order_id").eq("id", id).maybeSingle();
    if (readError) throw new Error(readError.message);
    if (!account) throw new NotFoundError("Shopkeeper account not found.");
    if (input.status === "active" && !await orderIsPaid(account.service_order_id)) {
      throw new AuthorizationError("An active shopkeeper service must have a paid Store order.");
    }
    const { data, error } = await createSupabaseAdminClient().from("shopkeepers").update({
      business_name: input.businessName,
      jazzcash_number: input.jazzcashNumber,
      jazzcash_account_name: input.jazzcashAccountName,
      receiving_identifier: input.receivingIdentifier || null,
      receiving_identifier_verified: input.receivingIdentifierVerified,
      status: input.status,
    }).eq("id", id).select("id").maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new NotFoundError("Shopkeeper account not found.");
  },

  async grantFromPaidOrder(orderId: string, userId?: string) {
    if (!userId) return;
    const db = createSupabaseAdminClient();
    const { data: items, error: itemError } = await db.from("order_items")
      .select("id,products!inner(slug)")
      .eq("order_id", orderId)
      .eq("products.slug", SHOPKEEPER_QR_PRODUCT_SLUG)
      .limit(1);
    if (itemError) throw new Error(itemError.message);
    if (!items?.length) return;
    const { data: existing, error: readError } = await db.from("shopkeepers").select("id,service_order_id,status").eq("user_id", userId).maybeSingle();
    if (readError) throw new Error(readError.message);
    if (existing?.service_order_id === orderId) return;
    if (existing) {
      const status = existing.status === "suspended" ? "suspended" : existing.status === "active" ? "active" : "pending_setup";
      const { error } = await db.from("shopkeepers").update({ service_order_id: orderId, status }).eq("id", existing.id);
      if (error) throw new Error(error.message);
      return;
    }
    const { error } = await db.from("shopkeepers").insert({ user_id: userId, service_order_id: orderId, status: "pending_setup" });
    if (error) throw new Error(error.message);
  },

  async revokeForOrder(orderId: string) {
    const { error } = await createSupabaseAdminClient().from("shopkeepers").update({ status: "revoked" }).eq("service_order_id", orderId);
    if (error) throw new Error(error.message);
  },
};
