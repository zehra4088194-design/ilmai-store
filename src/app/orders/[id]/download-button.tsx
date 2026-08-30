"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";

type Props = {
  orderId: string;
  entitlementId: string;
};

export function DownloadButton({ orderId, entitlementId }: Props) {
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");

  async function onClick() {
    if (state === "loading") return;
    setState("loading");
    try {
      const res = await fetch(`/api/payments/${orderId}/download/${entitlementId}`);
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Could not get download link.");
      window.open(data.url, "_blank", "noopener,noreferrer");
      setState("idle");
    } catch {
      setState("error");
      window.setTimeout(() => setState("idle"), 2200);
    }
  }

  return (
    <button
      onClick={onClick}
      disabled={state === "loading"}
      className="inline-flex items-center gap-2 rounded-full bg-[#103d42] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#14777a] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {state === "loading" && <><Loader2 size={14} className="animate-spin" /> Preparing…</>}
      {state === "error" && "Try again"}
      {state === "idle" && <><Download size={14} /> Download</>}
    </button>
  );
}
