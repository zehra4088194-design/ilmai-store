import "server-only";
import { randomBytes } from "node:crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/server-admin";
import { EmailService } from "./EmailService";
import { logger } from "@/lib/logger";

function generateCode(): string {
  // 6 chars, uppercase alnum, human-typeable — collision retried below.
  return randomBytes(4).toString("hex").toUpperCase().slice(0, 6);
}

export const ReferralService = {
  /** Every signed-in user gets a stable personal code, created lazily on first visit to the "Refer a friend" card. */
  async getOrCreateCode(userId: string): Promise<string> {
    const db = createSupabaseAdminClient();
    const { data: existing } = await db.from("referral_codes").select("code").eq("user_id", userId).maybeSingle();
    if (existing) return existing.code;
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = generateCode();
      const { data, error } = await db.from("referral_codes").insert({ user_id: userId, code }).select("code").maybeSingle();
      if (data) return data.code;
      if (error?.code === "23505") {
        // Unique violation — either this user's row (primary key on
        // user_id) was just created by a concurrent request, in which
        // case it now exists and we should return it, or the random code
        // itself collided, in which case retrying with a fresh one is the
        // fix. Re-check for the user's row first so a concurrent race
        // doesn't loop uselessly against a PK conflict a new code can
        // never resolve.
        const { data: raced } = await db.from("referral_codes").select("code").eq("user_id", userId).maybeSingle();
        if (raced) return raced.code;
        continue;
      }
      throw new Error(error?.message ?? "Referral code could not be created.");
    }
    throw new Error("Referral code could not be created.");
  },

  async countConversions(userId: string): Promise<number> {
    const { count, error } = await createSupabaseAdminClient().from("referral_conversions").select("id", { count: "exact", head: true }).eq("referrer_user_id", userId);
    if (error) throw new Error(error.message);
    return count ?? 0;
  },

  /**
   * Called once per order from OrderCompletionService.completePaidOrder,
   * after the order is confirmed paid. Rewards the referrer with a 10%,
   * single-use coupon the first (and only the first) time the person they
   * referred completes a paid order. Deliberately non-fatal — a referral
   * hiccup must never fail the payment flow it's called from.
   */
  async rewardReferrerIfEligible(orderId: string, referredUserId: string): Promise<void> {
    try {
      const db = createSupabaseAdminClient();
      const { data: profile } = await db.from("profiles").select("referred_by_code").eq("id", referredUserId).maybeSingle();
      const code = profile?.referred_by_code;
      if (!code) return;

      const { data: owner } = await db.from("referral_codes").select("user_id").eq("code", code).maybeSingle();
      if (!owner || owner.user_id === referredUserId) return; // no self-referral reward

      const { data: existingConversion } = await db.from("referral_conversions").select("id").eq("referred_user_id", referredUserId).maybeSingle();
      if (existingConversion) return; // only the referred user's first paid order counts

      const couponCode = `REF-${generateCode()}`;
      const { error: couponError } = await db.from("coupons").insert({
        code: couponCode,
        discount_type: "percentage",
        discount_value: 10,
        max_redemptions: 1,
        min_order_minor: 0,
        is_active: true,
      });
      if (couponError) { logger.error("referral.reward_coupon_failed", { error: couponError.message }); return; }

      const { error: conversionError } = await db.from("referral_conversions").insert({ referrer_user_id: owner.user_id, referred_user_id: referredUserId, order_id: orderId, reward_coupon_code: couponCode });
      if (conversionError) { logger.error("referral.conversion_record_failed", { error: conversionError.message }); return; }

      const { data: authUser } = await db.auth.admin.getUserById(owner.user_id);
      if (authUser?.user?.email) await EmailService.sendReferralReward(authUser.user.email, { couponCode });
    } catch (err) {
      logger.error("referral.reward_failed", { error: String(err) });
    }
  },
};
