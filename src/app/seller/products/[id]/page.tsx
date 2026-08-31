import { notFound } from "next/navigation";
import Link from "next/link";
import { requireSeller } from "@/lib/auth/admin";
import { ProductService } from "@/services/ProductService";
import { ProductEventService } from "@/services/ProductEventService";
import { NotFoundError } from "@/lib/errors";
import { ProductForm } from "@/components/admin/ProductForm";
import { ProductMediaManager } from "@/components/admin/ProductMediaManager";
import { Eye, MousePointerClick, ShoppingBag } from "lucide-react";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export default async function EditSellerProductPage({ params }: { params: Params }) {
  const { sellerId } = await requireSeller();
  const { id } = await params;

  const product = await ProductService.sellerGetById(sellerId, id).catch((err) => {
    if (err instanceof NotFoundError) notFound();
    throw err;
  });
  const stats = (await ProductEventService.statsForProducts([product.id])).get(product.id);

  return (
    <main className="mx-auto max-w-6xl p-6 lg:p-10">
      <Link href="/seller/products" className="text-sm font-bold text-[#14777a]">← Back to your products</Link>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-[#14777a]">Your catalog</p>
          <h1 className="display-font mt-2 text-5xl">{product.title}</h1>
        </div>
        {product.status === "published" && <Link href={`/store/${product.slug}`} className="text-sm font-bold text-[#14777a]">View live →</Link>}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-2xl border bg-white p-4"><Eye size={18} className="text-[#14777a]" /><div><p className="text-xl font-bold">{stats?.views ?? 0}</p><p className="text-xs text-[#668084]">views</p></div></div>
        <div className="flex items-center gap-3 rounded-2xl border bg-white p-4"><MousePointerClick size={18} className="text-[#14777a]" /><div><p className="text-xl font-bold">{stats?.addToCarts ?? 0}</p><p className="text-xs text-[#668084]">add-to-bag clicks</p></div></div>
        <div className="flex items-center gap-3 rounded-2xl border bg-white p-4"><ShoppingBag size={18} className="text-[#14777a]" /><div><p className="text-xl font-bold">{stats?.unitsSold ?? 0}</p><p className="text-xs text-[#668084]">units sold</p></div></div>
      </div>

      <ProductMediaManager productId={product.id} media={product.media} role="seller" />
      <ProductForm mode="edit" product={product} role="seller" />
    </main>
  );
}
