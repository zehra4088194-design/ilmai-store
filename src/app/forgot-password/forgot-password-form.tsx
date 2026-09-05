"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2 } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback`,
      });
      if (resetError) throw new Error(resetError.message);
      // Always show the same confirmation regardless of whether the email
      // is registered — an error here would tell an attacker which emails
      // have accounts.
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the reset link.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="mt-8 rounded-xl bg-[#DCFCE7] px-5 py-5 text-sm leading-6 text-[#15803D]">
        If <strong>{email}</strong> has an account, a password-reset link is on its way. Open it to choose a new password.
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 grid gap-4">
      {error && <p className="rounded-xl bg-[#fbeaea] px-4 py-3 text-sm font-semibold text-[#a13f3f]">{error}</p>}
      <label className="grid gap-2 text-sm font-semibold text-[#0B1D3A]">
        Email
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="rounded-xl border bg-white px-4 py-3 text-sm font-normal text-[#0B1D3A] outline-none placeholder:text-[#64748B] focus:border-[#0F766E]"
        />
      </label>
      <button
        type="submit"
        disabled={loading}
        className="mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-[#0B1D3A] px-6 py-3.5 text-sm font-bold text-white transition hover:bg-[#115E59] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? <><Loader2 size={16} className="animate-spin" /> Sending…</> : <>Send reset link <ArrowRight size={16} /></>}
      </button>
      <p className="mt-2 text-center text-sm text-[#64748B]">
        <Link href="/login" className="font-bold text-[#0F766E]">Back to sign in</Link>
      </p>
    </form>
  );
}
