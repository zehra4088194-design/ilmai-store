"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Loader2 } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Mode = "login" | "signup";

const COPY: Record<Mode, { eyebrow: string; title: string; sub: string; cta: string; footerText: string; footerLinkLabel: string; footerHref: string }> = {
  login: {
    eyebrow: "Welcome back",
    title: "Sign in to your shelf.",
    sub: "Pick up right where you left off — orders, downloads and everything you've bought.",
    cta: "Sign in",
    footerText: "New to IlmAI Store?",
    footerLinkLabel: "Create an account",
    footerHref: "/signup",
  },
  signup: {
    eyebrow: "Join the shelf",
    title: "Create your account.",
    sub: "One account for every note, book and test series you pick up from us.",
    cta: "Create account",
    footerText: "Already have an account?",
    footerLinkLabel: "Sign in",
    footerHref: "/login",
  },
};

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/account";
  const copy = COPY[mode];

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      if (mode === "login") {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        await fetch("/api/cart/merge", { method: "POST" }).catch(() => {});
        router.push(redirectTo);
        router.refresh();
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;
        if (!data.session) {
          // Email confirmation is required before a session exists.
          setNotice("Check your inbox to confirm your email, then sign in.");
          setLoading(false);
          return;
        }
        await fetch("/api/cart/merge", { method: "POST" }).catch(() => {});
        router.push(redirectTo);
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F1F5F9] px-5 py-10 text-[#0B1D3A] sm:py-16">
      <div className="mx-auto max-w-md">
        <Link href="/store" className="text-sm font-bold text-[#0F766E]">
          ← Back to store
        </Link>

        <div className="mt-8 rounded-[2rem] border bg-white p-8 shadow-[0_25px_70px_rgba(16,61,66,.08)] sm:p-10">
          <p className="text-xs font-bold uppercase tracking-[.2em] text-[#0F766E]">{copy.eyebrow}</p>
          <h1 className="display-font mt-3 text-4xl leading-tight text-[#0B1D3A]">{copy.title}</h1>
          <p className="mt-3 text-sm leading-6 text-[#64748B]">{copy.sub}</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label htmlFor="email" className="text-xs font-bold uppercase tracking-widest text-[#64748B]">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 w-full rounded-xl border border-[#E2E8F0] bg-[#F1F5F9] px-4 py-3 text-sm text-[#0B1D3A] outline-none focus:border-[#0F766E]"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="text-xs font-bold uppercase tracking-widest text-[#64748B]">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 w-full rounded-xl border border-[#E2E8F0] bg-[#F1F5F9] px-4 py-3 text-sm text-[#0B1D3A] outline-none focus:border-[#0F766E]"
                placeholder="••••••••"
              />
            </div>

            {mode === "login" && (
              <Link href="/forgot-password" className="-mt-2 block text-right text-xs font-bold text-[#0F766E]">Forgot password?</Link>
            )}

            {error && (
              <p className="rounded-xl bg-[#fbeaea] px-4 py-3 text-sm font-medium text-[#a13d3d]">{error}</p>
            )}
            {notice && (
              <p className="rounded-xl bg-[#F1F5F9] px-4 py-3 text-sm font-medium text-[#0F766E]">{notice}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-[#0B1D3A] px-6 py-3.5 text-sm font-bold text-white transition hover:bg-[#115E59] disabled:opacity-60"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <>{copy.cta} <ArrowRight size={16} /></>}
            </button>
          </form>

          <p className="mt-7 text-center text-sm text-[#64748B]">
            {copy.footerText}{" "}
            <Link href={`${copy.footerHref}${redirectTo !== "/account" ? `?redirect=${encodeURIComponent(redirectTo)}` : ""}`} className="font-bold text-[#0F766E]">
              {copy.footerLinkLabel}
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
