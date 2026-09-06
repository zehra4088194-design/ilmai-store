"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SellerEarningsByCurrency, SellerPayout } from "@/services/SellerPayoutService";

function money(amountMinor: number, currency: string) {
  return `${currency} ${(amountMinor / 100).toFixed(2)}`;
}

export function SellerPayoutPanel({ sellerId, commissionRateBps, summary, payouts }: { sellerId: string; commissionRateBps: number; summary: SellerEarningsByCurrency[]; payouts: SellerPayout[] }) {
  const router = useRouter();
  const [rate, setRate] = useState(String(commissionRateBps / 100));
  const [savingRate, setSavingRate] = useState(false);
  const [rateMessage, setRateMessage] = useState("");

  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(summary[0]?.currency ?? "PKR");
  const [note, setNote] = useState("");
  const [recording, setRecording] = useState(false);
  const [payoutError, setPayoutError] = useState<string | null>(null);

  async function saveRate() {
    setSavingRate(true);
    setRateMessage("");
    try {
      const response = await fetch(`/api/admin/sellers/${sellerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commissionRateBps: Math.round(Number(rate) * 100) }),
      });
      if (!response.ok) { const data = await response.json().catch(() => ({})); throw new Error(data.error ?? "Could not save."); }
      setRateMessage("Saved.");
      router.refresh();
    } catch (err) {
      setRateMessage(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setSavingRate(false);
    }
  }

  async function recordPayout(e: React.FormEvent) {
    e.preventDefault();
    setRecording(true);
    setPayoutError(null);
    try {
      const response = await fetch(`/api/admin/sellers/${sellerId}/payouts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountMinor: Math.round(Number(amount) * 100), currency, note: note || undefined }),
      });
      if (!response.ok) { const data = await response.json().catch(() => ({})); throw new Error(data.error ?? "Payout could not be recorded."); }
      setAmount("");
      setNote("");
      router.refresh();
    } catch (err) {
      setPayoutError(err instanceof Error ? err.message : "Payout could not be recorded.");
    } finally {
      setRecording(false);
    }
  }

  return (
    <div className="mt-8 grid gap-6">
      <section className="rounded-3xl border bg-white p-6">
        <p className="text-sm font-bold text-[#0B1D3A]">Commission rate</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <input type="number" min="0" max="100" step="0.1" value={rate} onChange={(e) => setRate(e.target.value)} className="w-24 rounded-xl border px-3 py-2 text-sm" />
            <span className="text-sm text-[#64748B]">% withheld from every sale</span>
          </div>
          <button type="button" onClick={saveRate} disabled={savingRate} className="rounded-full bg-[#0B1D3A] px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{savingRate ? "Saving…" : "Save"}</button>
          {rateMessage && <span className="text-xs text-[#64748B]">{rateMessage}</span>}
        </div>
      </section>

      <section className="rounded-3xl border bg-white p-6">
        <p className="text-sm font-bold text-[#0B1D3A]">Earnings summary</p>
        {!summary.length && <p className="mt-3 text-sm text-[#64748B]">No paid orders for this seller&apos;s products yet.</p>}
        <div className="mt-3 grid gap-3">
          {summary.map((s) => (
            <div key={s.currency} className="grid grid-cols-2 gap-3 rounded-2xl border bg-[#F1F5F9] p-4 text-sm sm:grid-cols-4">
              <div><p className="text-xs font-bold uppercase tracking-widest text-[#64748B]">Gross ({s.currency})</p><p className="mt-1 font-bold">{money(s.grossMinor, s.currency)}</p></div>
              <div><p className="text-xs font-bold uppercase tracking-widest text-[#64748B]">Payable</p><p className="mt-1 font-bold text-[#0F766E]">{money(s.payableMinor, s.currency)}</p></div>
              <div><p className="text-xs font-bold uppercase tracking-widest text-[#64748B]">Paid out</p><p className="mt-1 font-bold">{money(s.paidOutMinor, s.currency)}</p></div>
              <div><p className="text-xs font-bold uppercase tracking-widest text-[#64748B]">Still owed</p><p className={`mt-1 font-bold ${s.owedMinor > 0 ? "text-amber-600" : "text-[#64748B]"}`}>{money(s.owedMinor, s.currency)}</p></div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border bg-white p-6">
        <p className="text-sm font-bold text-[#0B1D3A]">Record a payout</p>
        <form onSubmit={recordPayout} className="mt-3 grid gap-3 sm:grid-cols-4">
          <input required type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" className="rounded-xl border px-4 py-3 text-sm" />
          <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="rounded-xl border px-4 py-3 text-sm">
            {(summary.length ? summary.map((s) => s.currency) : ["PKR", "USD"]).map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional — e.g. bank ref)" className="rounded-xl border px-4 py-3 text-sm sm:col-span-2" />
          <button type="submit" disabled={recording} className="rounded-full bg-[#0B1D3A] px-5 py-3 text-sm font-bold text-white disabled:opacity-50 sm:col-span-4 sm:w-fit">{recording ? "Recording…" : "Record payout"}</button>
        </form>
        {payoutError && <p className="mt-2 text-sm text-red-700">{payoutError}</p>}
      </section>

      <section className="rounded-3xl border bg-white p-6">
        <p className="text-sm font-bold text-[#0B1D3A]">Payout history</p>
        <div className="mt-3 grid gap-2">
          {payouts.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm">
              <span className="font-bold">{money(p.amountMinor, p.currency)}</span>
              {p.note && <span className="text-[#64748B]">{p.note}</span>}
              <span className="text-xs text-[#64748B]">{new Date(p.createdAt).toLocaleDateString()}</span>
            </div>
          ))}
          {!payouts.length && <p className="text-sm text-[#64748B]">No payouts recorded yet.</p>}
        </div>
      </section>
    </div>
  );
}
