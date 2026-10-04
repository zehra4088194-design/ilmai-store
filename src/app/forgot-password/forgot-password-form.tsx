"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, KeyRound, Loader2, RotateCw } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function ForgotPasswordForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function sendRecoveryEmail() {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError("Enter the email on your account.");
      return false;
    }

    setError(null);
    setLoading(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: `${window.location.origin}/auth/callback`,
      });

      if (resetError) throw new Error(resetError.message);

      setEmail(normalizedEmail);
      setSent(true);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the reset link.");
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    await sendRecoveryEmail();
  }

  async function verifyCode(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError("Enter the email on your account.");
      return;
    }

    if (!/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit code from your email.");
      return;
    }

    setVerifying(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: normalizedEmail,
        token: code,
        type: "recovery",
      });

      if (verifyError) throw new Error(verifyError.message);

      router.replace("/auth/reset-password");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "The reset code could not be verified.");
    } finally {
      setVerifying(false);
    }
  }

  if (sent) {
    return (
      <div>
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0F766E]/10">
          <KeyRound className="h-8 w-8 text-[#0F766E]" />
        </div>

        <h1 className="mb-2 text-center text-2xl font-bold">Check your email</h1>

        <p className="mb-6 text-center text-sm leading-6 text-[#64748B]">
          We sent a secure reset link and a 6-digit code to{" "}
          <span className="font-semibold text-[#0B1D3A]">{email}</span>. Use either option.
        </p>

        {error && (
          <p className="mb-4 rounded-xl bg-[#fbeaea] px-4 py-3 text-sm font-semibold text-[#a13f3f]">
            {error}
          </p>
        )}

        <form onSubmit={verifyCode} className="grid gap-4">
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            required
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            aria-label="Password reset code"
            className="rounded-xl border bg-white px-4 py-4 text-center font-mono text-2xl tracking-[.45em] text-[#0B1D3A] outline-none focus:border-[#0F766E]"
          />

          <button
            type="submit"
            disabled={verifying}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0B1D3A] px-6 py-3.5 text-sm font-bold text-white transition hover:bg-[#115E59] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {verifying ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
            {verifying ? "Verifying…" : "Verify code"}
          </button>
        </form>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              void sendRecoveryEmail();
            }}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-full border px-4 py-3 text-sm font-bold text-[#0B1D3A] transition hover:bg-[#F1F5F9] disabled:opacity-60"
          >
            <RotateCw size={15} />
            {loading ? "Sending…" : "Resend"}
          </button>

          <button
            type="button"
            onClick={() => {
              setSent(false);
              setCode("");
              setError(null);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-full border px-4 py-3 text-sm font-bold text-[#0B1D3A] transition hover:bg-[#F1F5F9]"
          >
            <ArrowLeft size={15} />
            Change email
          </button>
        </div>

        <Link href="/login" className="mt-6 flex items-center justify-center gap-1 text-sm font-bold text-[#0F766E]">
          <ArrowLeft size={14} /> Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 grid gap-4">
      {error && (
        <p className="rounded-xl bg-[#fbeaea] px-4 py-3 text-sm font-semibold text-[#a13f3f]">
          {error}
        </p>
      )}

      <label className="grid gap-2 text-sm font-semibold text-[#0B1D3A]">
        Email
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          className="rounded-xl border bg-white px-4 py-3 text-sm font-normal text-[#0B1D3A] outline-none placeholder:text-[#64748B] focus:border-[#0F766E]"
        />
      </label>

      <button
        type="submit"
        disabled={loading}
        className="mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-[#0B1D3A] px-6 py-3.5 text-sm font-bold text-white transition hover:bg-[#115E59] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Sending…
          </>
        ) : (
          <>
            Send reset link
            <ArrowRight size={16} />
          </>
        )}
      </button>

      <p className="mt-2 text-center text-sm text-[#64748B]">
        <Link href="/login" className="font-bold text-[#0F766E]">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
