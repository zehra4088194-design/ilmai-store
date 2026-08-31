import Link from "next/link";
import { requireSeller } from "@/lib/auth/admin";
import { ProductService } from "@/services/ProductService";
import { ProductEventService } from "@/services/ProductEventService";
import { Eye, MousePointerClick, Package, ShoppingBag } from "lucide-react";

export const dynamic = "force-dynamic";

function Metric({ icon: Icon, label, value }: { icon: typeof Eye; label: string; value: number | string }) {
  return (
    <div className="rounded-3xl border bg-white p-6">
      <div className="flex items-center gap-2 text-[#14777a]"><Icon size={18} /><p className="text-sm font-bold text-[#668084]">{label}</p></div>
      <p className="mt-3 text-4xl font-bold">{value}</p>
    </div>
  );
}

export default async function SellerOverviewPage() {
  const { sellerId, businessName } = await requireSeller();
  const products = await ProductService.sellerList(sellerId);
  const stats = await ProductEventService.statsForProducts(products.map((p) => p.id));

  let totalViews = 0, totalClicks = 0, totalSold = 0;
  for (const s of stats.values()) { totalViews += s.views; totalClicks += s.addToCarts; totalSold += s.unitsSold; }

  return (
    <main className="mx-auto max-w-6xl p-6 lg:p-10">
      <p className="text-xs font-bold uppercase tracking-[.2em] text-[#14777a]">Seller dashboard</p>
      <h1 className="display-font mt-2 text-5xl">Welcome{businessName ? `, ${businessName}` : ""}.</h1>
      <p className="mt-3 text-[#668084]">Everything below is scoped to your own listings — nothing else on the store is visible or editable from here.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-4">
        <Metric icon={Package} label="Products" value={products.length} />
        <Metric icon={Eye} label="Total views" value={totalViews} />
        <Metric icon={MousePointerClick} label="Add-to-bag clicks" value={totalClicks} />
        <Metric icon={ShoppingBag} label="Units sold" value={totalSold} />
      </div>

      <section className="mt-10 rounded-3xl border bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Your products</h2>
          <Link href="/seller/products/new" className="rounded-full bg-[#103d42] px-4 py-2 text-sm font-bold text-white">+ New product</Link>
        </div>
        <div className="mt-5 grid gap-3">
          {products.slice(0, 8).map((product) => {
            const s = stats.get(product.id);
            return (
              <Link key={product.id} href={`/seller/products/${product.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#f5f7f3] px-4 py-3 text-sm hover:bg-[#eef4ee]">
                <span className="font-bold">{product.title}</span>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${product.status === "published" ? "bg-[#e0eee8] text-[#14777a]" : "bg-[#f5e3b8] text-[#8a6d1f]"}`}>{product.status}</span>
                <span className="text-[#668084]"><Eye size={12} className="mr-1 inline" />{s?.views ?? 0} views</span>
                <span className="text-[#668084]"><MousePointerClick size={12} className="mr-1 inline" />{s?.addToCarts ?? 0} clicks</span>
                <span className="font-bold text-[#14777a]">{s?.unitsSold ?? 0} sold</span>
              </Link>
            );
          })}
          {!products.length && <p className="py-6 text-center text-[#668084]">No products yet — add your first one.</p>}
        </div>
      </section>
    </main>
  );
}
