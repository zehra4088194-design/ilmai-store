import Link from "next/link";
import { SellerService } from "@/services/SellerService";
import { SellerManager } from "@/components/admin/SellerManager";

export const dynamic = "force-dynamic";

export default async function AdminSellersPage() {
  const sellers = await SellerService.adminListSellers();
  return (
    <main className="mx-auto max-w-6xl p-6 lg:p-10">
      <p className="text-xs font-bold uppercase tracking-[.2em] text-[#2563EB]">Marketplace control</p>
      <h1 className="display-font mt-2 text-5xl">Sellers</h1>
      <p className="mt-3 max-w-2xl text-sm text-[#64748B]">
        Sellers manage their own products from <code className="rounded bg-[#F1F5F9] px-1.5 py-0.5">/seller</code> — new
        listings from a seller start as drafts, so nothing goes live without you reviewing it first in{" "}
        <Link href="/admin/products" className="font-bold text-[#2563EB]">Products</Link>.
      </p>
      <SellerManager sellers={sellers} />
    </main>
  );
}
