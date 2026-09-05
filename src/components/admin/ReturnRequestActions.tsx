"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export function ReturnRequestActions({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(status: "approved" | "rejected" | "refunded") {
    if (status === "refunded" && !confirm("Mark this order refunded? This restores its stock and emails the customer a refund confirmation.")) return;
    setLoading(status);
    setError(null);
    try {
      const response = await fetch(`/api/admin/returns/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Could not update this request.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update this request.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <button type="button" onClick={() => act("approved")} disabled={!!loading} className="rounded-full border px-3 py-1.5 text-xs font-bold disabled:opacity-50">
          {loading === "approved" ? <Loader2 size={12} className="animate-spin" /> : "Approve"}
        </button>
        <button type="button" onClick={() => act("rejected")} disabled={!!loading} className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-bold text-red-700 disabled:opacity-50">
          {loading === "rejected" ? <Loader2 size={12} className="animate-spin" /> : "Reject"}
        </button>
        <button type="button" onClick={() => act("refunded")} disabled={!!loading} className="rounded-full bg-[#0B1D3A] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">
          {loading === "refunded" ? <Loader2 size={12} className="animate-spin" /> : "Mark refunded"}
        </button>
      </div>
      {error && <p className="max-w-48 text-right text-xs text-red-700">{error}</p>}
    </div>
  );
}
