"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";

export function MarkPaidButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function markPaid() {
    if (!confirm("Confirm the JazzCash transfer was received and verified? This activates the order.")) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/mark-paid`, { method: "POST" });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "Could not mark this order paid.");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not mark this order paid.");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={markPaid}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-full bg-[#0B1D3A] px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
        Mark JazzCash paid
      </button>
      {error && <p className="max-w-48 text-right text-xs text-red-700">{error}</p>}
    </div>
  );
}
