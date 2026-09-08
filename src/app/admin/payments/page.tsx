import { PaymentService } from "@/services/PaymentService";
import { PaymentsChart } from "@/components/admin/PaymentsChart";
import { PaymentsTable } from "@/components/admin/PaymentsTable";
import { formatMoney } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export default async function AdminPaymentsPage() {
  const [analytics, payments] = await Promise.all([
    PaymentService.adminAnalytics(),
    PaymentService.adminList({ limit: 300 }),
  ]);

  return (
    <main className="mx-auto max-w-6xl p-6 lg:p-10">
      <p className="text-xs font-bold uppercase tracking-[.2em] text-[#0F766E]">Commerce control</p>
      <h1 className="display-font mt-2 text-5xl">Payments</h1>
      <p className="mt-3 max-w-2xl text-sm text-[#64748B]">Every payment across both providers — Safepay (card) and JazzCash (manual wallet) — with revenue broken down daily, weekly, monthly and annually.</p>

      {analytics.length > 0 && (
        <div className={`mt-8 grid gap-4 ${analytics.length > 1 ? "sm:grid-cols-2" : ""}`}>
          {analytics.map((a) => {
            const today = a.daily[a.daily.length - 1];
            const thisWeek = a.weekly[a.weekly.length - 1];
            const thisMonth = a.monthly[a.monthly.length - 1];
            const thisYear = a.yearly[a.yearly.length - 1];
            return (
              <div key={a.currency} className="rounded-3xl border bg-[#0B1D3A] p-6 text-white">
                <p className="text-sm text-[#B9C4E0]">Revenue ({a.currency})</p>
                <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div><p className="text-[11px] uppercase tracking-widest text-[#8FA0C9]">Today</p><p className="mt-1 text-lg font-black">{formatMoney({ amountMinor: today?.amountMinor ?? 0, currency: a.currency })}</p></div>
                  <div><p className="text-[11px] uppercase tracking-widest text-[#8FA0C9]">This week</p><p className="mt-1 text-lg font-black">{formatMoney({ amountMinor: thisWeek?.amountMinor ?? 0, currency: a.currency })}</p></div>
                  <div><p className="text-[11px] uppercase tracking-widest text-[#8FA0C9]">This month</p><p className="mt-1 text-lg font-black">{formatMoney({ amountMinor: thisMonth?.amountMinor ?? 0, currency: a.currency })}</p></div>
                  <div><p className="text-[11px] uppercase tracking-widest text-[#8FA0C9]">This year</p><p className="mt-1 text-lg font-black">{formatMoney({ amountMinor: thisYear?.amountMinor ?? 0, currency: a.currency })}</p></div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-6">
        <PaymentsChart analytics={analytics} />
      </div>

      <div className="mt-6">
        <PaymentsTable payments={payments} />
      </div>
    </main>
  );
}
