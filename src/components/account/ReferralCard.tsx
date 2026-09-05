"use client";

import { useState } from "react";
import { Check, Clipboard, Gift } from "lucide-react";

export function ReferralCard({ code, conversionCount }: { code: string; conversionCount: number }) {
  const [copied, setCopied] = useState(false);
  const link = typeof window !== "undefined" ? `${window.location.origin}/signup?ref=${code}` : `/signup?ref=${code}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="rounded-[2rem] border bg-white p-6 sm:p-8">
      <div className="flex items-center gap-2">
        <Gift size={16} className="text-[#0F766E]" />
        <p className="text-xs font-bold uppercase tracking-[.2em] text-[#0F766E]">Refer a friend</p>
      </div>
      <h2 className="display-font mt-1 text-2xl text-[#0B1D3A]">Share, and get 10% off.</h2>
      <p className="mt-1 text-xs leading-5 text-[#64748B]">When someone signs up with your link and completes their first order, you get a one-time 10% off coupon by email.</p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <code className="flex-1 min-w-0 truncate rounded-xl bg-[#F1F5F9] px-4 py-3 text-xs font-bold text-[#0B1D3A]">{link}</code>
        <button type="button" onClick={copy} className="inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2.5 text-xs font-bold">
          {copied ? <Check size={14} /> : <Clipboard size={14} />} {copied ? "Copied" : "Copy link"}
        </button>
      </div>
      {conversionCount > 0 && <p className="mt-3 text-xs font-semibold text-[#0F766E]">{conversionCount} friend{conversionCount === 1 ? "" : "s"} referred so far. 🎉</p>}
    </div>
  );
}
