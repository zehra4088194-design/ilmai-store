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
    // /auth/callback already exchanged the recovery code for a session
    // server-side (cookies are set); this just confirms the client sees a
    // signed-in (recovery) session before letting the form submit.
    createSupabaseBrowserClient().auth.getSession().then(({ data }) => {
      if (!data.session) setError("This reset link has expired or was already used. Request a new one.");
      setReady(true);
    });
  }, []);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirm) { setError("Passwords don't match."); return; }
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw new Error(updateError.message);
      setDone(true);
      setTimeout(() => { router.push("/account"); router.refresh(); }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password could not be updated.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return <div className="mt-8 rounded-xl bg-[#DCFCE7] px-5 py-5 text-sm leading-6 text-[#15803D]">Password updated — taking you to your account…</div>;
  }

  if (!ready) {
    return <div className="mt-8 flex items-center gap-2 text-sm text-[#64748B]"><Loader2 size={16} className="animate-spin" /> Checking your link…</div>;
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 grid gap-4">
      {error && (
        <div className="rounded-xl bg-[#fbeaea] px-4 py-3 text-sm font-semibold text-[#a13f3f]">
          {error} <Link href="/forgot-password" className="underline">Request a new link</Link>
        </div>
      )}
      <label className="grid gap-2 text-sm font-semibold text-[#0B1D3A]">
        New password
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 6 characters"
          className="rounded-xl border bg-white px-4 py-3 text-sm font-normal text-[#0B1D3A] outline-none placeholder:text-[#64748B] focus:border-[#0F766E]"
        />
      </label>
      <label className="grid gap-2 text-sm font-semibold text-[#0B1D3A]">
        Confirm new password
        <input
          type="password"
          required
          minLength={6}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Repeat your new password"
          className="rounded-xl border bg-white px-4 py-3 text-sm font-normal text-[#0B1D3A] outline-none placeholder:text-[#64748B] focus:border-[#0F766E]"
        />
      </label>
      <button
        type="submit"
        disabled={loading}
        className="mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-[#0B1D3A] px-6 py-3.5 text-sm font-bold text-white transition hover:bg-[#115E59] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? <><Loader2 size={16} className="animate-spin" /> Updating…</> : <>Set new password <ArrowRight size={16} /></>}
      </button>
    </form>
  );
}
