"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";

export function DownloadButton({ orderId, entitlementId }: { orderId: string; entitlementId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/payments/${orderId}/download/${entitlementId}`);
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error || "Download link could not be created.");
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleClick}
        disabled={loading}
        className="flex items-center gap-2 rounded-full bg-[#0B1D3A] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#2563EB] disabled:opacity-60"
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
        Download
      </button>
      {error && <p className="max-w-[14rem] text-right text-xs font-medium text-[#a13d3d]">{error}</p>}
    </div>
  );
}
