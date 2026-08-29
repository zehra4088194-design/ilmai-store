import "server-only";
import { randomUUID } from "node:crypto";
import { StorageService } from "./StorageService";
import { createSupabaseAdminClient } from "@/lib/supabase/server-admin";

export const ProductMediaService = {
  async adminUpload(productId: string, input: { name: string; type: string; bytes: Buffer; mediaType: "image" | "digital_file"; altText?: string; isPrimary?: boolean }) {
    const safeName = input.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-120) || "file";
    const key = `products/${productId}/${randomUUID()}-${safeName}`;
    const uploaded = input.mediaType === "digital_file" ? await StorageService.uploadDigitalFile(key, input.bytes, input.type) : await StorageService.uploadProductMedia(key, input.bytes, input.type);
    const { data, error } = await createSupabaseAdminClient().from("product_media").insert({ product_id: productId, storage_key: uploaded.key, media_type: input.mediaType, alt_text: input.altText ?? null, is_primary: input.isPrimary ?? false }).select().single();
    if (error || !data) throw new Error(error?.message ?? "Media could not be saved.");
    return { id: data.id, storageKey: data.storage_key, mediaType: data.media_type };
  },
  async adminDelete(productId: string, mediaId: string) {
    const db = createSupabaseAdminClient();
    const { data } = await db.from("product_media").select("storage_key").eq("id", mediaId).eq("product_id", productId).maybeSingle();
    if (!data) return false;
    await StorageService.delete(data.storage_key);
    const { error } = await db.from("product_media").delete().eq("id", mediaId).eq("product_id", productId);
    if (error) throw new Error(error.message);
    return true;
  },
};
