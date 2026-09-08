"use client";

import { useMemo, useState } from "react";
import { formatMoney } from "@/lib/pricing";
import type { PaymentAnalytics, PaymentBucket } from "@/services/PaymentService";

type Granularity = "daily" | "weekly" | "monthly" | "yearly";
const GRANULARITY_LABEL: Record<Granularity, string> = { daily: "Daily", weekly: "Weekly", monthly: "Monthly", yearly: "Annually" };

const CHART_HEIGHT = 220;
const CHART_WIDTH = 900;
const PADDING_LEFT = 8;
const PADDING_BOTTOM = 28;

export function PaymentsChart({ analytics }: { analytics: PaymentAnalytics[] }) {
  const [currency, setCurrency] = useState(analytics[0]?.currency ?? "PKR");
  const [granularity, setGranularity] = useState<Granularity>("daily");

  const series: PaymentBucket[] = useMemo(() => {
    const forCurrency = analytics.find((a) => a.currency === currency);
    return forCurrency ? forCurrency[granularity] : [];
  }, [analytics, currency, granularity]);

  const maxAmount = Math.max(1, ...series.map((b) => b.amountMinor));
  const totalMinor = series.reduce((sum, b) => sum + b.amountMinor, 0);
  const totalCount = series.reduce((sum, b) => sum + b.count, 0);

  const plotWidth = CHART_WIDTH - PADDING_LEFT;
  const plotHeight = CHART_HEIGHT - PADDING_BOTTOM;
  const barGap = series.length > 40 ? 1 : 4;
  const barWidth = series.length ? Math.max(2, plotWidth / series.length - barGap) : 0;

  // Skip labels when there are too many bars to keep them legible.
  const labelEvery = series.length > 20 ? Math.ceil(series.length / 10) : 1;

  if (!analytics.length) {
    return <section className="rounded-3xl border bg-white p-6"><p className="text-sm text-[#64748B]">No paid payments yet — the chart fills in once orders start getting paid.</p></section>;
  }

  return (
    <section className="rounded-3xl border bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#0B1D3A]">Revenue over time</h2>
          <p className="mt-1 text-xs text-[#64748B]">{totalCount} paid payment{totalCount === 1 ? "" : "s"} · {formatMoney({ amountMinor: totalMinor, currency })} in this range</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {analytics.length > 1 && (
            <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="rounded-full border px-3 py-1.5 text-xs font-bold text-[#0B1D3A]">
              {analytics.map((a) => <option key={a.currency} value={a.currency}>{a.currency}</option>)}
            </select>
          )}
          <div className="flex rounded-full border bg-[#F1F5F9] p-1">
            {(Object.keys(GRANULARITY_LABEL) as Granularity[]).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGranularity(g)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${granularity === g ? "bg-[#0B1D3A] text-white" : "text-[#64748B] hover:text-[#0B1D3A]"}`}
              >
                {GRANULARITY_LABEL[g]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto">
        <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} className="h-56 w-full min-w-[500px]" role="img" aria-label={`${GRANULARITY_LABEL[granularity]} revenue chart`}>
          {/* baseline */}
          <line x1={PADDING_LEFT} y1={plotHeight} x2={CHART_WIDTH} y2={plotHeight} stroke="#E2E8F0" strokeWidth={1} />
          {series.map((bucket, i) => {
            const barHeight = maxAmount ? (bucket.amountMinor / maxAmount) * (plotHeight - 12) : 0;
            const x = PADDING_LEFT + i * (barWidth + barGap);
            const y = plotHeight - barHeight;
            const showLabel = i % labelEvery === 0 || i === series.length - 1;
            return (
              <g key={bucket.key}>
                <title>{`${bucket.label}: ${formatMoney({ amountMinor: bucket.amountMinor, currency })} (${bucket.count} payment${bucket.count === 1 ? "" : "s"})`}</title>
                <rect x={x} y={y} width={barWidth} height={Math.max(barHeight, bucket.amountMinor > 0 ? 2 : 0)} rx={2} fill={bucket.amountMinor > 0 ? "#0F766E" : "#F1F5F9"} />
                {showLabel && (
                  <text x={x + barWidth / 2} y={CHART_HEIGHT - 8} textAnchor="middle" fontSize={10} fill="#64748B">{bucket.label}</text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </section>
  );
}
