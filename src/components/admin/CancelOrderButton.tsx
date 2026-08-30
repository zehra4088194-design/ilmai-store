"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, XCircle } from "lucide-react";

export function CancelOrderButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cancelOrder() {
    if (!confirm("Cancel this order? This cannot be undone.")) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/cancel`, { method: "POST" });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Could not cancel this order.");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not cancel this order.");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={cancelOrder}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-white px-4 py-2 text-xs font-bold text-red-700 disabled:opacity-50"
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
        Cancel order
      </button>
      {error && <p className="max-w-48 text-right text-xs text-red-700">{error}</p>}
    </div>
  );
}
