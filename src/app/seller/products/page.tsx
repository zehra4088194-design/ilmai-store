import Link from "next/link";
import { requireSeller } from "@/lib/auth/admin";
import { ProductService } from "@/services/ProductService";
import { formatMoney } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export default async function SellerProductsPage() {
  const { sellerId } = await requireSeller();
  const products = await ProductService.sellerList(sellerId);

  return (
    <main className="mx-auto max-w-6xl p-6 lg:p-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-[#2563EB]">Your catalog</p>
          <h1 className="display-font mt-2 text-5xl">Products</h1>
        </div>
        <Link href="/seller/products/new" className="rounded-full bg-[#0B1D3A] px-5 py-3 text-sm font-bold text-white">+ New product</Link>
      </div>

      <div className="mt-8 grid gap-4">
        {products.map((product) => {
          const stockVariant = product.variants.find((v) => v.requiresShipping && v.stockQuantity !== undefined);
          return (
            <Link key={product.id} href={`/seller/products/${product.id}`} className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border bg-white p-6 transition hover:-translate-y-0.5 hover:shadow-lg">
              <div>
                <p className="font-bold">{product.title}</p>
                <p className="mt-1 text-sm text-[#64748B]">
                  {product.productType} · {formatMoney(product.basePrice)}
                  {stockVariant && ` · ${stockVariant.stockQuantity! > 0 ? `${stockVariant.stockQuantity} in stock` : "Out of stock"}`}
                </p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest ${product.status === "published" ? "bg-[#DCFCE7] text-[#2563EB]" : "bg-[#FFF3E8] text-[#C2410C]"}`}>{product.status}</span>
            </Link>
          );
        })}
        {!products.length && <p className="rounded-3xl border bg-white p-10 text-center text-[#64748B]">No products yet — add your first one.</p>}
      </div>
    </main>
  );
}
