/* eslint-disable @typescript-eslint/no-explicit-any */
import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server-admin";
import { NotFoundError, ValidationError } from "@/lib/errors";
import type { Review } from "@/types/domain";
import type { z } from "zod";
import type { reviewSchema } from "@/validators/commerce";

const map = (r: any): Review => ({ id: r.id, productId: r.product_id, userId: r.user_id, rating: r.rating, title: r.title ?? undefined, body: r.body ?? undefined, isVerifiedPurchase: Boolean(r.order_item_id), moderationStatus: r.moderation_status, createdAt: r.created_at });
export const ReviewService = {
  async adminList(): Promise<Review[]> { const { data, error } = await createSupabaseAdminClient().from("reviews").select("*").order("created_at", { ascending: false }).limit(200); if (error) throw new Error(error.message); return (data ?? []).map(map); },
  async listForProduct(productId: string): Promise<Review[]> { const { data, error } = await (await createSupabaseServerClient()).from("reviews").select("*").eq("product_id", productId).eq("moderation_status", "approved").order("created_at", { ascending: false }); if (error) throw new Error(error.message); return (data ?? []).map(map); },
  async submit(userId: string, input: z.infer<typeof reviewSchema>): Promise<Review> { const db = createSupabaseAdminClient(); const { data: purchase } = await db.from("order_items").select("id,orders!inner(user_id,payment_status)").eq("product_id", input.productId).eq("orders.user_id", userId).eq("orders.payment_status", "paid").limit(1).maybeSingle(); if (!purchase?.id) throw new ValidationError("Only verified buyers can submit a review."); const { data, error } = await db.from("reviews").upsert({ product_id: input.productId, user_id: userId, order_item_id: purchase.id, rating: input.rating, title: input.title, body: input.body, moderation_status: "pending" }, { onConflict: "product_id,user_id" }).select().single(); if (error || !data) throw new ValidationError(error?.message ?? "Review could not be submitted."); return map(data); },
  async adminModerate(reviewId: string, status: "approved" | "rejected"): Promise<Review> { const { data, error } = await createSupabaseAdminClient().from("reviews").update({ moderation_status: status }).eq("id", reviewId).select().single(); if (error || !data) throw new NotFoundError("Review not found."); return map(data); },
};
