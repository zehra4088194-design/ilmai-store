import Link from "next/link";
import { OrderService } from "@/services/OrderService";
import { ProductService } from "@/services/ProductService";
import { getPlatformSettings } from "@/lib/platform-settings/server";
import { ExchangeRateCard } from "@/components/admin/ExchangeRateCard";
import { formatMoney } from "@/lib/pricing";

export const dynamic = "force-dynamic";

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-[#FFF3E8] text-[#C2410C]",
  processing: "bg-[#DBEAFE] text-[#2563EB]",
  fulfilled: "bg-[#DCFCE7] text-[#15803D]",
  completed: "bg-[#DCFCE7] text-[#15803D]",
  cancelled: "bg-[#F1F5F9] text-[#64748B]",
  refunded: "bg-[#FEE2E2] text-[#B91C1C]",
};

export default async function AdminPage() {
  const [products, orders, settings, stats] = await Promise.all([
    ProductService.adminList(),
    OrderService.adminList(),
    getPlatformSettings(),
    OrderService.adminStats(),
  ]);
  const pending = orders.filter((o) => o.paymentStatus === "pending").length;
  const maxStatusCount = Math.max(1, ...stats.ordersByStatus.map((s) => s.count));
  const maxSellerQty = Math.max(1, ...stats.bestSellers.map((s) => s.quantity));

  return (
    <main className="mx-auto max-w-6xl p-6 lg:p-10">
      <div className="mb-10">
        <p className="text-xs font-bold uppercase tracking-[.2em] text-[#0F766E]">IlmAI Store</p>
        <h1 className="display-font mt-2 text-5xl">Good morning, operator.</h1>
        <p className="mt-3 text-[#64748B]">Keep the shelf useful, current and moving.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Metric label="Catalog" value={products.length} href="/admin/products" />
        <Metric label="Orders" value={orders.length} href="/admin/orders" />
        <Metric label="Awaiting payment" value={pending} href="/admin/orders" />
      </div>

      {stats.revenueByCurrency.length > 0 && (
        <div className={`mt-4 grid gap-4 ${stats.revenueByCurrency.length > 1 ? "sm:grid-cols-2" : ""}`}>
          {stats.revenueByCurrency.map((r) => (
            <div key={r.currency} className="rounded-3xl border bg-[#0B1D3A] p-6 text-white">
              <p className="text-sm text-[#B9C4E0]">Total revenue ({r.currency}) · {stats.paidOrderCount} paid order{stats.paidOrderCount === 1 ? "" : "s"}</p>
              <p className="mt-2 text-3xl font-black">{formatMoney({ amountMinor: r.amountMinor, currency: r.currency })}</p>
            </div>
          ))}
        </div>
      )}

      <ExchangeRateCard initialSettings={settings.exchangeRate} />

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border bg-white p-6">
          <h2 className="text-lg font-bold">Orders by status</h2>
          <div className="mt-4 grid gap-2.5">
            {stats.ordersByStatus.map((s) => (
              <div key={s.status} className="flex items-center gap-3 text-sm">
                <span className={`w-24 shrink-0 rounded-full px-2.5 py-1 text-center text-[11px] font-bold uppercase tracking-widest ${STATUS_COLOR[s.status] ?? "bg-[#F1F5F9] text-[#64748B]"}`}>{s.status}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#F1F5F9]"><div className="h-full rounded-full bg-[#0F766E]" style={{ width: `${(s.count / maxStatusCount) * 100}%` }} /></div>
                <span className="w-6 shrink-0 text-right font-bold">{s.count}</span>
              </div>
            ))}
            {!stats.ordersByStatus.length && <p className="text-sm text-[#64748B]">No orders yet.</p>}
          </div>
        </section>

        <section className="rounded-3xl border bg-white p-6">
          <h2 className="text-lg font-bold">Best sellers</h2>
          <p className="mt-1 text-xs text-[#64748B]">By units sold across paid orders.</p>
          <div className="mt-4 grid gap-2.5">
            {stats.bestSellers.map((s) => (
              <div key={s.productName} className="flex items-center gap-3 text-sm">
                <span className="w-32 shrink-0 truncate font-semibold text-[#0B1D3A]">{s.productName}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#F1F5F9]"><div className="h-full rounded-full bg-[#15803D]" style={{ width: `${(s.quantity / maxSellerQty) * 100}%` }} /></div>
                <span className="w-6 shrink-0 text-right font-bold">{s.quantity}</span>
              </div>
            ))}
            {!stats.bestSellers.length && <p className="text-sm text-[#64748B]">No paid orders yet.</p>}
          </div>
        </section>
      </div>

      <section className="mt-8 rounded-3xl border bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Recent orders</h2>
          <Link href="/admin/orders" className="text-sm font-bold text-[#0F766E]">See all</Link>
        </div>
        <div className="mt-5 grid gap-3">
          {orders.slice(0, 5).map((o) => (
            <div key={o.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#F1F5F9] px-4 py-3 text-sm">
              <span className="font-bold">{o.orderNumber}</span>
              <span className="text-[#64748B]">{o.customerEmail}</span>
              <span className="rounded-full bg-[#DCFCE7] px-3 py-1 text-xs font-bold">{o.paymentStatus}</span>
              <span className="font-bold">{formatMoney(o.total)}</span>
            </div>
          ))}
          {!orders.length && <p className="py-6 text-center text-[#64748B]">No orders yet.</p>}
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link href={href} className="rounded-3xl border bg-white p-6 transition hover:-translate-y-1 hover:shadow-lg">
      <p className="text-sm text-[#64748B]">{label}</p>
      <p className="mt-3 text-4xl font-bold">{value}</p>
      <p className="mt-4 text-xs font-bold uppercase tracking-widest text-[#0F766E]">Manage →</p>
    </Link>
  );
}
