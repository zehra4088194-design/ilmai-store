import { CategoryService } from "@/services/CategoryService";
import { CategoryManager } from "@/components/admin/CategoryManager";

export default async function AdminCategoriesPage() {
  const categories = await CategoryService.adminList();
  return (
    <main className="mx-auto max-w-6xl p-6 lg:p-10">
      <div>
        <p className="text-xs font-bold uppercase tracking-[.2em] text-[#14777a]">Catalog control</p>
        <h1 className="display-font mt-2 text-5xl">Categories</h1>
      </div>
      <CategoryManager categories={categories} />
    </main>
  );
}
