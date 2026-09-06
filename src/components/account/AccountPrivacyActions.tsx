"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Loader2, TriangleAlert } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function AccountPrivacyActions() {
  const router = useRouter();
  const [exporting, setExporting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function exportData() {
    setExporting(true);
    try {
      const response = await fetch("/api/account/export");
      if (!response.ok) throw new Error("Could not export your data.");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "ilmai-store-account-export.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not export your data.");
    } finally {
      setExporting(false);
    }
  }

  async function deleteAccount() {
    setDeleting(true);
    setError(null);
    try {
      const response = await fetch("/api/account/delete", { method: "POST" });
      if (!response.ok) { const data = await response.json().catch(() => ({})); throw new Error(data.error ?? "Your account could not be deleted."); }
      await createSupabaseBrowserClient().auth.signOut();
      router.push("/store");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Your account could not be deleted.");
      setDeleting(false);
    }
  }

  return (
    <div className="rounded-[1.75rem] border bg-white p-6">
      <p className="text-xs font-bold uppercase tracking-[.2em] text-[#0F766E]">Your data</p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" onClick={exportData} disabled={exporting} className="inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-bold text-[#0B1D3A] disabled:opacity-50">
          {exporting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} Download my data
        </button>
        {!confirmOpen && (
          <button type="button" onClick={() => setConfirmOpen(true)} className="inline-flex items-center gap-2 rounded-full border border-red-200 px-4 py-2.5 text-sm font-bold text-red-700">
            Delete my account
          </button>
        )}
      </div>

      {confirmOpen && (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="flex items-center gap-2 text-sm font-bold text-red-700"><TriangleAlert size={15} /> This permanently deletes your account and cannot be undone.</p>
          <p className="mt-2 text-xs leading-5 text-red-700/80">Your addresses, wishlist and reviews are removed. Past orders stay on record for our accounting/legal requirements, just no longer linked to an account.</p>
          <label className="mt-3 block text-xs font-semibold text-red-700">
            Type DELETE to confirm
            <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} className="mt-1.5 w-full max-w-xs rounded-lg border border-red-300 bg-white px-3 py-2 text-sm outline-none" />
          </label>
          <div className="mt-3 flex gap-2">
            <button type="button" disabled={confirmText !== "DELETE" || deleting} onClick={deleteAccount} className="rounded-full bg-red-700 px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">
              {deleting ? "Deleting…" : "Permanently delete"}
            </button>
            <button type="button" onClick={() => { setConfirmOpen(false); setConfirmText(""); }} className="rounded-full border px-4 py-2.5 text-sm font-bold text-[#0B1D3A]">
              Cancel
            </button>
          </div>
        </div>
      )}
      {error && <p className="mt-3 text-sm font-semibold text-red-700">{error}</p>}
    </div>
  );
}
