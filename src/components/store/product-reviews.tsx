"use client";

import { useState } from "react";
import { Loader2, ShieldCheck, Star } from "lucide-react";
import type { Review } from "@/types/domain";

function Stars({ rating, onChange }: { rating: number; onChange?: (n: number) => void }) {
  return <div className="flex gap-1">
    {[1, 2, 3, 4, 5].map((n) => (
      <button
        key={n}
        type="button"
        disabled={!onChange}
        onClick={() => onChange?.(n)}
        className={onChange ? "cursor-pointer" : "cursor-default"}
        aria-label={`${n} star`}
      >
        <Star size={onChange ? 22 : 15} className={n <= rating ? "fill-[#f4bf43] text-[#f4bf43]" : "text-[#d7e3e0]"} />
      </button>
    ))}
  </div>;
}

export function ProductReviews({ productId, reviews }: { productId: string; reviews: Review[] }) {
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError(null);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, rating, title: title || undefined, body: body || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Review could not be submitted.");
      setStatus("done");
      setTitle("");
      setBody("");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Review could not be submitted.");
    }
  }

  return <div>
    <div className="flex items-center gap-6 border-b border-[var(--line)]">
      <span className="tab-btn active">Description</span>
      <span className="tab-btn">Reviews ({reviews.length})</span>
      <span className="tab-btn">More Information</span>
    </div>

    <h2 className="mt-8 text-2xl font-black tracking-[-.02em] text-[#112d33]">Customer Reviews</h2>

    <div className="mt-6 grid gap-4">
      {reviews.length === 0 && <p className="text-sm text-[#6b7f82]">No reviews yet — be the first to share your thoughts.</p>}
      {reviews.map((r) => <div key={r.id} className="rounded-2xl border border-[var(--line)] bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <Stars rating={r.rating} />
          {r.isVerifiedPurchase && <span className="inline-flex items-center gap-1 rounded-full bg-[#e9f1e8] px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[#1a7775]"><ShieldCheck size={12} /> Verified purchase</span>}
        </div>
        {r.title && <p className="mt-3 font-bold text-[#112d33]">{r.title}</p>}
        {r.body && <p className="mt-1 text-sm leading-6 text-[#5e7477]">{r.body}</p>}
      </div>)}
    </div>

    <form onSubmit={submit} className="mt-8 max-w-xl rounded-2xl border border-[var(--line)] bg-white p-6">
      <p className="text-sm font-bold text-[#112d33]">Leave a review</p>
      <div className="mt-3"><Stars rating={rating} onChange={setRating} /></div>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (optional)" className="store-input mt-4 w-full" />
      <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Share what you think (optional)" rows={3} className="store-input mt-3 h-auto w-full py-2.5" />
      <button type="submit" disabled={status === "loading"} className="gold-btn mt-4 h-11 px-6">
        {status === "loading" && <Loader2 size={15} className="animate-spin" />} Submit review
      </button>
      {status === "done" && <p className="mt-3 text-sm font-semibold text-[#1a7775]">Thanks — your review is awaiting moderation.</p>}
      {status === "error" && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
    </form>
  </div>;
}
