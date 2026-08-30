import Link from "next/link";
import { ProductForm } from "@/components/admin/ProductForm";

export default function NewProductPage() {
  return (
    <main className="mx-auto max-w-6xl p-6 lg:p-10">
      <Link href="/admin/products" className="text-sm font-bold text-[#14777a]">← Back to products</Link>
      <p className="mt-8 text-xs font-bold uppercase tracking-[.2em] text-[#14777a]">Catalog control</p>
      <h1 className="display-font mt-2 text-5xl">New product</h1>
      <ProductForm mode="create" />
    </main>
  );
}
