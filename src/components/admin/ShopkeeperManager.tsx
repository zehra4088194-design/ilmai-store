"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, Trash2, UserPlus } from "lucide-react";
import { SHOPKEEPER_STATUSES } from "@/constants/shopkeeper";
import type { ShopkeeperAccount } from "@/services/ShopkeeperService";

export function ShopkeeperManager({ shopkeepers }: { shopkeepers: ShopkeeperAccount[] }) {
  const router = useRouter();
  const addForm = useRef<HTMLFormElement>(null);
  const [busy, setBusy] = useState<string | boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function remove(id: string, email: string) {
    if (!confirm(`Remove merchant access for ${email}? Their sign-in account will remain, but they will no longer be able to generate a QR.`)) return;
    setBusy(id);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/admin/shopkeepers/${id}`, { method: "DELETE" });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Merchant access could not be removed.");
      setNotice("Merchant access removed.");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Merchant access could not be removed.");
    } finally {
      setBusy(false);
    }
  }

  async function submit(url: string, method: "POST" | "PATCH", body: object, key: string | boolean) {
    setBusy(key);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json() as { error?: string; invited?: boolean };
      if (!response.ok) throw new Error(result.error || "Merchant account could not be saved.");
      if (method === "POST") {
        addForm.current?.reset();
        setNotice(result.invited ? "Invitation email sent. The merchant can finish setting up their sign-in." : "Merchant access added for the existing account.");
      } else {
        setNotice("Merchant details updated.");
      }
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Merchant account could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-7 grid gap-6">
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
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#E6F4F1] text-[#0F766E]"><UserPlus size={19} /></span>
          <div><h2 className="text-lg font-black">Add merchant</h2><p className="text-xs text-[#64748B]">Create access or invite an existing account by email.</p></div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1.5 text-xs font-bold">Merchant email
            <input required type="email" name="email" placeholder="merchant@example.com" className="rounded-xl border px-3 py-3 text-sm font-normal" />
          </label>
          <label className="grid gap-1.5 text-xs font-bold">JazzCash number
            <input required name="jazzcashNumber" placeholder="03XX XXXXXXX" className="rounded-xl border px-3 py-3 text-sm font-normal" />
          </label>
          <label className="grid gap-1.5 text-xs font-bold sm:col-span-2">JazzCash-issued merchant receiving ID
            <input name="receivingIdentifier" placeholder="Enter the exact provider-issued identifier" className="rounded-xl border px-3 py-3 font-mono text-sm font-normal" />
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold text-[#475569] sm:col-span-2">
            <input type="checkbox" name="receivingIdentifierVerified" />
            I have verified this exact receiving ID with JazzCash for this merchant
          </label>
          <p className="text-xs leading-5 text-[#64748B] sm:col-span-2">Without a verified receiving ID, the merchant remains pending and cannot generate a payment QR.</p>
          <button disabled={Boolean(busy)} className="gold-btn min-h-11 px-5 text-sm sm:col-span-2">
            {busy === true ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />} Add merchant
          </button>
        </div>
      </form>

      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
      {notice && <p role="status" className="rounded-xl bg-[#E6F4F1] p-3 text-sm font-semibold text-[#0F766E]">{notice}</p>}

      {shopkeepers.map((merchant) => (
        <form key={merchant.id} onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          void submit(`/api/admin/shopkeepers/${merchant.id}`, "PATCH", {
            jazzcashNumber: data.get("jazzcashNumber"),
            receivingIdentifier: data.get("receivingIdentifier"),
            receivingIdentifierVerified: data.get("receivingIdentifierVerified") === "on",
            status: data.get("status"),
          }, merchant.id);
        }} className="rounded-3xl border bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h3 className="font-black">{merchant.email}</h3><p className="mt-1 text-xs text-[#64748B]">Added {new Date(merchant.created_at).toLocaleDateString("en-PK")}</p></div>
            <a href="/shopkeeper" className="text-xs font-bold text-[#0F766E] underline">Merchant portal</a>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 text-xs font-bold">JazzCash number
              <input required name="jazzcashNumber" defaultValue={merchant.jazzcash_number} className="w-full rounded-xl border px-3 py-3 text-sm font-normal" />
            </label>
            <label className="grid gap-1.5 text-xs font-bold">Merchant receiving ID
              <input name="receivingIdentifier" defaultValue={merchant.receiving_identifier ?? ""} className="w-full rounded-xl border px-3 py-3 font-mono text-sm font-normal" />
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold"><input type="checkbox" name="receivingIdentifierVerified" defaultChecked={merchant.receiving_identifier_verified} /> Receiving ID verified with JazzCash</label>
            <label className="grid gap-1.5 text-xs font-bold">Access status
              <select name="status" defaultValue={merchant.status} className="w-full rounded-xl border bg-white px-3 py-3 text-sm font-normal">
                {SHOPKEEPER_STATUSES.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}
              </select>
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="submit" disabled={Boolean(busy)} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#0B1D3A] px-4 text-xs font-bold text-white">
              {busy === merchant.id ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
            </button>
            <button type="button" disabled={Boolean(busy)} onClick={() => void remove(merchant.id, merchant.email)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-red-200 px-4 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-50">
              <Trash2 size={14} /> Remove access
            </button>
          </div>
        </form>
      ))}
      {!shopkeepers.length && <p className="rounded-2xl border bg-white p-8 text-center text-sm text-[#64748B]">No merchants have been added yet.</p>}
    </div>
  );
}
