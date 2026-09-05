import Link from "next/link";
import { ProductImportForm } from "@/components/admin/ProductImportForm";

export default function AdminProductImportPage() {
  return (
    <main className="mx-auto max-w-6xl p-6 lg:p-10">
      <Link href="/admin/products" className="text-sm font-bold text-[#0F766E]">← Back to products</Link>
      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-[#0F766E]">Catalog control</p>
          <h1 className="display-font mt-2 text-5xl">Bulk import</h1>
        </div>
      </div>
      <div className="mt-8">
        <ProductImportForm />
      </div>
    </main>
  );
}
