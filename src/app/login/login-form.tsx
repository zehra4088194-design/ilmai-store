"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Loader2 } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedRedirect = searchParams.get("redirect");
  const redirectTo = requestedRedirect === "/admin" ? "/admin" : "/shopkeeper";
  const inviteOnlyNotice = searchParams.get("inviteOnly") === "1";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (signInError) throw new Error("Email or password is incorrect.");
      router.replace(redirectTo);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 grid gap-4">
      {inviteOnlyNotice && <p className="rounded-xl bg-[#E6F4F1] px-4 py-3 text-sm font-semibold text-[#0F766E]">Merchant accounts are added by the administrator. Ask them to send you an invitation.</p>}
      {error && <p role="alert" className="rounded-xl bg-[#fbeaea] px-4 py-3 text-sm font-semibold text-[#a13f3f]">{error}</p>}
      <label className="grid gap-2 text-sm font-semibold">
        Email
        <input type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="rounded-xl border bg-white px-4 py-3 text-sm font-normal outline-none focus:border-[#0F766E]" />
      </label>
      <label className="grid gap-2 text-sm font-semibold">
        Password
        <input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" className="rounded-xl border bg-white px-4 py-3 text-sm font-normal outline-none focus:border-[#0F766E]" />
      </label>
      <Link href="/forgot-password" className="text-right text-xs font-bold text-[#0F766E]">Forgot password?</Link>
      <button type="submit" disabled={loading} className="mt-2 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#0B1D3A] px-6 text-sm font-bold text-white transition hover:bg-[#115E59] disabled:cursor-not-allowed disabled:opacity-60">
        {loading ? <><Loader2 size={16} className="animate-spin" /> Signing in…</> : <>Sign in <ArrowRight size={16} /></>}
      </button>
    </form>
  );
}
