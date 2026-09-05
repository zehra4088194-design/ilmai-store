import { notFound } from "next/navigation";
import Link from "next/link";
import { ProductService } from "@/services/ProductService";
import { NotFoundError } from "@/lib/errors";
import { ProductForm } from "@/components/admin/ProductForm";
import { ProductMediaManager } from "@/components/admin/ProductMediaManager";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export default async function EditProductPage({ params }: { params: Params }) {
  const { id } = await params;

  const product = await ProductService.adminGetById(id).catch((err) => {
    if (err instanceof NotFoundError) notFound();
    throw err;
  });

  return (
    <main className="mx-auto max-w-6xl p-6 lg:p-10">
      <Link href="/admin/products" className="text-sm font-bold text-[#0F766E]">← Back to products</Link>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-[#0F766E]">Catalog control</p>
          <h1 className="display-font mt-2 text-5xl">{product.title}</h1>
        </div>
        <Link href={`/store/${product.slug}`} className="text-sm font-bold text-[#0F766E]">View live →</Link>
      </div>
      <ProductMediaManager productId={product.id} media={product.media} />
      <ProductForm mode="edit" product={product} />
    </main>
  );
}
