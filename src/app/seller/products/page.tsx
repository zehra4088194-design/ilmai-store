import Link from "next/link";
import { requireSeller } from "@/lib/auth/admin";
import { ProductService } from "@/services/ProductService";

export const dynamic = "force-dynamic";

export default async function SellerProductsPage() {
  const { sellerId } = await requireSeller();
  const products = await ProductService.sellerList(sellerId);

  return (
    <main className="mx-auto max-w-6xl p-6 lg:p-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-[#14777a]">Your catalog</p>
          <h1 className="display-font mt-2 text-5xl">Products</h1>
        </div>
        <Link href="/seller/products/new" className="rounded-full bg-[#103d42] px-5 py-3 text-sm font-bold text-white">+ New product</Link>
      </div>

      <div className="mt-8 grid gap-4">
        {products.map((product) => (
          <Link key={product.id} href={`/seller/products/${product.id}`} className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border bg-white p-6 transition hover:-translate-y-0.5 hover:shadow-lg">
            <div>
              <p className="font-bold">{product.title}</p>
              <p className="mt-1 text-sm text-[#668084]">{product.productType} · {product.basePrice.currency} {(product.basePrice.amountMinor / 100).toFixed(0)}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest ${product.status === "published" ? "bg-[#e0eee8] text-[#14777a]" : "bg-[#f5e3b8] text-[#8a6d1f]"}`}>{product.status}</span>
          </Link>
        ))}
        {!products.length && <p className="rounded-3xl border bg-white p-10 text-center text-[#668084]">No products yet — add your first one.</p>}
      </div>
    </main>
  );
}
