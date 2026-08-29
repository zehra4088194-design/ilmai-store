"use client";

import { useState } from "react";
import { Loader2, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";

export function RejectPaymentButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  async function reject() {
    const note = window.prompt("Why is this JazzCash payment being rejected?");
    if (note === null) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/manual-payment/reject`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reviewerNote: note }) });
      if (!response.ok) throw new Error("Payment claim could not be rejected.");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }
  return <button type="button" onClick={reject} disabled={loading} className="inline-flex items-center gap-2 rounded-full border border-red-200 px-3 py-2 text-xs font-bold text-red-700 disabled:opacity-50">{loading ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={13} />} Reject</button>;
}
