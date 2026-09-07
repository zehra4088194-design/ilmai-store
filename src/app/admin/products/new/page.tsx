import Link from "next/link";
import { ProductForm } from "@/components/admin/ProductForm";
import { CategoryService } from "@/services/CategoryService";

export default async function NewProductPage() {
  const categories = await CategoryService.adminList();
  return (
    <main className="mx-auto max-w-6xl p-6 lg:p-10">
      <Link href="/admin/products" className="text-sm font-bold text-[#0F766E]">← Back to products</Link>
      <p className="mt-8 text-xs font-bold uppercase tracking-[.2em] text-[#0F766E]">Catalog control</p>
      <h1 className="display-font mt-2 text-5xl">New product</h1>
      <ProductForm mode="create" categories={categories} />
    </main>
  );
}
