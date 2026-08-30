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

  if (needsConfirmation) {
    return (
      <div className="mt-8 rounded-xl bg-[#eaf5ee] px-5 py-5 text-sm leading-6 text-[#2f6b45]">
        Almost there — we&apos;ve sent a confirmation link to <strong>{email}</strong>. Open it to activate your account, then{" "}
        <Link href="/login" className="font-bold underline">
          sign in
        </Link>
        .
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
