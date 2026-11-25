"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Loader2, Save, Trash2, UserPlus } from "lucide-react";
import { SHOPKEEPER_STATUSES } from "@/constants/shopkeeper";
import type { ShopkeeperAccount } from "@/services/ShopkeeperService";

type Credentials = { loginId: string; temporaryPassword: string };

export function ShopkeeperManager({ shopkeepers }: { shopkeepers: ShopkeeperAccount[] }) {
  const router = useRouter();
  const addForm = useRef<HTMLFormElement>(null);
  const [busy, setBusy] = useState<string | boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  async function copyValue(key: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      window.setTimeout(() => setCopied(null), 1400);
    } catch {
      setError("Could not copy the credentials. Please select and copy them manually.");
    }
  }

  async function remove(id: string, displayName: string) {
    if (!confirm(`Remove merchant access for ${displayName}? Their sign-in account will remain, but they will no longer be able to generate a QR.`)) return;
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
    setCredentials(null);
    try {
      const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json() as { error?: string; credentials?: Credentials };
      if (!response.ok) throw new Error(result.error || "Merchant account could not be saved.");

      if (method === "POST") {
        addForm.current?.reset();
        if (!result.credentials) throw new Error("Merchant was created but login credentials were not returned.");
        setCredentials(result.credentials);
        setNotice("Merchant created. Copy these login credentials now and share them privately with the shopkeeper.");
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
        void submit("/api/admin/shopkeepers", "POST", { displayName: data.get("displayName") }, true);
      }} className="rounded-3xl border bg-white p-5 shadow-sm sm:p-7">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#E6F4F1] text-[#0F766E]"><UserPlus size={19} /></span>
          <div><h2 className="text-lg font-black">Add merchant</h2><p className="text-xs text-[#64748B]">Only the shop name is needed. Login details are generated automatically.</p></div>
        </div>
        <div className="mt-5 grid gap-3">
          <label className="grid gap-1.5 text-xs font-bold">Shop / merchant name
            <input required minLength={2} maxLength={120} name="displayName" placeholder="e.g. Al-Madina Store" className="rounded-xl border px-3 py-3 text-sm font-normal" />
          </label>
          <p className="text-xs leading-5 text-[#64748B]">The shopkeeper adds their own JazzCash number and exact receiving ID after signing in. You verify those details before activating QR payments.</p>
          <button disabled={Boolean(busy)} className="gold-btn min-h-11 px-5 text-sm">
            {busy === true ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />} Add merchant
          </button>
        </div>
      </form>

      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
      {notice && <p role="status" className="rounded-xl bg-[#E6F4F1] p-3 text-sm font-semibold text-[#0F766E]">{notice}</p>}

      {credentials && (
        <section className="rounded-3xl border border-[#0F766E]/25 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex items-center gap-2 text-sm font-black text-[#0F766E]"><Check size={17} /> One-time merchant login credentials</div>
          <p className="mt-2 text-xs leading-5 text-[#64748B]">Copy these now and share them privately with the shopkeeper. The temporary password will not be shown again after leaving this page.</p>
          <div className="mt-4 grid gap-3">
            <Credential label="Merchant Login ID" value={credentials.loginId} copied={copied === "login"} onCopy={() => void copyValue("login", credentials.loginId)} />
            <Credential label="Temporary password" value={credentials.temporaryPassword} copied={copied === "password"} onCopy={() => void copyValue("password", credentials.temporaryPassword)} />
            <button type="button" onClick={() => void copyValue("all", `Merchant Login ID: ${credentials.loginId}\nTemporary password: ${credentials.temporaryPassword}`)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#0B1D3A] px-4 text-xs font-bold text-white">
              {copied === "all" ? <Check size={14} /> : <Copy size={14} />} Copy both credentials
            </button>
          </div>
        </section>
      )}

      {shopkeepers.map((merchant) => (
        <form key={merchant.id} onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          void submit(`/api/admin/shopkeepers/${merchant.id}`, "PATCH", {
            displayName: data.get("displayName"),
            jazzcashNumber: data.get("jazzcashNumber"),
            receivingIdentifier: data.get("receivingIdentifier"),
            receivingIdentifierVerified: data.get("receivingIdentifierVerified") === "on",
            status: data.get("status"),
          }, merchant.id);
        }} className="rounded-3xl border bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h3 className="font-black">{merchant.display_name}</h3><p className="mt-1 text-xs text-[#64748B]">Login ID: {merchant.email} · Added {new Date(merchant.created_at).toLocaleDateString("en-PK")}</p></div>
            <a href="/shopkeeper" className="text-xs font-bold text-[#0F766E] underline">Merchant portal</a>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 text-xs font-bold sm:col-span-2">Shop / merchant name
              <input required minLength={2} maxLength={120} name="displayName" defaultValue={merchant.display_name} className="w-full rounded-xl border px-3 py-3 text-sm font-normal" />
            </label>
            <label className="grid gap-1.5 text-xs font-bold">JazzCash number
              <input required name="jazzcashNumber" defaultValue={merchant.jazzcash_number === "PENDING1" ? "" : merchant.jazzcash_number} placeholder="Awaiting merchant details" className="w-full rounded-xl border px-3 py-3 text-sm font-normal" />
            </label>
            <label className="grid gap-1.5 text-xs font-bold">Merchant receiving ID
              <input name="receivingIdentifier" defaultValue={merchant.receiving_identifier ?? ""} placeholder="Awaiting merchant details" className="w-full rounded-xl border px-3 py-3 font-mono text-sm font-normal" />
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
              {busy === merchant.id ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save / verify
            </button>
            <button type="button" disabled={Boolean(busy)} onClick={() => void remove(merchant.id, merchant.display_name)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-red-200 px-4 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-50">
              <Trash2 size={14} /> Remove access
            </button>
          </div>
        </form>
      ))}
      {!shopkeepers.length && <p className="rounded-2xl border bg-white p-8 text-center text-sm text-[#64748B]">No merchants have been added yet.</p>}
    </div>
  );
}

function Credential({ label, value, copied, onCopy }: { label: string; value: string; copied: boolean; onCopy: () => void }) {
  return (
    <div className="rounded-xl border bg-[#F8FAFC] p-3">
      <p className="text-[10px] font-black uppercase tracking-widest text-[#64748B]">{label}</p>
      <div className="mt-1 flex items-center justify-between gap-3">
        <code className="min-w-0 break-all text-sm font-bold text-[#0B1D3A]">{value}</code>
        <button type="button" onClick={onCopy} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border bg-white" aria-label={`Copy ${label}`}>{copied ? <Check size={15} /> : <Copy size={15} />}</button>
      </div>
    </div>
  );
}
