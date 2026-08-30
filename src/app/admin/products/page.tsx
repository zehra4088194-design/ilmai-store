import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { ProductService } from "@/services/ProductService";

export default async function AdminProductsPage() {
  const products = await ProductService.adminList();
  return (
    <main className="mx-auto max-w-6xl p-6 lg:p-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-[#14777a]">Catalog control</p>
          <h1 className="display-font mt-2 text-5xl">Products</h1>
        </div>
        <Link href="/admin/products/new" className="rounded-full bg-[#103d42] px-5 py-3 text-sm font-bold text-white">+ New product</Link>
      </div>
      <div className="mt-8 overflow-hidden rounded-3xl border bg-white">
        <div className="grid grid-cols-[1fr_120px_120px_100px_40px] gap-4 border-b px-5 py-4 text-xs font-bold uppercase tracking-widest text-[#668084]">
          <span>Product</span><span>Type</span><span>Price</span><span>Status</span><span />
        </div>
        {products.map((p) => (
          <div key={p.id} className="grid grid-cols-[1fr_120px_120px_100px_40px] items-center gap-4 border-b px-5 py-5 text-sm hover:bg-[#f5f7f3]">
            <Link href={`/admin/products/${p.id}`} className="font-bold">
              {p.title}
              <small className="mt-1 block font-normal text-[#668084]">{p.slug}</small>
            </Link>
            <Link href={`/admin/products/${p.id}`}>{p.productType}</Link>
            <Link href={`/admin/products/${p.id}`}>{p.basePrice.amountMinor / 100} {p.basePrice.currency}</Link>
            <Link href={`/admin/products/${p.id}`} className="text-[#14777a]">{p.status}</Link>
            <Link href={`/store/${p.slug}`} title="View live" className="text-[#668084] hover:text-[#14777a]">
              <ArrowUpRight size={16} />
            </Link>
          </div>
        ))}
        {!products.length && <p className="p-10 text-center text-[#668084]">No products yet.</p>}
      </div>
    </main>
  );
}
