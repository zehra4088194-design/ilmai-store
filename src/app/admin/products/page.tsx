import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { ProductService } from "@/services/ProductService";
import { formatMoney } from "@/lib/pricing";

export default async function AdminProductsPage() {
  const products = await ProductService.adminList();
  return (
    <main className="mx-auto max-w-6xl p-6 lg:p-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-[#0F766E]">Catalog control</p>
          <h1 className="display-font mt-2 text-5xl">Products</h1>
        </div>
        <div className="flex gap-3">
          <Link href="/admin/products/import" className="rounded-full border px-5 py-3 text-sm font-bold text-[#0B1D3A]">Bulk import</Link>
          <Link href="/admin/products/new" className="rounded-full bg-[#0B1D3A] px-5 py-3 text-sm font-bold text-white">+ New product</Link>
        </div>
      </div>
      <div className="mt-8 overflow-hidden rounded-3xl border bg-white">
        <div className="grid grid-cols-[1fr_120px_120px_100px_90px_40px] gap-4 border-b px-5 py-4 text-xs font-bold uppercase tracking-widest text-[#64748B]">
          <span>Product</span><span>Type</span><span>Price</span><span>Status</span><span>Owner</span><span />
        </div>
        {products.map((p) => (
          <div key={p.id} className="grid grid-cols-[1fr_120px_120px_100px_90px_40px] items-center gap-4 border-b px-5 py-5 text-sm hover:bg-[#F1F5F9]">
            <Link href={`/admin/products/${p.id}`} className="font-bold">
              {p.title}
              <small className="mt-1 block font-normal text-[#64748B]">{p.slug}</small>
            </Link>
            <Link href={`/admin/products/${p.id}`}>{p.productType}</Link>
            <Link href={`/admin/products/${p.id}`}>{formatMoney(p.basePrice)}</Link>
            <Link href={`/admin/products/${p.id}`} className="text-[#0F766E]">{p.status}</Link>
            <Link href={`/admin/products/${p.id}`}>
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${p.sellerId ? "bg-[#DCFCE7] text-[#0F766E]" : "bg-[#F1F5F9] text-[#64748B]"}`}>{p.sellerId ? "Seller" : "Platform"}</span>
            </Link>
            <Link href={`/store/${p.slug}`} title="View live" className="text-[#64748B] hover:text-[#0F766E]">
              <ArrowUpRight size={16} />
            </Link>
          </div>
        ))}
        {!products.length && <p className="p-10 text-center text-[#64748B]">No products yet.</p>}
      </div>
    </main>
  );
}
