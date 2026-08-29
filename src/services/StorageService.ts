import "server-only";
import { B2Provider } from "./storage/B2Provider";
import type { StorageProvider } from "./storage/StorageProvider";
import { SIGNED_DOWNLOAD_URL_TTL_MINUTES } from "@/constants/upload";
import { AuthorizationError, NotFoundError } from "@/lib/errors";
import { createSupabaseAdminClient } from "@/lib/supabase/server-admin";
import { OrderAccessService } from "./OrderAccessService";
import { randomUUID } from "node:crypto";

const provider: StorageProvider = new B2Provider();

export const StorageService = {
  async uploadProductMedia(key: string, body: Buffer, contentType: string) {
    return provider.upload({ key, body, contentType, isPublic: true });
  },

  async uploadDigitalFile(key: string, body: Buffer, contentType: string) {
    return provider.upload({ key, body, contentType, isPublic: false });
  },

  async uploadPaymentProof(orderId: string, fileName: string, body: Buffer, contentType: string) {
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-120) || "proof";
    return provider.upload({ key: `payment-proofs/${orderId}/${randomUUID()}-${safeName}`, body, contentType, isPublic: false });
  },

  async delete(key: string) {
    return provider.delete(key);
  },

  async getPrivateFileUrl(storageKey: string) {
    return provider.getSignedUrl(storageKey, 10 * 60);
  },

  getProductMediaUrl(key: string): string {
    return provider.getPublicUrl(key);
  },

  /**
   * The only way a digital file's contents are ever reachable. Re-checks
   * that `userId` owns a `digital_entitlements` row for `entitlementId`
   * before minting a short-lived signed URL. See SECURITY.md §4.
   */
  async getDownloadUrl(viewer: { userId?: string; orderId: string }, entitlementId: string): Promise<string> {
    const db = createSupabaseAdminClient();
    const { data, error } = await db.from("digital_entitlements").select("id,user_id,order_id,storage_key,download_count,max_downloads,expires_at").eq("id", entitlementId).eq("order_id", viewer.orderId).maybeSingle();
    if (error || !data) throw new NotFoundError("Download not found.");
    if (viewer.userId) {
      if (data.user_id !== viewer.userId) throw new AuthorizationError("You do not have access to this download.");
    } else if (!await OrderAccessService.verify(viewer.orderId, await OrderAccessService.getTokenFromCookie(viewer.orderId))) {
      throw new AuthorizationError("You do not have access to this download.");
    }
    if ((data.max_downloads !== null && data.download_count >= data.max_downloads) || (data.expires_at && new Date(data.expires_at) <= new Date())) throw new AuthorizationError("This download is no longer available.");
    const { error: updateError } = await db.from("digital_entitlements").update({ download_count: data.download_count + 1 }).eq("id", entitlementId).eq("download_count", data.download_count);
    if (updateError) throw new Error(updateError.message);
    return provider.getSignedUrl(data.storage_key, SIGNED_DOWNLOAD_URL_TTL_MINUTES * 60);
  },
};
