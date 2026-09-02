"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Check, Clipboard, CreditCard, Loader2, Smartphone, WalletCards } from "lucide-react";
import { MANUAL_PAYMENT_OPTIONS, SUPPORT_WHATSAPP_NUMBER, TRANSACTION_FEE_USD } from "@/constants/manual-payment";
import { siteConfig } from "@/config/site";
import { getRecaptchaToken } from "@/lib/recaptcha-client";
import type { Cart } from "@/types/domain";

type Props = {
  cart: Cart;
  exchangeRate: number;
  totalPkr: number;
};

type PaymentMethod = "jazzcash" | "safepay";

function ManualPaymentProofForm({ orderId }: { orderId: string }) {
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [proof, setProof] = useState<File | null>(null);

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      let body: BodyInit;
      if (proof) { const form = new FormData(); form.append("transactionReference", reference); form.append("proof", proof); body = form; }
      else body = JSON.stringify({ transactionReference: reference });
      const response = await fetch(`/api/orders/${orderId}/manual-payment${proof ? "/proof" : ""}`, { method: "POST", headers: proof ? undefined : { "Content-Type": "application/json" }, body });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "Payment proof could not be submitted.");
      setSubmitted(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Payment proof could not be submitted.");
    } finally {
      setLoading(false);
    }
  }

  return <div className="mt-4 rounded-2xl border bg-white p-4"><p className="text-sm font-bold text-[#0B1D3A]">Payment proof</p>{submitted ? <p className="mt-2 text-sm text-[#2563EB]">Transaction reference submitted. Support can now verify your payment.</p> : <><label className="mt-3 block text-sm font-semibold">JazzCash transaction ID<input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="e.g. 123456789" className="mt-2 w-full rounded-xl border px-4 py-3 font-normal outline-none focus:border-[#2563EB]" /></label><label className="mt-3 block text-sm font-semibold">Screenshot or receipt <span className="font-normal text-[#64748B]">(optional)</span><input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(event) => setProof(event.target.files?.[0] ?? null)} className="mt-2 block w-full text-sm font-normal" /></label><button type="button" disabled={loading || reference.trim().length < 3} onClick={submit} className="mt-3 rounded-full bg-[#2563EB] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{loading ? "Submitting..." : "Submit proof"}</button>{error && <p className="mt-2 text-sm text-red-700">{error}</p>}</>}</div>;
}

