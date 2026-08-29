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
        <Star size={onChange ? 22 : 15} className={n <= rating ? "fill-[#f5bc50] text-[#f5bc50]" : "text-[#d7e3e0]"} />
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

  return <div className="mt-20">
    <h2 className="display-font text-3xl text-[#103d42]">Reviews</h2>

    <div className="mt-6 grid gap-4">
      {reviews.length === 0 && <p className="text-sm text-[#6b7f82]">No reviews yet — be the first to share your thoughts.</p>}
      {reviews.map((r) => <div key={r.id} className="rounded-[1.5rem] border bg-white/70 p-5">
        <div className="flex items-center justify-between gap-3">
          <Stars rating={r.rating} />
          {r.isVerifiedPurchase && <span className="inline-flex items-center gap-1 rounded-full bg-[#e9f1e8] px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[#14777a]"><ShieldCheck size={12} /> Verified purchase</span>}
        </div>
        {r.title && <p className="mt-3 font-bold text-[#103d42]">{r.title}</p>}
        {r.body && <p className="mt-1 text-sm leading-6 text-[#5e7477]">{r.body}</p>}
      </div>)}
    </div>

    <form onSubmit={submit} className="mt-10 max-w-xl rounded-[1.75rem] border bg-white/70 p-6">
      <p className="text-sm font-bold text-[#103d42]">Leave a review</p>
      <div className="mt-3"><Stars rating={rating} onChange={setRating} /></div>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (optional)" className="mt-4 w-full rounded-xl border bg-white px-4 py-2.5 text-sm outline-none placeholder:text-[#789094]" />
      <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Share what you think (optional)" rows={3} className="mt-3 w-full rounded-xl border bg-white px-4 py-2.5 text-sm outline-none placeholder:text-[#789094]" />
      <button type="submit" disabled={status === "loading"} className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#103d42] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#14777a] disabled:cursor-not-allowed disabled:opacity-60">
        {status === "loading" && <Loader2 size={15} className="animate-spin" />} Submit review
      </button>
      {status === "done" && <p className="mt-3 text-sm font-semibold text-[#14777a]">Thanks — your review is awaiting moderation.</p>}
      {status === "error" && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
    </form>
  </div>;
}
