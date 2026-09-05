"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Power, Trash2 } from "lucide-react";

type Kind = "promotions" | "coupons" | "banners";

export function PromotionRowActions({ kind, id, isActive }: { kind: Kind; id: string; isActive: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"toggle" | "delete" | null>(null);

  async function toggle() {
    setBusy("toggle");
    try {
      const response = await fetch(`/api/admin/${kind}/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      if (response.ok) router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!confirm("Delete this? This cannot be undone.")) return;
    setBusy("delete");
    try {
      const response = await fetch(`/api/admin/${kind}/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (response.ok) router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={toggle}
        disabled={busy !== null}
        title={isActive ? "Deactivate" : "Activate"}
        className={`grid h-10 w-10 place-items-center rounded-lg hover:bg-[#F1F5F9] ${isActive ? "text-[#0F766E] hover:text-[#0B1D3A]" : "text-[#64748B] hover:text-[#0F766E]"}`}
      >
        {busy === "toggle" ? <Loader2 size={18} className="animate-spin" /> : <Power size={18} />}
      </button>
      <button type="button" onClick={remove} disabled={busy !== null} title="Delete" className="ml-2 grid h-10 w-10 place-items-center rounded-lg text-[#64748B] hover:bg-red-50 hover:text-red-600">
        {busy === "delete" ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
      </button>
    </div>
  );
}
