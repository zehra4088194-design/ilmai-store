"use client";

import { useState } from "react";
import { Check, Loader2, ShoppingBasket } from "lucide-react";
import type { Cart } from "@/types/domain";
import { broadcastCartUpdate } from "@/components/store/cart-events";

type Props = {
  resourceId: string;
  hasLightVersion: boolean;
  hasDarkVersion: boolean;
  compact?: boolean;
};

type Theme = "light" | "dark";

export function StudyNoteAddToBasket({
  resourceId,
  hasLightVersion,
  hasDarkVersion,
  compact = false,
}: Props) {
  const themes: Theme[] = [];
  if (hasLightVersion) themes.push("light");
  if (hasDarkVersion) themes.push("dark");
  const [theme, setTheme] = useState<Theme>(themes[0] ?? "light");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function add() {
    if (!themes.length || state === "loading") return;
    setState("loading");
    setMessage(null);
    try {
      const materialize = await fetch("/api/study-notes/materialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resourceId, theme }),
      });
      const prepared = (await materialize.json()) as { variantId?: string; priceMinor?: number; currency?: string; error?: string };
      if (!materialize.ok || !prepared.variantId) throw new Error(prepared.error || "Could not prepare this note.");

      const cartResponse = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId: prepared.variantId, quantity: 1 }),
      });
      const cart = (await cartResponse.json()) as Cart | { error?: string };
      if (!cartResponse.ok) throw new Error((cart as { error?: string }).error || "Could not add this note to your basket.");

      broadcastCartUpdate(cart as Cart);
      setState("done");
      setMessage("Added to your basket.");
      window.setTimeout(() => setState("idle"), 1800);
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Could not add this note.");
      window.setTimeout(() => setState("idle"), 2800);
    }
  }

  if (!themes.length) return null;

  return (
    <div className={compact ? "flex items-center gap-2" : "space-y-2"}>
      {themes.length > 1 && (
        <label className="flex items-center gap-2 text-xs font-semibold text-[var(--muted)]">
          <span className="sr-only">Print theme</span>
          <select
            value={theme}
            onChange={(event) => setTheme(event.target.value as Theme)}
            className="min-h-9 rounded-xl border border-[var(--line)] bg-white px-2.5 text-xs font-bold text-[var(--navy)] outline-none"
            disabled={state === "loading"}
          >
            <option value="light">Light theme</option>
            <option value="dark">Dark theme</option>
          </select>
        </label>
      )}
      <button
        type="button"
        onClick={add}
        disabled={state === "loading"}
        className={compact
          ? "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl bg-[#D4AF37] px-3 text-[11px] font-black text-[#0B1D3A] disabled:opacity-60"
          : "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#D4AF37] px-4 text-sm font-black text-[#0B1D3A] disabled:opacity-60"}
      >
        {state === "loading" && <Loader2 size={15} className="animate-spin" />}
        {state === "done" && <Check size={15} />}
        {state === "idle" && <ShoppingBasket size={15} />}
        {state === "done" ? "Added" : state === "loading" ? "Preparing…" : "Add to Basket"}
      </button>
      {message && (
        <p className={state === "error" ? "text-xs font-semibold text-red-600" : "text-xs font-semibold text-emerald-700"}>
          {message}
        </p>
      )}
    </div>
  );
}
