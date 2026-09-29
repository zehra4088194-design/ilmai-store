"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Save } from "lucide-react";
import { SHOPKEEPER_STATUSES, type ShopkeeperStatus } from "@/constants/shopkeeper";

type Shopkeeper = {
  id: string;
  user_id: string;
  service_order_id: string;
  business_name: string | null;
  jazzcash_number: string | null;
  jazzcash_account_name: string | null;
  receiving_identifier: string | null;
  receiving_identifier_verified: boolean;
  status: ShopkeeperStatus;
  created_at: string;
};

export function ShopkeeperManager({ shopkeepers }: { shopkeepers: Shopkeeper[] }) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  async function save(event: React.FormEvent<HTMLFormElement>, shopkeeper: Shopkeeper) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusyId(shopkeeper.id);
    setError(null);
    setSavedId(null);
    try {
      const response = await fetch(`/api/admin/shopkeepers/${shopkeeper.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: form.get("businessName"),
          jazzcashNumber: form.get("jazzcashNumber"),
          jazzcashAccountName: form.get("jazzcashAccountName"),
          receivingIdentifier: form.get("receivingIdentifier"),
          receivingIdentifierVerified: form.get("receivingIdentifierVerified") === "on",
          status: form.get("status"),
        }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "Shopkeeper could not be updated.");
      setSavedId(shopkeeper.id);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Shopkeeper could not be updated.");
    } finally {
      setBusyId(null);
    }
  }

  if (!shopkeepers.length) return <p className="mt-7 rounded-2xl border bg-white p-8 text-center text-sm text-[#64748B]">No verified purchases yet. Shopkeeper accounts are created automatically after service orders are paid.</p>;

  return <div className="mt-7 grid gap-5">{shopkeepers.map((shopkeeper) => (
    <form key={shopkeeper.id} onSubmit={(event) => save(event, shopkeeper)} className="rounded-3xl border bg-white p-5 shadow-sm sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="text-lg font-black">{shopkeeper.business_name || "Shop details not provided"}</h2><p className="mt-1 text-xs text-[#64748B]">User {shopkeeper.user_id} · Created {new Date(shopkeeper.created_at).toLocaleDateString("en-PK")}</p></div>
        <Link href={`/admin/orders#order-${shopkeeper.service_order_id}`} className="text-xs font-bold text-[#0F766E] underline">View service order {shopkeeper.service_order_id.slice(0, 8)}</Link>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-bold">Business name<input name="businessName" required minLength={2} maxLength={120} defaultValue={shopkeeper.business_name ?? ""} className="mt-1.5 w-full rounded-xl border px-3 py-3 text-sm font-normal" /></label>
        <label className="text-xs font-bold">JazzCash mobile number<input name="jazzcashNumber" required defaultValue={shopkeeper.jazzcash_number ?? ""} className="mt-1.5 w-full rounded-xl border px-3 py-3 text-sm font-normal" /></label>
        <label className="text-xs font-bold">JazzCash account name<input name="jazzcashAccountName" required minLength={2} maxLength={120} defaultValue={shopkeeper.jazzcash_account_name ?? ""} className="mt-1.5 w-full rounded-xl border px-3 py-3 text-sm font-normal" /></label>
        <label className="text-xs font-bold">Provider-issued receiving identifier<input name="receivingIdentifier" maxLength={99} defaultValue={shopkeeper.receiving_identifier ?? ""} className="mt-1.5 w-full rounded-xl border px-3 py-3 font-mono text-sm font-normal" /><span className="mt-1 block font-normal text-[#64748B]">Paste the exact identifier supplied by JazzCash. Never derive this from the phone number.</span></label>
        <label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" name="receivingIdentifierVerified" defaultChecked={shopkeeper.receiving_identifier_verified} /> JazzCash identity verified</label>
        <label className="text-xs font-bold">Access / entitlement status<select name="status" defaultValue={shopkeeper.status} className="mt-1.5 w-full rounded-xl border bg-white px-3 py-3 text-sm font-normal">{SHOPKEEPER_STATUSES.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}</select></label>
      </div>
      {error && busyId === null && <p role="alert" className="mt-3 text-sm font-semibold text-red-700">{error}</p>}
      {savedId === shopkeeper.id && <p role="status" className="mt-3 text-sm font-bold text-[#047857]">Shopkeeper access updated.</p>}
      <button type="submit" disabled={busyId === shopkeeper.id} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#0B1D3A] px-5 text-sm font-bold text-white disabled:opacity-60">{busyId === shopkeeper.id ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save shopkeeper</button>
    </form>
  ))}</div>;
}
