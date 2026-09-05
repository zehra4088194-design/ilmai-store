"use client";

import { useState } from "react";
import { Bell, Check } from "lucide-react";

export function NotifyMeButton({ variantId, defaultEmail }: { variantId: string; defaultEmail?: string }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(defaultEmail ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/stock-notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId, email }),
      });
      if (!response.ok) throw new Error("Could not save your notification request.");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your notification request.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-[#0F766E]"><Check size={13} /> We&apos;ll email you when it&apos;s back.</p>;
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-[#0F766E] underline">
        <Bell size={13} /> Notify me when back in stock
      </button>
    );
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="w-52 rounded-lg border px-3 py-2 text-xs outline-none focus:border-[#0F766E]" />
      <button type="button" disabled={submitting || !email} onClick={submit} className="rounded-lg bg-[#0B1D3A] px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
        {submitting ? "Saving…" : "Notify me"}
      </button>
      {error && <p className="w-full text-xs text-red-700">{error}</p>}
    </div>
  );
}
