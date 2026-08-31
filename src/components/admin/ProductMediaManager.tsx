"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, Star, Trash2, Upload } from "lucide-react";
import type { ProductMedia } from "@/types/domain";

export function ProductMediaManager({ productId, media, role = "admin" }: { productId: string; media: ProductMedia[]; role?: "admin" | "seller" }) {
  const router = useRouter();
  const apiBase = role === "seller" ? "/api/seller/products" : "/api/admin/products";
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  async function uploadFiles(files: FileList | File[]) {
    setError(null);
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.set("file", file);
        form.set("mediaType", "image");
        form.set("isPrimary", String(media.length === 0));
        const response = await fetch(`${apiBase}/${productId}/media`, { method: "POST", body: form });
        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? "Image could not be uploaded.");
        }
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image could not be uploaded.");
    } finally {
      setUploading(false);
    }
  }

  async function deleteMedia(mediaId: string) {
    if (!confirm("Remove this image?")) return;
    setDeletingId(mediaId);
    try {
      const response = await fetch(`${apiBase}/${productId}/media/${mediaId}`, { method: "DELETE" });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Image could not be removed.");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image could not be removed.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="mt-6 rounded-3xl border bg-white p-6 sm:p-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-[.2em] text-[#2563EB]">Product photos</p>
        <h2 className="display-font mt-1 text-2xl text-[#0B1D3A]">Make it look good.</h2>
        <p className="mt-1 text-sm text-[#64748B]">The first photo (or the one marked ★) is used as the cover everywhere on the store. JPG, PNG, WebP or AVIF, up to 8MB each.</p>
      </div>

      {media.length > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {media.map((item) => (
            <div key={item.id} className="group relative aspect-square overflow-hidden rounded-2xl border bg-[#F1F5F9]">
              <img src={item.url} alt={item.altText ?? "Product photo"} className="h-full w-full object-cover" />
              {item.isPrimary && (
                <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-[#2563EB] px-2 py-1 text-[10px] font-black text-[#0B1D3A]">
                  <Star size={10} fill="currentColor" /> Cover
                </span>
              )}
              <button
                type="button"
                onClick={() => deleteMedia(item.id)}
                disabled={deletingId === item.id}
                className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-white/90 text-red-700 opacity-0 transition group-hover:opacity-100 disabled:opacity-100"
                aria-label="Remove image"
              >
                {deletingId === item.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              </button>
            </div>
          ))}
        </div>
      )}

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length) void uploadFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`mt-5 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition ${dragOver ? "border-[#2563EB] bg-[#eef7f5]" : "border-[#E2E8F0] bg-[#fafbf8] hover:bg-[#F1F5F9]"}`}
      >
        {uploading ? (
          <><Loader2 size={22} className="animate-spin text-[#2563EB]" /><p className="text-sm font-bold text-[#0B1D3A]">Uploading…</p></>
        ) : (
          <>
            <div className="grid h-11 w-11 place-items-center rounded-full bg-[#F1F5F9] text-[#2563EB]">
              {media.length ? <ImagePlus size={20} /> : <Upload size={20} />}
            </div>
            <p className="text-sm font-bold text-[#0B1D3A]">Click to upload, or drag photos here</p>
            <p className="text-xs text-[#64748B]">You can add more than one at a time.</p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          multiple
          className="hidden"
          onChange={(e) => { if (e.target.files?.length) void uploadFiles(e.target.files); e.target.value = ""; }}
        />
      </div>
      {error && <p className="mt-3 text-sm font-semibold text-red-700">{error}</p>}
    </div>
  );
}
