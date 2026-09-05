import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/server-admin";
import { EmailService } from "./EmailService";
import { siteConfig } from "@/config/site";
import { logger } from "@/lib/logger";

type Raw = Record<string, unknown>;

export const AbandonedCartService = {
  /**
   * Emails a one-time reminder for any signed-in user's cart that's had
   * items sitting untouched for 2+ hours (and isn't ancient — no point
   * nudging a cart from a month ago). Guest carts are skipped: without a
   * checkout attempt there's no email on file to reach them at. Called by
   * the cron below, at most once per cart (abandoned_email_sent_at marks
   * it), so re-running the cron never double-sends.
   */
  async sendReminders(): Promise<{ sent: number; checked: number }> {
    const db = createSupabaseAdminClient();
    const cutoffRecent = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const cutoffOld = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: carts, error } = await db
      .from("carts")
      .select("id, user_id, cart_items(id)")
      .eq("status", "active")
      .is("abandoned_email_sent_at", null)
      .not("user_id", "is", null)
      .lt("updated_at", cutoffRecent)
      .gt("updated_at", cutoffOld)
      .limit(200);
    if (error) throw new Error(error.message);

    let sent = 0;
    for (const cart of (carts ?? []) as Raw[]) {
      const itemCount = ((cart.cart_items as unknown[]) ?? []).length;
      if (!itemCount) continue;
      try {
        const { data: authUser } = await db.auth.admin.getUserById(cart.user_id as string);
        const email = authUser?.user?.email;
        if (!email) continue;
        await EmailService.sendAbandonedCart(email, { itemCount, cartUrl: `${siteConfig.url}/cart` });
        sent += 1;
      } catch (err) {
        logger.error("abandoned_cart.send_failed", { cartId: String(cart.id), error: String(err) });
      } finally {
        // Mark attempted either way — a permanently-broken lookup (e.g. a
        // deleted auth user) shouldn't be retried forever.
        await db.from("carts").update({ abandoned_email_sent_at: new Date().toISOString() }).eq("id", cart.id as string);
      }
    }
    return { sent, checked: (carts ?? []).length };
  },
};
