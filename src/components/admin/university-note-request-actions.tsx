"use client";

import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";

export function UniversityNoteRequestActions({ id, initialStatus, initialNote }: { id: string; initialStatus: string; initialNote?: string }) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [adminNote, setAdminNote] = useState(initialNote ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/university-note-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, adminNote }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Could not update request.");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not update request.");
    } finally {
      setSaving(false);
    }
  }

  return <div className="mt-4 rounded-2xl bg-[#F8FAFC] p-4">
    <div className="grid gap-3 sm:grid-cols-[180px_1fr_auto] sm:items-end">
      <label className="text-xs font-black uppercase tracking-wider text-[#64748B]">Status<select value={status} onChange={(e) => setStatus(e.target.value)} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5 text-sm font-bold normal-case tracking-normal text-[#0B1D3A]"><option value="pending">Pending</option><option value="in_progress">In progress</option><option value="fulfilled">Fulfilled</option><option value="cancelled">Cancelled</option></select></label>
      <label className="text-xs font-black uppercase tracking-wider text-[#64748B]">Admin note<textarea value={adminNote} onChange={(e) => setAdminNote(e.target.value)} rows={2} placeholder="Optional internal note..." className="mt-2 w-full resize-y rounded-xl border bg-white px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-[#0B1D3A] outline-none focus:border-[#0F766E]" /></label>
      <button type="button" onClick={save} disabled={saving} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#0B1D3A] px-4 text-sm font-bold text-white disabled:opacity-50">{saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save</button>
    </div>
    {error && <p className="mt-2 text-xs font-semibold text-red-700">{error}</p>}
  </div>;
}
