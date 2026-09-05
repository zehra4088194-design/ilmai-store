/* eslint-disable @typescript-eslint/no-explicit-any */
import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/server-admin";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { OrderCompletionService } from "./OrderCompletionService";

export interface ReturnRequest {
  id: string;
  orderId: string;
  orderNumber: string;
  customerEmail: string;
  reason: string;
  status: "requested" | "approved" | "rejected" | "refunded";
  adminNote?: string;
  createdAt: string;
}

const mapRow = (r: any): ReturnRequest => ({ id: r.id, orderId: r.order_id, orderNumber: r.order?.order_number ?? "", customerEmail: r.order?.customer_email ?? "", reason: r.reason, status: r.status, adminNote: r.admin_note ?? undefined, createdAt: r.created_at });

export const ReturnRequestService = {
  /** Customer self-serve: request a return/refund on a paid order they own. One open request per order. */
  async submit(userId: string, orderId: string, reason: string): Promise<void> {
    const db = createSupabaseAdminClient();
    const { data: order, error: orderError } = await db.from("orders").select("id,user_id,payment_status").eq("id", orderId).maybeSingle();
    if (orderError) throw new Error(orderError.message);
    if (!order || order.user_id !== userId) throw new NotFoundError("Order not found.");
    if (order.payment_status !== "paid") throw new ValidationError("Only paid orders can request a return.");
    const { error } = await db.from("order_return_requests").insert({ order_id: orderId, user_id: userId, reason });
    if (error) {
      if (error.code === "23505") throw new ConflictError("A return request has already been submitted for this order.");
      throw new Error(error.message);
    }
  },

  /** The order detail page's own return-request state, if any was ever submitted. */
  async getForOrder(orderId: string): Promise<ReturnRequest | null> {
    const { data, error } = await createSupabaseAdminClient().from("order_return_requests").select("*, order:orders(order_number, customer_email)").eq("order_id", orderId).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapRow(data) : null;
  },

  async adminList(): Promise<ReturnRequest[]> {
    const { data, error } = await createSupabaseAdminClient().from("order_return_requests").select("*, order:orders(order_number, customer_email)").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapRow);
  },

  /** Admin decision on a request. 'refunded' also drives the order through OrderCompletionService.markRefunded (payment_status -> refunded, inventory restored). */
  async adminUpdateStatus(id: string, status: "approved" | "rejected" | "refunded", adminNote?: string): Promise<void> {
    const db = createSupabaseAdminClient();
    const { data: row, error: readError } = await db.from("order_return_requests").select("order_id").eq("id", id).maybeSingle();
    if (readError) throw new Error(readError.message);
    if (!row) throw new NotFoundError("Return request not found.");
    const { error } = await db.from("order_return_requests").update({ status, admin_note: adminNote ?? null, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) throw new Error(error.message);
    if (status === "refunded") await OrderCompletionService.markRefunded(row.order_id);
  },
};
