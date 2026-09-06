"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { SUPPORTED_CURRENCIES, type SupportedCurrency } from "@/constants/order";

export function CouponForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed_amount">("percentage");
  const [discountValue, setDiscountValue] = useState("10");
  const [currency, setCurrency] = useState<SupportedCurrency>("PKR");
  const [minOrderMinor, setMinOrderMinor] = useState("0");
  const [message, setMessage] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("Saving...");
    const response = await fetch("/api/admin/coupons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: code.toUpperCase(), discountType, discountValue: Number(discountValue), currency, minOrderMinor: Number(minOrderMinor) }),
    });
    const data = await response.json() as { error?: string };
    setMessage(response.ok ? "Created — refresh to see it." : (data.error || "Could not create coupon."));
    if (response.ok) { setCode(""); router.refresh(); }
  }

  return (
    <form onSubmit={submit} className="mt-6 grid gap-3 rounded-3xl border bg-white p-5 sm:grid-cols-6">
      <input required value={code} onChange={(e) => setCode(e.target.value)} placeholder="CODE" className="rounded-xl border px-4 py-3 uppercase" />
      <select value={discountType} onChange={(e) => setDiscountType(e.target.value as "percentage" | "fixed_amount")} className="rounded-xl border px-4 py-3">
        <option value="percentage">% off</option>
        <option value="fixed_amount">Fixed (minor units)</option>
      </select>
      <input required type="number" min="1" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} placeholder="Value" className="rounded-xl border px-4 py-3" />
      {/* A coupon only ever applies to a cart in this same currency — see
          PromotionService.validateCoupon. Matters most for "Fixed" coupons,
          whose value is in this currency's minor units. */}
      <select value={currency} onChange={(e) => setCurrency(e.target.value as SupportedCurrency)} title="This coupon only applies to a cart in this currency" className="rounded-xl border px-4 py-3">
        {SUPPORTED_CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <input type="number" min="0" value={minOrderMinor} onChange={(e) => setMinOrderMinor(e.target.value)} placeholder="Min order (minor units)" className="rounded-xl border px-4 py-3" />
      <button className="rounded-full bg-[#0B1D3A] px-5 py-3 text-sm font-bold text-white">Create coupon</button>
      <span className="text-xs text-[#64748B] sm:col-span-6">{message}</span>
    </form>
  );
}
