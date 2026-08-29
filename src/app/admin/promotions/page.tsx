import { PromotionService } from "@/services/PromotionService";
import { PromotionForm } from "@/components/admin/PromotionForm";

export const dynamic = "force-dynamic";

export default async function AdminPromotionsPage() {
  const promotions = await PromotionService.adminListPromotions();
  return <main className="mx-auto max-w-6xl p-6 lg:p-10"><p className="text-xs font-bold uppercase tracking-[.2em] text-[#14777a]">Campaign control</p><h1 className="display-font mt-2 text-5xl">Promotions & banners</h1><PromotionForm /><div className="mt-8 grid gap-3">{promotions.map((promotion) => <div key={promotion.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white px-5 py-4"><div><p className="font-bold">{promotion.name}</p><p className="text-sm text-[#668084]">{promotion.discountType} · {promotion.discountValue}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${promotion.isActive ? "bg-[#e0eee8] text-[#14777a]" : "bg-[#f5f7f3] text-[#668084]"}`}>{promotion.isActive ? "active" : "inactive"}</span></div>)}{!promotions.length && <p className="rounded-2xl border bg-white p-8 text-center text-[#668084]">No promotions yet.</p>}</div></main>;
}
