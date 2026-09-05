import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/server-admin";
import { EmailService } from "./EmailService";
import { logger } from "@/lib/logger";

export const StockNotificationService = {
  /** "Notify me when back in stock" signup for one out-of-stock variant. */
  async subscribe(variantId: string, email: string, userId?: string): Promise<void> {
    const { error } = await createSupabaseAdminClient()
      .from("stock_notifications")
      .upsert({ variant_id: variantId, email: email.toLowerCase().trim(), user_id: userId ?? null, notified_at: null }, { onConflict: "variant_id,email" });
    if (error) throw new Error(error.message);
  },

  /**
   * Called after a stock quantity is raised above 0 (see
   * InventoryService.adminUpdate). Emails everyone still waiting on that
   * variant and marks them notified so the same restock never re-emails
   * them. Non-fatal by design — a notification hiccup must never block the
   * stock update itself.
   */
  async notifyIfRestocked(variantId: string, newQuantity: number): Promise<void> {
    if (newQuantity <= 0) return;
    try {
      const db = createSupabaseAdminClient();
      const { data: pending, error } = await db.from("stock_notifications").select("id,email").eq("variant_id", variantId).is("notified_at", null);
      if (error || !pending?.length) return;
      const { data: variant } = await db.from("product_variants").select("product:products(title, slug)").eq("id", variantId).maybeSingle();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const product = (variant as any)?.product;
      if (!product) return;
      const url = `${process.env.NEXT_PUBLIC_STORE_URL ?? "https://ilmai.store"}/store/${product.slug}`;
      for (const row of pending) {
        await EmailService.sendBackInStock(row.email, { productTitle: product.title, productUrl: url });
        await db.from("stock_notifications").update({ notified_at: new Date().toISOString() }).eq("id", row.id);
      }
    } catch (err) {
      logger.error("stock_notification.restock_failed", { variantId, error: String(err) });
    }
  },
};
