"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatMoney } from "@/lib/pricing";
import type { AdminPaymentRow } from "@/services/PaymentService";

const STATUS_STYLE: Record<string, string> = {
  paid: "bg-[#DCFCE7] text-[#15803D]",
  pending: "bg-[#FFF3E8] text-[#C2410C]",
  failed: "bg-[#FEE2E2] text-[#B91C1C]",
  refunded: "bg-[#F1F5F9] text-[#64748B]",
};

const PROVIDER_LABEL: Record<string, string> = { safepay: "Card (Safepay)", jazzcash: "JazzCash" };

export function PaymentsTable({ payments }: { payments: AdminPaymentRow[] }) {
  const [status, setStatus] = useState<string>("all");
  const [provider, setProvider] = useState<string>("all");

  const filtered = useMemo(
    () => payments.filter((p) => (status === "all" || p.status === status) && (provider === "all" || p.provider === provider)),
    [payments, status, provider],
  );

  return (
    <section className="rounded-3xl border bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-bold text-[#0B1D3A]">All payments</h2>
        <div className="flex flex-wrap gap-2">
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-full border px-3 py-1.5 text-xs font-bold text-[#0B1D3A]">
            <option value="all">All statuses</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>
          <select value={provider} onChange={(e) => setProvider(e.target.value)} className="rounded-full border px-3 py-1.5 text-xs font-bold text-[#0B1D3A]">
            <option value="all">All providers</option>
            <option value="safepay">Card (Safepay)</option>
            <option value="jazzcash">JazzCash</option>
          </select>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border">
        <div className="min-w-[720px]">
          <div className="grid grid-cols-[1fr_1fr_1fr_1fr_120px_140px] gap-4 border-b bg-[#F1F5F9] px-5 py-3 text-xs font-bold uppercase tracking-widest text-[#64748B]">
            <span>Order</span><span>Customer</span><span>Provider</span><span>Amount</span><span>Status</span><span>Date</span>
          </div>
          {filtered.map((p) => (
            <Link key={p.id} href={`/admin/orders#order-${p.orderId}`} className="grid grid-cols-[1fr_1fr_1fr_1fr_120px_140px] items-center gap-4 border-b px-5 py-3.5 text-sm hover:bg-[#F1F5F9]">
              <span className="truncate font-bold text-[#0B1D3A]">{p.orderNumber ?? p.orderId.slice(0, 8)}</span>
              <span className="truncate text-[#64748B]">{p.customerEmail ?? "—"}</span>
              <span className="text-[#64748B]">{PROVIDER_LABEL[p.provider] ?? p.provider}</span>
              <span className="font-bold text-[#0F766E]">{formatMoney({ amountMinor: p.amountMinor, currency: p.currency })}</span>
              <span className={`inline-flex w-fit rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest ${STATUS_STYLE[p.status] ?? "bg-[#F1F5F9] text-[#64748B]"}`}>{p.status}</span>
              <span className="text-xs text-[#64748B]">{new Date(p.createdAt).toLocaleString("en-PK", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
            </Link>
          ))}
          {!filtered.length && <p className="p-10 text-center text-sm text-[#64748B]">No payments match this filter.</p>}
        </div>
      </div>
    </section>
  );
}
