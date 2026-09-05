"use client";

import { useState } from "react";
import { MapPin, Plus, Star, Trash2 } from "lucide-react";
import type { Address } from "@/types/domain";

type FormState = {
  label: string;
  fullName: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  isDefault: boolean;
};

const emptyForm: FormState = { label: "", fullName: "", phone: "", line1: "", line2: "", city: "", state: "", postalCode: "", isDefault: false };

/**
 * "Saved addresses" on the account page — lets a signed-in shopper store a
 * few delivery addresses once instead of retyping the full shipping form on
 * every checkout. Delete-and-recreate rather than edit-in-place (no update
 * endpoint yet — keeps this first version simple).
 */
export function AddressBook({ initialAddresses }: { initialAddresses: Address[] }) {
  const [addresses, setAddresses] = useState(initialAddresses);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function update(patch: Partial<FormState>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  async function save() {
    setError(null);
    setSaving(true);
    try {
      const response = await fetch("/api/account/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: form.label || undefined,
          fullName: form.fullName,
          phone: form.phone,
          line1: form.line1,
          line2: form.line2 || undefined,
          city: form.city,
          state: form.state || undefined,
          postalCode: form.postalCode,
          country: "PK",
          isDefault: form.isDefault,
        }),
      });
      const data = await response.json() as Address | { error?: string };
      if (!response.ok) throw new Error((data as { error?: string }).error ?? "Address could not be saved.");
      setAddresses((current) => [...current, data as Address]);
      setForm(emptyForm);
      setAdding(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Address could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    setDeletingId(id);
    try {
      const response = await fetch(`/api/account/addresses/${id}`, { method: "DELETE" });
      if (response.ok) setAddresses((current) => current.filter((a) => a.id !== id));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="rounded-[2rem] border bg-white p-6 sm:p-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-[#0F766E]">Saved addresses</p>
          <h2 className="display-font mt-1 text-2xl text-[#0B1D3A]">Skip retyping at checkout.</h2>
          <p className="mt-1 text-xs text-[#64748B]">Save a delivery address here once — it&apos;ll be offered to pick from the next time you check out a physical item.</p>
        </div>
        {!adding && (
          <button type="button" onClick={() => setAdding(true)} className="inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold">
            <Plus size={15} /> Add address
          </button>
        )}
      </div>

      {addresses.length > 0 && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {addresses.map((address) => (
            <div key={address.id} className="rounded-2xl border bg-[#F1F5F9] p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-bold text-[#0B1D3A]">
                  <MapPin size={14} className="text-[#0F766E]" /> {address.label || "Address"}
                  {address.isDefault && <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-[#0F766E]"><Star size={9} className="mr-1 inline" fill="currentColor" />Default</span>}
                </div>
                <button type="button" onClick={() => address.id && remove(address.id)} disabled={deletingId === address.id} className="text-[#64748B] hover:text-red-700 disabled:opacity-50">
                  <Trash2 size={14} />
                </button>
              </div>
              <p className="mt-2 text-xs leading-5 text-[#64748B]">
                {address.fullName} · {address.phone}<br />
                {address.line1}{address.line2 ? `, ${address.line2}` : ""}<br />
                {address.city}{address.state ? `, ${address.state}` : ""} {address.postalCode}
              </p>
            </div>
          ))}
        </div>
      )}
      {!addresses.length && !adding && <p className="mt-4 text-sm text-[#64748B]">No saved addresses yet.</p>}

      {adding && (
        <div className="mt-5 rounded-2xl border bg-[#F1F5F9] p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <input value={form.label} onChange={(e) => update({ label: e.target.value })} placeholder="Label (e.g. Home)" className="rounded-xl border bg-white px-4 py-3 text-sm" />
            <input value={form.fullName} onChange={(e) => update({ fullName: e.target.value })} placeholder="Full name" className="rounded-xl border bg-white px-4 py-3 text-sm" />
            <input value={form.phone} onChange={(e) => update({ phone: e.target.value })} placeholder="Phone number" className="rounded-xl border bg-white px-4 py-3 text-sm" />
            <input value={form.line1} onChange={(e) => update({ line1: e.target.value })} placeholder="Address" className="rounded-xl border bg-white px-4 py-3 text-sm sm:col-span-2" />
            <input value={form.city} onChange={(e) => update({ city: e.target.value })} placeholder="City" className="rounded-xl border bg-white px-4 py-3 text-sm" />
            <input value={form.postalCode} onChange={(e) => update({ postalCode: e.target.value })} placeholder="City code / postal code" className="rounded-xl border bg-white px-4 py-3 text-sm" />
          </div>
          <label className="mt-3 flex items-center gap-2 text-xs font-bold">
            <input type="checkbox" checked={form.isDefault} onChange={(e) => update({ isDefault: e.target.checked })} className="h-4 w-4" />
            Use as default address
          </label>
          <div className="mt-4 flex items-center gap-3">
            <button type="button" disabled={saving || !form.fullName || !form.phone || !form.line1 || !form.city || !form.postalCode} onClick={save} className="rounded-full bg-[#0B1D3A] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">
              {saving ? "Saving…" : "Save address"}
            </button>
            <button type="button" onClick={() => { setAdding(false); setForm(emptyForm); setError(null); }} className="text-sm font-bold text-[#64748B]">Cancel</button>
          </div>
          {error && <p className="mt-3 text-sm font-semibold text-red-700">{error}</p>}
        </div>
      )}
    </div>
  );
}
