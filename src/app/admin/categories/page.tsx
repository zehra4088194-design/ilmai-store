import { CategoryService } from "@/services/CategoryService";
import { CategoryForm } from "@/components/admin/CategoryForm";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const categories = await CategoryService.adminList();
  return <main className="mx-auto max-w-6xl p-6 lg:p-10"><p className="text-xs font-bold uppercase tracking-[.2em] text-[#14777a]">Catalog control</p><h1 className="display-font mt-2 text-5xl">Categories</h1><div className="mt-8"><CategoryForm /></div><div className="mt-4 grid gap-3">{categories.map((category) => <div key={category.id} className="flex items-center justify-between rounded-2xl border bg-white px-5 py-4"><span className="font-bold">{category.name}</span><span className="text-sm text-[#668084]">{category.slug}</span></div>)}{!categories.length && <p className="rounded-2xl border bg-white p-8 text-center text-[#668084]">No categories yet.</p>}</div></main>;
}
