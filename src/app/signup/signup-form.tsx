"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Loader2 } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/account";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resent, setResent] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError) throw new Error(signUpError.message);
      if (!data.session) {
        // Email confirmation is required before a session exists.
        setNeedsConfirmation(true);
        setLoading(false);
        return;
      }
      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create your account.");
      setLoading(false);
    }
  }

  async function onVerifyCode(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setVerifying(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: verifyError } = await supabase.auth.verifyOtp({ email, token: code.trim(), type: "signup" });
      if (verifyError) throw new Error(verifyError.message);
      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That code didn't work — check it and try again.");
    } finally {
      setVerifying(false);
    }
  }

  async function resendCode() {
    setError(null);
    setResent(false);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: resendError } = await supabase.auth.resend({ type: "signup", email });
      if (resendError) throw new Error(resendError.message);
      setResent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resend the code.");
    }
  }

  if (needsConfirmation) {
    return (
      <div className="mt-8">
        <div className="rounded-xl bg-[#eaf5ee] px-5 py-5 text-sm leading-6 text-[#2f6b45]">
          Almost there — we&apos;ve sent a confirmation email to <strong>{email}</strong>. Either open the link in it, or enter the verification code from that same email below.
        </div>
        {error && <p className="mt-4 rounded-xl bg-[#fbeaea] px-4 py-3 text-sm font-semibold text-[#a13f3f]">{error}</p>}
        <form onSubmit={onVerifyCode} className="mt-5 grid gap-4">
          <label className="grid gap-2 text-sm font-semibold text-[#103d42]">
            Verification code
            <input
              inputMode="numeric"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. 32358890"
              className="rounded-xl border bg-white px-4 py-3 text-center text-lg font-bold tracking-[.2em] text-[#103d42] outline-none placeholder:font-normal placeholder:tracking-normal placeholder:text-[#9db1b3] focus:border-[#14777a]"
            />
          </label>
          <button
            type="submit"
            disabled={verifying || !code.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#103d42] px-6 py-3.5 text-sm font-bold text-white transition hover:bg-[#14777a] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {verifying ? <><Loader2 size={16} className="animate-spin" /> Verifying…</> : "Verify and continue"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-[#6b7f82]">
          Didn&apos;t get it?{" "}
          <button type="button" onClick={resendCode} className="font-bold text-[#14777a] underline">Resend the code</button>
          {resent && <span className="ml-2 text-[#2f6b45]">Sent.</span>}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 grid gap-4">
      {error && <p className="rounded-xl bg-[#fbeaea] px-4 py-3 text-sm font-semibold text-[#a13f3f]">{error}</p>}
      <label className="grid gap-2 text-sm font-semibold text-[#103d42]">
        Email
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="rounded-xl border bg-white px-4 py-3 text-sm font-normal text-[#103d42] outline-none placeholder:text-[#9db1b3] focus:border-[#14777a]"
        />
      </label>
      <label className="grid gap-2 text-sm font-semibold text-[#103d42]">
        Password
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 6 characters"
          className="rounded-xl border bg-white px-4 py-3 text-sm font-normal text-[#103d42] outline-none placeholder:text-[#9db1b3] focus:border-[#14777a]"
        />
      </label>
      <button
        type="submit"
        disabled={loading}
        className="mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-[#103d42] px-6 py-3.5 text-sm font-bold text-white transition hover:bg-[#14777a] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? <><Loader2 size={16} className="animate-spin" /> Creating account…</> : <>Create account <ArrowRight size={16} /></>}
      </button>
      <p className="mt-2 text-center text-sm text-[#6b7f82]">
        Already have an account?{" "}
        <Link href={`/login${redirectTo !== "/account" ? `?redirect=${encodeURIComponent(redirectTo)}` : ""}`} className="font-bold text-[#14777a]">
          Sign in
        </Link>
      </p>
    </form>
  );
}
