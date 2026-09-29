"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Check, Clipboard, Download, ExternalLink, Loader2, Printer, QrCode, ShieldCheck, Store } from "lucide-react";
import type { ShopkeeperStatus } from "@/constants/shopkeeper";

type ShopkeeperView = {
  businessName: string | null;
  jazzcashNumber: string | null;
  jazzcashAccountName: string | null;
  status: ShopkeeperStatus;
  orderPaid: boolean;
};

export function ShopkeeperPortal({ account, email }: { account: ShopkeeperView | null; email: string }) {
  const router = useRouter();
  const [amount, setAmount] = useState("100");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(!account?.businessName);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const requestSequence = useRef(0);

  useEffect(() => {
    if (!account || account.status !== "active" || !account.orderPaid) return;
    const sequence = ++requestSequence.current;
    const value = Number(amount);
    if (!/^\d+$/.test(amount) || !Number.isSafeInteger(value) || value <= 0) {
      setQrDataUrl(null);
      setQrLoading(false);
      setQrError("Enter a positive whole-rupee amount.");
      return;
    }

    const controller = new AbortController();
    setQrDataUrl(null);
    setQrError(null);
    const timer = window.setTimeout(() => {
      setQrLoading(true);
      fetch("/api/shopkeeper/qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: value }),
        signal: controller.signal,
      }).then(async (response) => {
        const data = await response.json() as { qrDataUrl?: string; error?: string };
        if (!response.ok || !data.qrDataUrl) throw new Error(data.error || "QR could not be generated.");
        if (requestSequence.current === sequence) setQrDataUrl(data.qrDataUrl);
      }).catch((error: unknown) => {
        if (!controller.signal.aborted && requestSequence.current === sequence) {
          setQrError(error instanceof Error ? error.message : "QR could not be generated.");
        }
      }).finally(() => {
        if (requestSequence.current === sequence) setQrLoading(false);
      });
    }, 200);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [account, amount]);

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileSaving(true);
    setProfileError(null);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/shopkeeper/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: form.get("businessName"),
          jazzcashNumber: form.get("jazzcashNumber"),
          jazzcashAccountName: form.get("jazzcashAccountName"),
        }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "Shop details could not be saved.");
      setProfileOpen(false);
      router.refresh();
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Shop details could not be saved.");
    } finally {
      setProfileSaving(false);
    }
  }

  async function copyNumber() {
    if (!account?.jazzcashNumber) return;
    try {
      await navigator.clipboard.writeText(account.jazzcashNumber);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setProfileError("Could not copy the JazzCash number. Please select and copy it manually.");
    }
  }

  const active = account?.status === "active" && account.orderPaid;

  return (
    <main className="min-h-screen bg-[#F1F5F9] text-[#0B1D3A]">
      <header className="border-b border-[#0B1D3A]/10 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/store" className="flex items-center gap-2 font-black"><span className="text-xl">IlmAI</span><span className="rounded-md bg-[#0F766E] px-2 py-1 text-[10px] uppercase text-white">.store</span></Link>
          <div className="text-right"><p className="text-xs font-bold text-[#64748B]">{account?.businessName || "Shopkeeper portal"}</p><p className="mt-0.5 max-w-48 truncate text-xs font-semibold">{email}</p></div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-7 sm:px-6 sm:py-10">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div><p className="flex items-center gap-2 text-xs font-black uppercase tracking-[.16em] text-[#0F766E]"><Store size={14} /> Shopkeeper payments</p><h1 className="display-font mt-2 text-3xl sm:text-4xl">Dynamic JazzCash QR</h1></div>
          <span className={`rounded-full px-3 py-1.5 text-xs font-black ${active ? "bg-[#DCFCE7] text-[#047857]" : "bg-[#FEF3C7] text-[#92400E]"}`}>{active ? "Account active" : account?.status.replaceAll("_", " ") ?? "Service not purchased"}</span>
        </div>

        {!account ? (
          <section className="rounded-3xl border bg-white p-7 text-center shadow-sm sm:p-12">
            <QrCode size={38} className="mx-auto text-[#0F766E]" /><h2 className="mt-4 text-2xl font-black">Purchase your shopkeeper QR service</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#64748B]">Sign in with the account used for your purchase. Portal access is created only after IlmAI Store verifies payment for the Dynamic JazzCash QR service.</p>
            <Link href="/store?search=JazzCash" className="gold-btn mt-6 inline-flex min-h-12 px-6">Find the service in the store</Link>
          </section>
        ) : !account.orderPaid || account.status === "suspended" || account.status === "revoked" ? (
          <section role="status" className="rounded-3xl border border-amber-200 bg-white p-7 shadow-sm sm:p-10">
            <ShieldCheck size={30} className="text-amber-700" /><h2 className="mt-4 text-xl font-black">QR generation is unavailable</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[#64748B]">{!account.orderPaid ? "The purchase linked to this account is not currently paid." : account.status === "suspended" ? "This shopkeeper account is suspended. Contact IlmAI Store support if you believe this is an error." : "Service access was revoked or refunded."}</p>
          </section>
        ) : account.status !== "active" ? (
          <section className="rounded-3xl border bg-white p-6 shadow-sm sm:p-9">
            <div className="max-w-2xl"><h2 className="text-xl font-black">One quick setup before your first QR</h2><p className="mt-2 text-sm leading-6 text-[#64748B]">Add your shop and JazzCash account details. IlmAI Store will match them to your provider-issued merchant receiving ID before QR generation is enabled.</p></div>
            <ProfileForm account={account} saving={profileSaving} error={profileError} onSubmit={saveProfile} />
            <p className="mt-5 text-xs leading-5 text-[#64748B]">Your phone number is shown to customers for confirmation; it is not converted into a JazzCash merchant ID.</p>
          </section>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_.85fr]">
            <section id="merchant-qr-print" className="rounded-3xl border bg-white p-5 shadow-sm sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3 print:hidden"><div><p className="text-xs font-black uppercase tracking-[.12em] text-[#64748B]">Amount to collect</p><h2 className="mt-1 text-lg font-black">Enter amount — QR updates automatically</h2></div><span className="rounded-full bg-[#ECFDF5] px-3 py-1.5 text-xs font-bold text-[#047857]">JazzCash · PKR</span></div>
              <label className="mt-5 flex items-center rounded-2xl border-2 border-[#0F766E]/25 bg-[#F8FAFC] px-4 focus-within:border-[#0F766E] sm:px-5"><span className="mr-3 text-lg font-black text-[#0F766E]">Rs.</span><input aria-label="Payment amount in whole rupees" inputMode="numeric" autoComplete="off" value={amount} onChange={(event) => setAmount(event.target.value)} className="min-w-0 flex-1 bg-transparent py-4 text-3xl font-black outline-none sm:text-4xl" /></label>
              <div className="mt-4 flex flex-wrap gap-2 print:hidden">{[100, 250, 500, 1000].map((value) => <button key={value} type="button" onClick={() => setAmount(String(value))} className="rounded-full border px-4 py-2 text-xs font-bold hover:border-[#0F766E]">Rs. {value.toLocaleString("en-PK")}</button>)}</div>
              <div className="mt-6 grid min-h-[320px] place-items-center rounded-3xl bg-[#F1F5F9] p-5 sm:min-h-[390px]">
                {qrLoading ? <div className="text-center text-sm font-semibold text-[#64748B]"><Loader2 size={30} className="mx-auto animate-spin text-[#0F766E]" /><span className="mt-3 block">Preparing secure payment QR…</span></div>
                  : qrError ? <p role="alert" className="max-w-sm text-center text-sm font-semibold text-red-700">{qrError}</p>
                    : qrDataUrl ? <div className="text-center"><p className="mb-2 text-sm font-bold text-[#64748B] print:hidden">Scan to pay <span className="text-[#0B1D3A]">Rs. {Number(amount).toLocaleString("en-PK")}</span></p><Image src={qrDataUrl} alt={`JazzCash payment QR for Rs. ${amount}`} width={800} height={800} unoptimized className="mx-auto aspect-square w-64 rounded-xl bg-white p-3 sm:w-80 print:w-[360px]" /><p className="mt-3 text-xs font-bold text-[#64748B]">Rs. {Number(amount).toLocaleString("en-PK")} · JazzCash · Expires 11:59 PM Pakistan time</p><a href="https://ilmai.store" className="mt-2 inline-block text-[10px] font-semibold text-[#64748B]">Powered by IlmAI Store</a></div>
                      : <div className="text-center text-sm font-semibold text-[#64748B]"><QrCode size={38} className="mx-auto text-[#0F766E]" /><p className="mt-3">Your payment QR will appear here.</p></div>}
              </div>
              <div className="mt-5 flex flex-wrap gap-3 print:hidden">{qrDataUrl && <a download={`jazzcash-qr-${amount}.png`} href={qrDataUrl} className="gold-btn min-h-11 px-4 text-sm"><Download size={15} /> Download QR</a>}<button type="button" onClick={() => window.print()} disabled={!qrDataUrl} className="inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 text-sm font-bold disabled:opacity-40"><Printer size={15} /> Print</button></div>
            </section>

            <aside className="h-fit rounded-3xl border bg-white p-5 shadow-sm sm:p-7 print:hidden">
              <p className="text-xs font-black uppercase tracking-[.12em] text-[#0F766E]">Receiving account</p><h2 className="mt-2 text-xl font-black">{account.businessName}</h2>
              <div className="mt-5 rounded-2xl bg-[#F1F5F9] p-4"><p className="text-xs font-bold uppercase tracking-wide text-[#64748B]">JazzCash account name</p><p className="mt-1 font-bold">{account.jazzcashAccountName || "Not configured"}</p><div className="mt-4 flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-[#64748B]">JazzCash number</p><p className="mt-1 text-lg font-black tracking-wide">{account.jazzcashNumber || "Not configured"}</p></div><button type="button" onClick={copyNumber} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border bg-white" aria-label="Copy JazzCash number">{copied ? <Check size={17} /> : <Clipboard size={17} />}</button></div>{copied && <p className="mt-2 text-xs font-bold text-[#047857]">Number copied</p>}</div>
              <button type="button" onClick={() => setProfileOpen((open) => !open)} className="mt-4 text-xs font-bold text-[#0F766E] underline">Edit shop details</button>
              {profileOpen && <ProfileForm account={account} saving={profileSaving} error={profileError} onSubmit={saveProfile} />}
              <div className="mt-5 rounded-2xl border border-[#0F766E]/15 p-4 text-xs leading-5 text-[#64748B]"><p className="flex items-center gap-2 font-black text-[#0B1D3A]"><ShieldCheck size={15} className="text-[#0F766E]" /> Private to your verified account</p><p className="mt-2">Each QR is built from the JazzCash merchant identifier verified for your shop. Your QR requests are not Store orders or payment confirmations.</p></div>
            </aside>
          </div>
        )}

        <footer className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t pt-5 text-xs text-[#64748B] print:hidden"><span>Signed in as {email}</span><Link href="https://ilmai.store" className="inline-flex items-center gap-1 font-bold text-[#0F766E]">IlmAI Store <ExternalLink size={12} /></Link></footer>
      </div>
      <style jsx global>{`@media print { body * { visibility: hidden !important; } #merchant-qr-print, #merchant-qr-print * { visibility: visible !important; } #merchant-qr-print { position: fixed; inset: 0; display: grid; align-content: center; border: 0; box-shadow: none; } }`}</style>
    </main>
  );
}

function ProfileForm({ account, saving, error, onSubmit }: { account: ShopkeeperView; saving: boolean; error: string | null; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void }) {
  return <form onSubmit={onSubmit} className="mt-5 grid gap-3 sm:grid-cols-2">
    <label className="text-xs font-bold">Business name<input required minLength={2} maxLength={120} name="businessName" defaultValue={account.businessName ?? ""} className="mt-1.5 w-full rounded-xl border px-3 py-3 text-sm font-normal" /></label>
    <label className="text-xs font-bold">JazzCash number<input required name="jazzcashNumber" defaultValue={account.jazzcashNumber ?? ""} placeholder="03xx xxxxxxx" className="mt-1.5 w-full rounded-xl border px-3 py-3 text-sm font-normal" /></label>
    <label className="text-xs font-bold sm:col-span-2">Account holder name<input required minLength={2} maxLength={120} name="jazzcashAccountName" defaultValue={account.jazzcashAccountName ?? ""} className="mt-1.5 w-full rounded-xl border px-3 py-3 text-sm font-normal" /></label>
    {error && <p role="alert" className="text-sm font-semibold text-red-700 sm:col-span-2">{error}</p>}
    <button type="submit" disabled={saving} className="gold-btn min-h-11 px-4 text-sm sm:col-span-2">{saving && <Loader2 size={15} className="animate-spin" />}{saving ? "Saving…" : "Save account details"}</button>
  </form>;
}
