"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Loader2 } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function ResetPasswordForm() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    createSupabaseBrowserClient().auth.getSession().then(({ data }) => {
      if (!data.session) setError("This link has expired or was already used. Request a new one.");
      setReady(true);
    });
  }, []);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setLoading(true);
    try {
      const { error: updateError } = await createSupabaseBrowserClient().auth.updateUser({ password });
      if (updateError) throw new Error(updateError.message);
      setDone(true);
      window.setTimeout(() => { router.replace("/shopkeeper"); router.refresh(); }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password could not be updated.");
    } finally {
      setLoading(false);
    }
  }

  if (!ready) return <div className="mt-8 flex items-center gap-2 text-sm text-[#64748B]"><Loader2 size={16} className="animate-spin" /> Checking your link…</div>;
  if (done) return <div className="mt-8 rounded-xl bg-[#DCFCE7] px-5 py-5 text-sm text-[#15803D]">Password updated. Opening your merchant portal…</div>;

  return (
    <form onSubmit={onSubmit} className="mt-8 grid gap-4">
      {error && <div className="rounded-xl bg-[#fbeaea] px-4 py-3 text-sm font-semibold text-[#a13f3f]">{error} <Link href="/forgot-password" className="underline">Request a new link</Link></div>}
      <label className="grid gap-2 text-sm font-semibold">New password
        <input type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" className="rounded-xl border bg-white px-4 py-3 text-sm font-normal outline-none focus:border-[#0F766E]" />
      </label>
      <label className="grid gap-2 text-sm font-semibold">Confirm new password
        <input type="password" required minLength={8} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Repeat your password" className="rounded-xl border bg-white px-4 py-3 text-sm font-normal outline-none focus:border-[#0F766E]" />
      </label>
      <button type="submit" disabled={loading} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#0B1D3A] px-6 text-sm font-bold text-white disabled:opacity-60">
        {loading ? <><Loader2 size={16} className="animate-spin" /> Updating…</> : <>Set password <ArrowRight size={16} /></>}
      </button>
    </form>
  );
}