export function CheckoutOptions({ cart, exchangeRate, totalPkr }: Props) {
  const requiresShipping = useMemo(() => cart.items.some((item) => ["physical", "book"].includes(item.productType)), [cart.items]);
  // Mirrors OrderService.createFromCart: one order = one parcel, priced at
  // the single highest delivery fee among shippable items in the cart.
  const deliveryMinor = useMemo(() => {
    const shippable = cart.items.filter((item) => ["physical", "book"].includes(item.productType));
    return shippable.length ? Math.max(...shippable.map((item) => item.deliveryFeeMinor)) : 0;
  }, [cart.items]);
  const [country, setCountry] = useState("PK");
  const [customerPhone, setCustomerPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [line1, setLine1] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("jazzcash");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState("");
  const [cardError, setCardError] = useState<string | null>(null);
  const [cardLoading, setCardLoading] = useState(false);
  const [walletOrderNumber, setWalletOrderNumber] = useState<string | null>(null);
  const [walletOrderId, setWalletOrderId] = useState<string | null>(null);
  const [walletOrderLoading, setWalletOrderLoading] = useState(false);
  const [walletOrderError, setWalletOrderError] = useState<string | null>(null);
  const wallet = MANUAL_PAYMENT_OPTIONS[0];

  useEffect(() => {
    if (country !== "PK" || method !== "jazzcash") {
      setQrDataUrl(null);
      return;
    }

    const controller = new AbortController();
    setQrDataUrl(null);
    setQrError(null);
    // A stale order tied to a previous total/cart snapshot must not be
    // reused once the amount being scanned changes.
    setWalletOrderNumber(null);
    setWalletOrderId(null);
    setWalletOrderError(null);
    fetch(`/api/payments/jazzcash-qr?amount=${totalPkr}`, { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json() as { qrDataUrl?: string; error?: string };
        if (!response.ok || !data.qrDataUrl) throw new Error(data.error || "QR code could not be generated.");
        setQrDataUrl(data.qrDataUrl);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setQrError(error instanceof Error ? error.message : "QR code could not be generated.");
      });

    return () => controller.abort();
  }, [country, method, totalPkr]);

  const amountLabel = useMemo(() => `PKR ${new Intl.NumberFormat("en-PK").format(totalPkr)}`, [totalPkr]);
  const whatsappHref = `https://wa.me/${SUPPORT_WHATSAPP_NUMBER.replace(/\D/g, "")}?text=${encodeURIComponent(
    walletOrderNumber
      ? `JazzCash payment sent for order ${walletOrderNumber}, ${amountLabel}. My registered email is ${email}. Here is the transaction screenshot:`
      : `JazzCash payment for ${amountLabel}. My registered email is `,
  )}`;

  async function copyNumber() {
    try {
      await navigator.clipboard.writeText(wallet.number);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  async function confirmWalletPayment() {
    if (!email) { setWalletOrderError("Enter the email you want this order registered under."); return; }
    if (!customerPhone) { setWalletOrderError("Enter a phone number so we can reach you about this order."); return; }
    if (requiresShipping && (!fullName || !phone || !line1 || !city || !postalCode)) { setWalletOrderError("Enter your complete shipping address, including the city code / postal code."); return; }
    setWalletOrderError(null);
    setWalletOrderLoading(true);
    try {
      const recaptchaToken = await getRecaptchaToken("checkout");
      const response = await fetch("/api/checkout/jazzcash", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({ cartId: cart.id, customerEmail: email, customerPhone, recaptchaToken: recaptchaToken ?? undefined, ...(requiresShipping ? { shippingAddress: { fullName, phone, line1, city, postalCode, country: "PK" } } : {}) }),
      });
      const data = await response.json() as { orderId?: string; orderNumber?: string; error?: string };
      if (!response.ok || !data.orderNumber) throw new Error(data.error || "Order could not be recorded.");
      setWalletOrderNumber(data.orderNumber);
      setWalletOrderId(data.orderId ?? null);
    } catch (error) {
      setWalletOrderError(error instanceof Error ? error.message : "Order could not be recorded.");
    } finally {
      setWalletOrderLoading(false);
    }
  }

  async function startCardCheckout() {
    if (!customerPhone) { setCardError("Enter a phone number so we can reach you about this order."); return; }
    if (requiresShipping && (!fullName || !phone || !line1 || !city || !postalCode)) { setCardError("Enter your complete shipping address, including the city code / postal code."); return; }
    setCardError(null);
    setCardLoading(true);
    try {
      const recaptchaToken = await getRecaptchaToken("checkout");
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({ cartId: cart.id, customerEmail: email, customerPhone, recaptchaToken: recaptchaToken ?? undefined, ...(requiresShipping ? { shippingAddress: { fullName, phone, line1, city, postalCode, country: country.length === 2 ? country : "PK" } } : {}) }),
      });
      const data = await response.json() as { session?: { checkoutUrl?: string }; error?: string };
      if (!response.ok) throw new Error(data.error || "Card checkout could not be started.");
      if (data.session?.checkoutUrl) window.location.assign(data.session.checkoutUrl);
      else throw new Error("Card checkout did not return a checkout URL.");
    } catch (error) {
      setCardError(error instanceof Error ? error.message : "Card checkout could not be started.");
    } finally {
      setCardLoading(false);
    }
  }

  return <div className="grid gap-8 lg:grid-cols-[1fr_.8fr]">
    <section className="rounded-[2rem] border bg-white p-6 shadow-sm sm:p-8">
      <div className="flex items-start justify-between gap-5">
        <div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#2563EB]">Payment details</p><h1 className="display-font mt-2 text-4xl text-[#0B1D3A]">Choose how to pay.</h1></div>
        <WalletCards className="text-[#2563EB]" size={28}/>
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-bold text-[#0B1D3A]">Billing country<select value={country} onChange={(event) => { setCountry(event.target.value); if (event.target.value !== "PK") setMethod("safepay"); }} className="mt-2 w-full rounded-xl border bg-white px-4 py-3 font-normal outline-none focus:border-[#2563EB]"><option value="PK">Pakistan</option><option value="AE">United Arab Emirates</option><option value="US">United States</option><option value="OTHER">Other</option></select></label>
        <label className="block text-sm font-bold text-[#0B1D3A]">Phone number<input type="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="03xx xxxxxxx" className="mt-2 w-full rounded-xl border bg-white px-4 py-3 font-normal outline-none focus:border-[#2563EB]"/><span className="mt-1 block text-xs font-normal text-[#64748B]">So we can reach you about this order.</span></label>
      </div>
      {requiresShipping && <div className="mt-6 rounded-2xl border bg-[#F1F5F9] p-4"><p className="text-sm font-bold text-[#0B1D3A]">Shipping address</p><div className="mt-3 grid gap-3 sm:grid-cols-2"><input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name" className="rounded-xl border bg-white px-4 py-3"/><input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" className="rounded-xl border bg-white px-4 py-3"/><input value={line1} onChange={(e) => setLine1(e.target.value)} placeholder="Address" className="rounded-xl border bg-white px-4 py-3 sm:col-span-2"/><input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" className="rounded-xl border bg-white px-4 py-3"/><input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="City code / postal code" className="rounded-xl border bg-white px-4 py-3"/></div></div>}
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {country === "PK" && <button type="button" onClick={() => setMethod("jazzcash")} className={`rounded-2xl border p-4 text-left ${method === "jazzcash" ? "border-[#2563EB] bg-[#DCFCE7]" : "bg-white"}`}><div className="flex items-center gap-3"><Smartphone size={19} className="text-[#2563EB]"/><span className="font-bold">Local wallet</span></div><p className="mt-2 text-sm text-[#64748B]">JazzCash QR · manual review</p></button>}
        <button type="button" onClick={() => setMethod("safepay")} className={`rounded-2xl border p-4 text-left ${method === "safepay" ? "border-[#2563EB] bg-[#DCFCE7]" : "bg-white"}`}><div className="flex items-center gap-3"><CreditCard size={19} className="text-[#2563EB]"/><span className="font-bold">Card checkout</span></div><p className="mt-2 text-sm text-[#64748B]">Secure Safepay checkout</p></button>
      </div>
      {method === "jazzcash" && country === "PK" ? <div className="mt-8 rounded-3xl bg-[#F1F5F9] p-5">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm text-[#64748B]">Send exactly</p><p className="mt-1 text-3xl font-black text-[#0B1D3A]">{amountLabel}</p></div><span className="rounded-full bg-[#2563EB] px-3 py-1 text-xs font-bold text-[#0B1D3A]">includes USD {TRANSACTION_FEE_USD.toFixed(2)} fee</span></div>
        <div className="mt-5 grid place-items-center rounded-2xl bg-white p-4"><div className="min-h-64 min-w-64 rounded-lg bg-white p-2">{qrDataUrl ? <><span className="sr-only">Payment QR code</span><Image src={qrDataUrl} alt={`JazzCash QR for ${amountLabel}`} width={256} height={256} unoptimized className="h-64 w-64"/></> : <div className="grid h-64 w-64 place-items-center text-center text-sm text-[#64748B]">{qrError ? qrError : <Loader2 className="animate-spin"/>}</div>}</div></div>
        <div className="mt-5 rounded-2xl border bg-white p-4"><p className="text-xs font-bold uppercase tracking-widest text-[#64748B]">JazzCash wallet</p><p className="mt-2 font-bold text-[#0B1D3A]">{wallet.accountName}</p><div className="mt-2 flex items-center justify-between gap-3"><span className="text-lg font-black tracking-wider text-[#2563EB]">{wallet.number}</span><button type="button" onClick={copyNumber} className="inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold">{copied ? <Check size={14}/> : <Clipboard size={14}/>} {copied ? "Copied" : "Copy"}</button></div></div>
        <p className="mt-5 text-sm leading-6 text-[#64748B]">After sending the payment, confirm below so we can register your order, then share the transaction screenshot with support. A team member will verify it manually and activate your order.</p>
        {!walletOrderNumber ? <div className="mt-4"><label className="block text-sm font-bold">Email for your order<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="mt-2 w-full rounded-xl border bg-white px-4 py-3 font-normal outline-none focus:border-[#2563EB]"/></label><button type="button" disabled={walletOrderLoading || !email} onClick={confirmWalletPayment} className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#0B1D3A] px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{walletOrderLoading && <Loader2 size={16} className="animate-spin"/>} I&apos;ve sent the payment</button>{walletOrderError && <p className="mt-3 text-sm text-red-700">{walletOrderError}</p>}</div> : <div className="mt-4"><p className="rounded-2xl border border-[#2563EB]/30 bg-white px-4 py-3 text-sm font-bold text-[#0B1D3A]"><Check size={14} className="mr-2 inline text-[#2563EB]"/>Order {walletOrderNumber} recorded — now send proof on WhatsApp.</p><a href={whatsappHref} target="_blank" rel="noreferrer" className="mt-4 inline-flex rounded-full bg-[#0B1D3A] px-5 py-3 text-sm font-bold text-white">Send proof on WhatsApp</a></div>}
      </div> : <div className="mt-8 rounded-3xl bg-[#F1F5F9] p-5"><label className="block text-sm font-bold">Email for your order<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="mt-2 w-full rounded-xl border bg-white px-4 py-3 font-normal outline-none focus:border-[#2563EB]"/></label><button type="button" disabled={cardLoading || !email} onClick={startCardCheckout} className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#0B1D3A] px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{cardLoading && <Loader2 size={16} className="animate-spin"/>} Continue with card</button>{cardError && <p className="mt-3 text-sm text-red-700">{cardError}</p>}</div>}
      <p className="mt-6 text-xs leading-5 text-[#64748B]">Need help? Email <a className="font-bold text-[#2563EB]" href={`mailto:${siteConfig.supportEmail}`}>{siteConfig.supportEmail}</a>.</p>
    </section>
    {walletOrderId && <ManualPaymentProofForm orderId={walletOrderId} />}
    <aside className="h-fit rounded-[2rem] border bg-[#0B1D3A] p-6 text-white sm:p-8"><p className="text-xs font-bold uppercase tracking-[.2em] text-[#2563EB]">Your order</p><div className="mt-6 grid gap-4">{cart.items.map((item) => <div key={item.id} className="flex justify-between gap-4 text-sm"><span className="text-[#B9C4E0]">{item.productTitle} × {item.quantity}</span><span className="font-bold">{item.unitPrice.currency} {(item.unitPrice.amountMinor * item.quantity / 100).toFixed(2)}</span></div>)}{requiresShipping && <div className="flex justify-between gap-4 text-sm"><span className="text-[#B9C4E0]">Delivery</span><span className="font-bold">{deliveryMinor ? `${cart.subtotal.currency} ${(deliveryMinor / 100).toFixed(2)}` : "Free"}</span></div>}</div><div className="mt-6 border-t border-white/20 pt-5"><div className="flex justify-between text-sm text-[#B9C4E0]"><span>Wallet total</span><span>PKR</span></div><div className="mt-2 text-3xl font-black">{new Intl.NumberFormat("en-PK").format(totalPkr)}</div><p className="mt-3 text-xs leading-5 text-[#B9C4E0]">USD 1 = PKR {exchangeRate.toFixed(2)}. The wallet total includes the flat processing fee.</p></div></aside>
  </div>;
}
