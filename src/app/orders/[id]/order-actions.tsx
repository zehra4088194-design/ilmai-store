"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  orderId: string;
  canCancel: boolean;
  canRequestReturn: boolean;
  returnRequestStatus?: "requested" | "approved" | "rejected" | "refunded";
};

const RETURN_STATUS_LABEL: Record<string, string> = {
  requested: "Your return request is being reviewed.",
  approved: "Your return request was approved.",
  rejected: "Your return request was not approved.",
  refunded: "This order has been refunded.",
};

/** Self-serve order actions: cancel an unpaid order, or request a return/refund on a paid one. */
export function OrderActions({ orderId, canCancel, canRequestReturn, returnRequestStatus }: Props) {
  const router = useRouter();
  const [cancelling, setCancelling] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function cancelOrder() {
    if (!confirm("Cancel this order?")) return;
    setCancelling(true);
    setError(null);
    try {
      const response = await fetch(`/api/orders/${orderId}/cancel`, { method: "POST" });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Order could not be cancelled.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Order could not be cancelled.");
    } finally {
      setCancelling(false);
    }
  }

  async function submitReturnRequest() {
    setRequesting(true);
    setError(null);
    try {
      const response = await fetch(`/api/orders/${orderId}/return-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Request could not be submitted.");
      setSubmitted(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request could not be submitted.");
    } finally {
      setRequesting(false);
    }
  }

  if (returnRequestStatus) {
    return <p className="rounded-2xl border bg-white p-5 text-sm font-semibold text-[#0B1D3A]">{RETURN_STATUS_LABEL[returnRequestStatus]}</p>;
  }

  if (!canCancel && !canRequestReturn) return null;

  return (
    <div className="rounded-2xl border bg-white p-5">
      {canCancel && (
        <button type="button" onClick={cancelOrder} disabled={cancelling} className="w-full rounded-full border border-red-200 px-4 py-2.5 text-sm font-bold text-red-700 disabled:opacity-50">
          {cancelling ? "Cancelling…" : "Cancel order"}
        </button>
      )}
      {canRequestReturn && !submitted && !showReturnForm && (
        <button type="button" onClick={() => setShowReturnForm(true)} className="w-full rounded-full border px-4 py-2.5 text-sm font-bold text-[#0B1D3A]">
          Request a return / refund
        </button>
      )}
      {canRequestReturn && showReturnForm && !submitted && (
        <div className="grid gap-3">
          <textarea required value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Tell us what's wrong with this order…" className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-[#0F766E]" />
          <button type="button" disabled={requesting || reason.trim().length < 5} onClick={submitReturnRequest} className="rounded-full bg-[#0B1D3A] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">
            {requesting ? "Submitting…" : "Submit request"}
          </button>
        </div>
      )}
      {submitted && <p className="text-sm font-semibold text-[#0F766E]">Request submitted — we&apos;ll review it shortly.</p>}
      {error && <p className="mt-3 text-sm font-semibold text-red-700">{error}</p>}
    </div>
  );
}
