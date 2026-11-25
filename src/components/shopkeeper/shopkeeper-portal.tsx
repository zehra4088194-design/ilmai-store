"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Check, Clipboard, Download, Loader2, LogOut, Printer, QrCode, ShieldCheck, Store } from "lucide-react";
import type { ShopkeeperStatus } from "@/constants/shopkeeper";

type Account = {
  displayName: string;
  jazzcashNumber: string;
  receivingIdentifier: string | null;
  receivingIdentifierVerified: boolean;
  status: ShopkeeperStatus;
};

export function ShopkeeperPortal({ account, email }: { account: Account | null; email: string }) {
  const router = useRouter();
  const [amount, setAmount] = useState("100");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [savingAccount, setSavingAccount] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [accountNotice, setAccountNotice] = useState<string | null>(null);
  const [jazzcashNumber, setJazzcashNumber] = useState(account?.jazzcashNumber === "PENDING1" ? "" : account?.jazzcashNumber ?? "");
  const [receivingIdentifier, setReceivingIdentifier] = useState(account?.receivingIdentifier ?? "");
  const sequence = useRef(0);

  useEffect(() => {
    const current = ++sequence.current;
    if (account?.status !== "active" || !account.receivingIdentifierVerified) {
      setQrDataUrl(null);
      setLoading(false);
      return;
    }
    const value = Number(amount);
    if (!/^\d+$/.test(amount) || !Number.isSafeInteger(value) || value <= 0) {
      setQrDataUrl(null);
      setLoading(false);
      setError("Enter a positive whole-rupee amount.");
      return;
    }

    const controller = new AbortController();
    setQrDataUrl(null);
    setError(null);
    const timer = window.setTimeout(() => {
      setLoading(true);
      fetch("/api/shopkeeper/qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: value }),
        signal: controller.signal,
      }).then(async (response) => {
        const result = await response.json() as { qrDataUrl?: string; error?: string };
        if (!response.ok || !result.qrDataUrl) throw new Error(result.error || "QR could not be generated.");
        if (sequence.current === current) setQrDataUrl(result.qrDataUrl);
      }).catch((reason: unknown) => {
        if (!controller.signal.aborted && sequence.current === current) setError(reason instanceof Error ? reason.message : "QR could not be generated.");
      }).finally(() => {
        if (sequence.current === current) setLoading(false);
      });
    }, 220);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [account?.status, account?.receivingIdentifierVerified, amount]);

  async function copyNumber() {
    if (!account) return;
    try {
      await navigator.clipboard.writeText(account.jazzcashNumber);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("Could not copy the JazzCash number. Please copy it manually.");
    }
  }

  async function submitReceivingDetails(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingAccount(true);
    setAccountError(null);
    setAccountNotice(null);

    try {
      const response = await fetch("/api/shopkeeper/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jazzcashNumber, receivingIdentifier }),
      });
      const result = await response.json() as { error?: string; message?: string };
      if (!response.ok) throw new Error(result.error || "JazzCash details could not be saved.");
      setAccountNotice(result.message || "Details submitted for admin verification.");
      router.refresh();
    } catch (reason) {
      setAccountError(reason instanceof Error ? reason.message : "JazzCash details could not be saved.");
    } finally {
      setSavingAccount(false);
    }
  }

  async function changePassword() {
    const nextPassword = window.prompt("Enter a new password (at least 10 characters):");
    if (!nextPassword) return;
    if (nextPassword.length < 10) {
      setAccountError("Your password must be at least 10 characters.");
      return;
    }
    const { error: updateError } = await createSupabaseBrowserClient().auth.updateUser({ password: nextPassword });
    if (updateError) setAccountError(updateError.message);
    else setAccountNotice("Password updated successfully.");
  }

  const active = account?.status === "active" && account.receivingIdentifierVerified;
  const needsReceivingDetails = Boolean(account && (account.jazzcashNumber === "PENDING1" || !account.receivingIdentifier));

  return (
    <main className="min-h-screen bg-[#F1F5F9] text-[#0B1D3A]">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3 font-black">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#0F766E] text-lg text-white">i</span>
            <span>IlmAI Pay <span className="block text-[10px] font-bold uppercase tracking-widest text-[#64748B]">Merchant portal</span></span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block"><p className="text-xs font-bold text-[#64748B]">{account?.displayName ?? email}</p><p className="text-xs text-[#64748B]">{account?.jazzcashNumber === "PENDING1" ? "JazzCash details pending" : account?.jazzcashNumber ?? email}</p></div>
            <form action="/auth/logout" method="post"><button type="submit" aria-label="Sign out" className="inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 text-xs font-bold"><LogOut size={15} /> Sign out</button></form>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-7 sm:px-6 sm:py-10">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div><p className="flex items-center gap-2 text-xs font-black uppercase tracking-[.16em] text-[#0F766E]"><Store size={14} /> Merchant payments</p><h1 className="display-font mt-2 text-3xl font-black sm:text-4xl">{account?.displayName ?? "Merchant portal"}</h1><p className="mt-2 text-sm text-[#64748B]">Enter an amount and show the fresh QR code to your customer.</p></div>
          <span className={`rounded-full px-3 py-1.5 text-xs font-black ${active ? "bg-[#DCFCE7] text-[#047857]" : "bg-[#FEF3C7] text-[#92400E]"}`}>{active ? "Active" : account?.status.replaceAll("_", " ") ?? "Not provisioned"}</span>
        </div>

        {!account ? (
          <section className="rounded-3xl border bg-white p-8 text-center shadow-sm"><ShieldCheck size={32} className="mx-auto text-[#0F766E]" /><h2 className="mt-4 text-xl font-black">Merchant access has not been set up</h2><p className="mt-2 text-sm text-[#64748B]">Ask an IlmAI Pay administrator to create your merchant login.</p><Link href="/login" className="gold-btn mt-6 min-h-11 px-6">Sign in</Link></section>
        ) : !active ? (
          <div className="grid gap-6 lg:grid-cols-[1fr_.72fr]">
            <section className="rounded-3xl border bg-white p-6 shadow-sm sm:p-8">
              <ShieldCheck size={30} className="text-amber-700" />
              <h2 className="mt-4 text-xl font-black">{needsReceivingDetails ? "Set up your JazzCash receiving account" : "JazzCash verification pending"}</h2>
              <p className="mt-2 text-sm leading-6 text-[#64748B]">
                {needsReceivingDetails
                  ? "Add the JazzCash number and exact receiving identifier issued for your own merchant account. The IlmAI administrator will verify them before QR generation is enabled."
                  : "Your JazzCash details have been submitted. The IlmAI administrator must verify the receiving identifier before QR generation is enabled."}
              </p>
              {needsReceivingDetails && (
                <form onSubmit={submitReceivingDetails} className="mt-6 grid gap-4">
                  <label className="grid gap-2 text-xs font-bold">JazzCash mobile / merchant number
                    <input required value={jazzcashNumber} onChange={(event) => setJazzcashNumber(event.target.value)} placeholder="03XX XXXXXXX" className="rounded-xl border px-4 py-3 text-sm font-normal" />
                  </label>
                  <label className="grid gap-2 text-xs font-bold">JazzCash-issued receiving identifier
                    <input required value={receivingIdentifier} onChange={(event) => setReceivingIdentifier(event.target.value)} placeholder="Exact merchant receiving ID" className="rounded-xl border px-4 py-3 font-mono text-sm font-normal" />
                  </label>
                  {accountError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{accountError}</p>}
                  {accountNotice && <p role="status" className="rounded-xl bg-[#E6F4F1] p-3 text-sm font-semibold text-[#0F766E]">{accountNotice}</p>}
                  <button type="submit" disabled={savingAccount} className="gold-btn min-h-11 px-5 text-sm">{savingAccount ? <Loader2 size={15} className="animate-spin" /> : null} Submit for verification</button>
                </form>
              )}
              {!needsReceivingDetails && accountError && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{accountError}</p>}
              {!needsReceivingDetails && accountNotice && <p role="status" className="mt-4 rounded-xl bg-[#E6F4F1] p-3 text-sm font-semibold text-[#0F766E]">{accountNotice}</p>}
              <button type="button" onClick={() => void changePassword()} className="mt-5 text-xs font-bold text-[#0F766E] underline">Change login password</button>
            </section>
            <aside className="h-fit rounded-3xl border bg-white p-6 shadow-sm">
              <p className="text-xs font-black uppercase tracking-widest text-[#64748B]">Your shop</p>
              <p className="mt-2 text-xl font-black">{account.displayName}</p>
              <p className="mt-4 text-xs leading-5 text-[#64748B]">QR payments stay disabled until your own JazzCash receiving details are verified by IlmAI.</p>
            </aside>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_.72fr]">
            <section id="merchant-qr-print" className="rounded-3xl border bg-white p-5 shadow-sm sm:p-8">
              <p className="text-xs font-black uppercase tracking-[.12em] text-[#64748B] print:hidden">Amount to collect</p>
              <h2 className="mt-1 text-lg font-black print:hidden">QR updates as you type</h2>
              <label className="mt-5 flex items-center rounded-2xl border-2 border-[#0F766E]/25 bg-[#F8FAFC] px-4 focus-within:border-[#0F766E] print:hidden">
                <span className="mr-3 text-lg font-black text-[#0F766E]">Rs.</span>
                <input aria-label="Payment amount in whole rupees" inputMode="numeric" autoComplete="off" value={amount} onChange={(event) => setAmount(event.target.value)} className="min-w-0 flex-1 bg-transparent py-4 text-3xl font-black outline-none sm:text-4xl" />
              </label>
              <div className="mt-4 flex flex-wrap gap-2 print:hidden">{[100, 250, 500, 1000].map((value) => <button key={value} type="button" onClick={() => setAmount(String(value))} className="rounded-full border px-4 py-2 text-xs font-bold hover:border-[#0F766E]">Rs. {value.toLocaleString("en-PK")}</button>)}</div>
              <div className="mt-6 grid min-h-[320px] place-items-center rounded-3xl bg-[#F1F5F9] p-5">
                {loading ? <div className="text-center text-sm font-semibold text-[#64748B]"><Loader2 size={30} className="mx-auto animate-spin text-[#0F766E]" /><span className="mt-3 block">Preparing payment QR…</span></div>
                  : error ? <p role="alert" className="max-w-sm text-center text-sm font-semibold text-red-700">{error}</p>
                  : qrDataUrl ? <div className="text-center"><p className="mb-2 text-sm font-bold text-[#64748B]">Scan to pay <span className="text-[#0B1D3A]">Rs. {Number(amount).toLocaleString("en-PK")}</span></p><Image src={qrDataUrl} alt={`JazzCash payment QR for Rs. ${amount}`} width={800} height={800} unoptimized className="mx-auto aspect-square w-64 rounded-xl bg-white p-3 sm:w-80 print:w-[360px]" /><p className="mt-3 text-base font-black text-[#0B1D3A]">{account.displayName}</p><p className="mt-1 text-xs font-bold text-[#64748B]">JazzCash · Expires 11:59 PM Pakistan time</p><p className="mt-1 text-[10px] font-semibold text-[#64748B]">Powered by IlmAI Pay</p></div>
                  : <div className="text-center text-sm font-semibold text-[#64748B]"><QrCode size={38} className="mx-auto text-[#0F766E]" /><p className="mt-3">Your payment QR will appear here.</p></div>}
              </div>
              <div className="mt-5 flex flex-wrap gap-3 print:hidden">
                {qrDataUrl && <a download={`jazzcash-qr-${amount}.png`} href={qrDataUrl} className="gold-btn min-h-11 px-4 text-sm"><Download size={15} /> Download QR</a>}
                <button type="button" onClick={() => window.print()} disabled={!qrDataUrl} className="inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 text-sm font-bold disabled:opacity-40"><Printer size={15} /> Print</button>
                <button type="button" onClick={() => void changePassword()} className="inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 text-sm font-bold">Change password</button>
              </div>
            </section>

            <aside className="h-fit rounded-3xl border bg-white p-5 shadow-sm sm:p-7 print:hidden">
              <p className="text-xs font-black uppercase tracking-[.12em] text-[#0F766E]">Your receiving account</p>
              <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-[#F1F5F9] p-4">
                <div><p className="text-xs font-bold uppercase tracking-wide text-[#64748B]">JazzCash number</p><p className="mt-1 text-lg font-black tracking-wide">{account.jazzcashNumber}</p></div>
                <button type="button" onClick={copyNumber} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border bg-white" aria-label="Copy JazzCash number">{copied ? <Check size={17} /> : <Clipboard size={17} />}</button>
              </div>
              {copied && <p className="mt-2 text-xs font-bold text-[#047857]">Number copied</p>}
              <div className="mt-5 rounded-2xl border border-[#0F766E]/15 p-4 text-xs leading-5 text-[#64748B]">
                <p className="flex items-center gap-2 font-black text-[#0B1D3A]"><ShieldCheck size={15} /> Merchant identity verified</p>
                <p className="mt-2">This QR is generated for your own verified JazzCash merchant receiving ID. Customer payments are intended for your merchant account.</p>
              </div>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
