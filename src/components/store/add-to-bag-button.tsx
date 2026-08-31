"use client";

import { useState } from "react";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import type { Cart } from "@/types/domain";
import { broadcastCartUpdate } from "./cart-events";

type Props = {
  variantId?: string;
  quantity?: number;
  className?: string;
  label?: string;
};

/** POSTs to /api/cart and broadcasts the fresh cart so the header badge
 * (and anything else listening) updates without a full reload. */
export function AddToBagButton({ variantId, quantity = 1, className, label = "Add to bag" }: Props) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function addToBag(event: React.MouseEvent) {
    event.preventDefault();
    if (!variantId || state === "loading") return;
    setState("loading");
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId, quantity }),
      });
      const data = (await res.json()) as Cart | { error?: string };
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Could not add to bag.");
      broadcastCartUpdate(data as Cart);
      setState("done");
      window.setTimeout(() => setState("idle"), 1600);
    } catch {
      setState("error");
      window.setTimeout(() => setState("idle"), 1800);
    }
  }

  return (
    <button
      onClick={addToBag}
      disabled={!variantId || state === "loading"}
      className={className ?? "mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#F1F5F9] py-3 text-sm font-bold text-[#0B1D3A] transition group-hover:bg-[#2563EB] disabled:cursor-not-allowed disabled:opacity-60"}
    >
      {state === "loading" && <><Loader2 size={15} className="animate-spin" /> Adding…</>}
      {state === "done" && <><Check size={15} /> Added</>}
      {state === "error" && "Couldn't add — try again"}
      {state === "idle" && <>{label} <ArrowRight size={15} /></>}
    </button>
  );
}
