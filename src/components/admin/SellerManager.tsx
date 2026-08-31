"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Power, Trash2 } from "lucide-react";
import type { SellerAccount } from "@/services/SellerService";

export function SellerManager({ sellers }: { sellers: SellerAccount[] }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/sellers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), businessName: businessName.trim() || undefined }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Seller could not be added.");
      setEmail("");
      setBusinessName("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Seller could not be added.");
    } finally {
      setCreating(false);
    }
  }

  async function toggleStatus(seller: SellerAccount) {
    setBusyId(seller.id);
    try {
      const res = await fetch(`/api/admin/sellers/${seller.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: seller.status === "active" ? "suspended" : "active" }),
      });
      if (res.ok) router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function remove(seller: SellerAccount) {
    if (!confirm(`Remove ${seller.email ?? "this seller"} as a seller? Their products stay on the store, just no longer editable by them.`)) return;
    setBusyId(seller.id);
    try {
      const res = await fetch(`/api/admin/sellers/${seller.id}`, { method: "DELETE" });
      if (res.ok) router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mt-8 grid gap-8">
      <form onSubmit={handleAdd} className="rounded-3xl border bg-white p-6 shadow-sm lg:p-8">
        <p className="text-xs font-bold uppercase tracking-[.2em] text-[#14777a]">Add a seller</p>
        <p className="mt-1 text-sm text-[#668084]">They must have already signed up on the store with this email — this doesn&apos;t create a new account, only grants seller access to an existing one.</p>
        <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr_auto]">
          <input required type="email" placeholder="seller@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-xl border px-4 py-3 text-sm" />
          <input placeholder="Business name (optional)" value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="rounded-xl border px-4 py-3 text-sm" />
          <button type="submit" disabled={creating} className="rounded-full bg-[#103d42] px-6 py-3 text-sm font-bold text-white disabled:opacity-50">
            {creating ? "Adding…" : "+ Add seller"}
          </button>
        </div>
        {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
      </form>

      <div className="overflow-hidden rounded-3xl border bg-white">
        <div className="grid grid-cols-[1.4fr_1fr_.7fr_.7fr_100px] gap-4 border-b px-5 py-4 text-xs font-bold uppercase tracking-widest text-[#668084]">
          <span>Email</span><span>Business</span><span>Products</span><span>Status</span><span />
        </div>
        {sellers.map((seller) => (
          <div key={seller.id} className="grid grid-cols-[1.4fr_1fr_.7fr_.7fr_100px] items-center gap-4 border-b px-5 py-4 text-sm hover:bg-[#f5f7f3]">
            <span className="font-bold">{seller.email ?? "—"}</span>
            <span className="text-[#668084]">{seller.businessName ?? "—"}</span>
            <span>{seller.productCount}</span>
            <span className={seller.status === "active" ? "font-bold text-[#14777a]" : "text-[#668084]"}>{seller.status}</span>
            <div className="flex items-center gap-3">
              <button onClick={() => toggleStatus(seller)} disabled={busyId === seller.id} title={seller.status === "active" ? "Suspend" : "Reactivate"} className={seller.status === "active" ? "text-[#14777a] hover:text-[#103d42]" : "text-[#668084] hover:text-[#14777a]"}>
                {busyId === seller.id ? <Loader2 size={16} className="animate-spin" /> : <Power size={16} />}
              </button>
              <button onClick={() => remove(seller)} disabled={busyId === seller.id} title="Remove" className="text-[#668084] hover:text-red-600">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
        {!sellers.length && <p className="p-10 text-center text-[#668084]">No sellers yet.</p>}
      </div>
    </div>
  );
}
