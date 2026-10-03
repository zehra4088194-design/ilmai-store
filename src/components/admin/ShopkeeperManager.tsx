"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, Trash2 } from "lucide-react";
import { SHOPKEEPER_STATUSES } from "@/constants/shopkeeper";
import type { ShopkeeperAccount } from "@/services/ShopkeeperService";

export function ShopkeeperManager({ shopkeepers }: { shopkeepers: ShopkeeperAccount[] }) {
  const router = useRouter();
  const addForm = useRef<HTMLFormElement>(null);
  const [busy, setBusy] = useState<string | boolean>(false);
  const [error, setError] = useState<string | null>(null);

  async function remove(id: string, email: string) {
    if (!confirm(`Remove Shopkeeper access for ${email}? Their Store account will remain active, but the private Shopkeeper facility will be revoked.`)) return;
    setBusy(id);
    setError(null);
    try {
      const response = await fetch(`/api/admin/shopkeepers/${id}`, { method: "DELETE" });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Shopkeeper access could not be removed.");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Shopkeeper access could not be removed.");
    } finally {
      setBusy(false);
    }
  }

  async function submit(url: string, method: "POST" | "PATCH", body: object, key: string | boolean) {
    setBusy(key);
    setError(null);
    try {
      const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Shopkeeper account could not be saved.");
      if (method === "POST") addForm.current?.reset();
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Shopkeeper account could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="mt-7 grid gap-6">
    <form ref={addForm} onSubmit={(event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      void submit("/api/admin/shopkeepers", "POST", {
        email: data.get("email"),
        jazzcashNumber: data.get("jazzcashNumber"),
        receivingIdentifier: data.get("receivingIdentifier"),
        receivingIdentifierVerified: data.get("receivingIdentifierVerified") === "on",
      }, true);
    }} className="rounded-3xl border bg-white p-5 shadow-sm sm:p-7">
      <h2 className="text-lg font-black">Add shopkeeper</h2>
      <p className="mt-1 text-sm text-[#64748B]">Use the shopkeeper&apos;s existing Store account email. This does not create a login or password.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <input required type="email" name="email" placeholder="shopkeeper@example.com" className="rounded-xl border px-3 py-3 text-sm" />
        <input required name="jazzcashNumber" placeholder="JazzCash number (e.g. 0300...)" className="rounded-xl border px-3 py-3 text-sm" />
        <input name="receivingIdentifier" placeholder="Exact JazzCash-issued merchant ID" className="rounded-xl border px-3 py-3 font-mono text-sm sm:col-span-2" />
        <label className="flex items-center gap-2 text-xs font-semibold text-[#475569] sm:col-span-2"><input type="checkbox" name="receivingIdentifierVerified" /> I verified this exact receiving ID with JazzCash for this number</label>
        <button disabled={Boolean(busy)} className="gold-btn min-h-11 px-5 text-sm sm:col-span-2">{busy === true ? <Loader2 size={15} className="animate-spin" /> : null} Add shopkeeper</button>
      </div>
    </form>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}

    {shopkeepers.map((shopkeeper) => <form key={shopkeeper.id} onSubmit={(event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      void submit(`/api/admin/shopkeepers/${shopkeeper.id}`, "PATCH", {
        jazzcashNumber: data.get("jazzcashNumber"),
        receivingIdentifier: data.get("receivingIdentifier"),
        receivingIdentifierVerified: data.get("receivingIdentifierVerified") === "on",
        status: data.get("status"),
      }, shopkeeper.id);
    }} className="rounded-3xl border bg-white p-5 shadow-sm sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-black">{shopkeeper.email}</h3><p className="mt-1 text-xs text-[#64748B]">Added {new Date(shopkeeper.created_at).toLocaleDateString("en-PK")}</p></div><a href="/shopkeeper" className="text-xs font-bold text-[#0F766E] underline">Portal: /shopkeeper</a></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-bold">JazzCash number<input required name="jazzcashNumber" defaultValue={shopkeeper.jazzcash_number} className="mt-1.5 w-full rounded-xl border px-3 py-3 text-sm font-normal" /></label>
        <label className="text-xs font-bold">JazzCash merchant ID<input name="receivingIdentifier" defaultValue={shopkeeper.receiving_identifier ?? ""} className="mt-1.5 w-full rounded-xl border px-3 py-3 font-mono text-sm font-normal" /></label>
        <label className="flex items-center gap-2 text-xs font-semibold"><input type="checkbox" name="receivingIdentifierVerified" defaultChecked={shopkeeper.receiving_identifier_verified} /> Receiving ID verified with JazzCash</label>
        <label className="text-xs font-bold">Access status<select name="status" defaultValue={shopkeeper.status} className="mt-1.5 w-full rounded-xl border bg-white px-3 py-3 text-sm font-normal">{SHOPKEEPER_STATUSES.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}</select></label>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="submit" disabled={Boolean(busy)} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#0B1D3A] px-4 text-xs font-bold text-white">
          {busy === shopkeeper.id ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
        </button>
        <button
          type="button"
          disabled={Boolean(busy)}
          onClick={() => void remove(shopkeeper.id, shopkeeper.email)}
          className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-red-200 px-4 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"
        >
          <Trash2 size={14} /> Remove access
        </button>
      </div>
    </form>)}
    {!shopkeepers.length && <p className="rounded-2xl border bg-white p-8 text-center text-sm text-[#64748B]">No shopkeepers added yet.</p>}
  </div>;
}
