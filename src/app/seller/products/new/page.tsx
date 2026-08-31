import { requireSeller } from "@/lib/auth/admin";
import { ProductForm } from "@/components/admin/ProductForm";

export const dynamic = "force-dynamic";

export default async function NewSellerProductPage() {
  await requireSeller();
  return (
    <main className="mx-auto max-w-6xl p-6 lg:p-10">
      <p className="text-xs font-bold uppercase tracking-[.2em] text-[#2563EB]">Your catalog</p>
      <h1 className="display-font mt-2 text-5xl">New product</h1>
      <ProductForm mode="create" role="seller" />
    </main>
  );
}
