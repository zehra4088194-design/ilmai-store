"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Check, Clipboard, Download, ExternalLink, Loader2, Printer, QrCode, ShieldCheck, Store } from "lucide-react";
import type { ShopkeeperStatus } from "@/constants/shopkeeper";

type Account = { jazzcashNumber: string; status: ShopkeeperStatus };

export function ShopkeeperPortal({ account, email }: { account: Account | null; email: string }) {
  const [amount, setAmount] = useState("100");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const sequence = useRef(0);

  useEffect(() => {
    const current = ++sequence.current;
    if (account?.status !== "active") return;
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
    }, 200);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [account?.status, amount]);

  async function copyNumber() {
    if (!account) return;
    try {
      await navigator.clipboard.writeText(account.jazzcashNumber);
      setCopyError(null);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopyError("Could not copy the number. Please select and copy it manually.");
    }
  }

  const active = account?.status === "active";
  return <main className="min-h-screen bg-[#F1F5F9] text-[#0B1D3A]">
    <header className="border-b bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
      <Link href="https://ilmai.store" className="flex items-center gap-2 font-black"><span className="text-xl">IlmAI</span><span className="rounded-md bg-[#0F766E] px-2 py-1 text-[10px] uppercase text-white">.store</span></Link>
      <div className="text-right"><p className="text-xs font-bold text-[#64748B]">{account?.jazzcashNumber ?? "Shopkeeper QR portal"}</p><p className="mt-0.5 max-w-48 truncate text-xs font-semibold">{email}</p></div>
    </div></header>
    <div className="mx-auto max-w-6xl px-4 py-7 sm:px-6 sm:py-10">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="flex items-center gap-2 text-xs font-black uppercase tracking-[.16em] text-[#0F766E]"><Store size={14} /> Shopkeeper payments</p><h1 className="display-font mt-2 text-3xl sm:text-4xl">Dynamic JazzCash QR</h1></div>
        <span className={`rounded-full px-3 py-1.5 text-xs font-black ${active ? "bg-[#DCFCE7] text-[#047857]" : "bg-[#FEF3C7] text-[#92400E]"}`}>{account?.status.replaceAll("_", " ") ?? "Not provisioned"}</span>
      </div>
      {!account ? <section className="rounded-3xl border bg-white p-8 text-center shadow-sm"><ShieldCheck size={32} className="mx-auto text-[#0F766E]" /><h2 className="mt-4 text-xl font-black">Portal access has not been set up</h2><p className="mt-2 text-sm text-[#64748B]">Ask the IlmAI Store administrator to add your account email and JazzCash number.</p></section>
        : !active ? <section className="rounded-3xl border bg-white p-8 shadow-sm"><ShieldCheck size={30} className="text-amber-700" /><h2 className="mt-4 text-xl font-black">{account.status === "suspended" ? "Shopkeeper access is suspended" : "JazzCash identity verification is pending"}</h2><p className="mt-2 text-sm leading-6 text-[#64748B]">{account.status === "suspended" ? "Contact IlmAI Store support if you believe this is an error." : "The administrator must verify the JazzCash-issued receiving ID for your account before QR generation is enabled."}</p></section>
        : <div className="grid gap-6 lg:grid-cols-[1fr_.8fr]">
          <section id="merchant-qr-print" className="rounded-3xl border bg-white p-5 shadow-sm sm:p-8">
            <p className="text-xs font-black uppercase tracking-[.12em] text-[#64748B] print:hidden">Amount to collect</p><h2 className="mt-1 text-lg font-black print:hidden">Enter amount — QR updates automatically</h2>
            <label className="mt-5 flex items-center rounded-2xl border-2 border-[#0F766E]/25 bg-[#F8FAFC] px-4 focus-within:border-[#0F766E] print:hidden"><span className="mr-3 text-lg font-black text-[#0F766E]">Rs.</span><input aria-label="Payment amount in whole rupees" inputMode="numeric" autoComplete="off" value={amount} onChange={(event) => setAmount(event.target.value)} className="min-w-0 flex-1 bg-transparent py-4 text-3xl font-black outline-none sm:text-4xl" /></label>
            <div className="mt-4 flex flex-wrap gap-2 print:hidden">{[100, 250, 500, 1000].map((value) => <button key={value} type="button" onClick={() => setAmount(String(value))} className="rounded-full border px-4 py-2 text-xs font-bold hover:border-[#0F766E]">Rs. {value.toLocaleString("en-PK")}</button>)}</div>
            <div className="mt-6 grid min-h-[320px] place-items-center rounded-3xl bg-[#F1F5F9] p-5">
              {loading ? <div className="text-center text-sm font-semibold text-[#64748B]"><Loader2 size={30} className="mx-auto animate-spin text-[#0F766E]" /><span className="mt-3 block">Preparing payment QR…</span></div>
                : error ? <p role="alert" className="max-w-sm text-center text-sm font-semibold text-red-700">{error}</p>
                  : qrDataUrl ? <div className="text-center"><p className="mb-2 text-sm font-bold text-[#64748B] print:hidden">Scan to pay <span className="text-[#0B1D3A]">Rs. {Number(amount).toLocaleString("en-PK")}</span></p><Image src={qrDataUrl} alt={`JazzCash payment QR for Rs. ${amount}`} width={800} height={800} unoptimized className="mx-auto aspect-square w-64 rounded-xl bg-white p-3 sm:w-80 print:w-[360px]" /><p className="mt-3 text-xs font-bold text-[#64748B]">Rs. {Number(amount).toLocaleString("en-PK")} · JazzCash · Expires 11:59 PM Pakistan time</p><a href="https://ilmai.store" className="mt-2 inline-block text-[10px] font-semibold text-[#64748B]">Powered by IlmAI Store</a></div>
                    : <div className="text-center text-sm font-semibold text-[#64748B]"><QrCode size={38} className="mx-auto text-[#0F766E]" /><p className="mt-3">Your payment QR will appear here.</p></div>}
            </div>
            <div className="mt-5 flex flex-wrap gap-3 print:hidden">{qrDataUrl && <a download={`jazzcash-qr-${amount}.png`} href={qrDataUrl} className="gold-btn min-h-11 px-4 text-sm"><Download size={15} /> Download QR</a>}<button type="button" onClick={() => window.print()} disabled={!qrDataUrl} className="inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 text-sm font-bold disabled:opacity-40"><Printer size={15} /> Print</button></div>
          </section>
          <aside className="h-fit rounded-3xl border bg-white p-5 shadow-sm sm:p-7 print:hidden"><p className="text-xs font-black uppercase tracking-[.12em] text-[#0F766E]">Your JazzCash account</p><div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-[#F1F5F9] p-4"><div><p className="text-xs font-bold uppercase tracking-wide text-[#64748B]">Receiving number</p><p className="mt-1 text-lg font-black tracking-wide">{account.jazzcashNumber}</p></div><button type="button" onClick={copyNumber} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border bg-white" aria-label="Copy JazzCash number">{copied ? <Check size={17} /> : <Clipboard size={17} />}</button></div>{copied && <p className="mt-2 text-xs font-bold text-[#047857]">Number copied</p>}{copyError && <p role="alert" className="mt-2 text-xs font-semibold text-red-700">{copyError}</p>}<div className="mt-5 rounded-2xl border border-[#0F766E]/15 p-4 text-xs leading-5 text-[#64748B]"><p className="flex items-center gap-2 font-black text-[#0B1D3A]"><ShieldCheck size={15} className="text-[#0F766E]" /> Private to your account</p><p className="mt-2">Each QR uses the JazzCash-issued merchant ID verified by IlmAI Store for this account. QR generation is separate from Store orders and payments.</p></div></aside>
        </div>}
      <footer className="mt-7 flex justify-end border-t pt-5 text-xs text-[#64748B] print:hidden"><Link href="https://ilmai.store" className="inline-flex items-center gap-1 font-bold text-[#0F766E]">IlmAI Store <ExternalLink size={12} /></Link></footer>
    </div>
    <style jsx global>{`@media print { body * { visibility: hidden !important; } #merchant-qr-print, #merchant-qr-print * { visibility: visible !important; } #merchant-qr-print { position: fixed; inset: 0; display: grid; align-content: center; border: 0; box-shadow: none; } }`}</style>
  </main>;
}
