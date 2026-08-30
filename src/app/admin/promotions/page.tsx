import { PromotionService } from "@/services/PromotionService";
import { PromotionForm } from "@/components/admin/PromotionForm";
import { CouponForm } from "@/components/admin/CouponForm";
import { BannerForm } from "@/components/admin/BannerForm";
import { BannerDeleteButton } from "@/components/admin/BannerDeleteButton";
import { PromotionRowActions } from "@/components/admin/PromotionRowActions";

export const dynamic = "force-dynamic";

export default async function AdminPromotionsPage() {
  const [promotions, coupons, banners] = await Promise.all([
    PromotionService.adminListPromotions(),
    PromotionService.adminListCoupons(),
    PromotionService.adminListBanners(),
  ]);

  return (
    <main className="mx-auto max-w-6xl p-6 lg:p-10">
      <p className="text-xs font-bold uppercase tracking-[.2em] text-[#14777a]">Campaign control</p>
      <h1 className="display-font mt-2 text-5xl">Promotions & banners</h1>

      <section className="mt-10">
        <h2 className="display-font text-2xl text-[#103d42]">Promotions</h2>
        <PromotionForm />
        <div className="mt-4 grid gap-3">
          {promotions.map((promotion) => (
            <div key={promotion.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white px-5 py-4">
              <div>
                <p className="font-bold">{promotion.name}</p>
                <p className="text-sm text-[#668084]">{promotion.discountType} · {promotion.discountValue}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${promotion.isActive ? "bg-[#e0eee8] text-[#14777a]" : "bg-[#f5f7f3] text-[#668084]"}`}>{promotion.isActive ? "active" : "inactive"}</span>
                <PromotionRowActions kind="promotions" id={promotion.id} isActive={promotion.isActive} />
              </div>
            </div>
          ))}
          {!promotions.length && <p className="rounded-2xl border bg-white p-8 text-center text-[#668084]">No promotions yet.</p>}
        </div>
      </section>

      <section className="mt-14">
        <h2 className="display-font text-2xl text-[#103d42]">Coupons</h2>
        <CouponForm />
        <div className="mt-4 overflow-hidden rounded-3xl border bg-white">
          <div className="grid grid-cols-[1fr_1fr_1fr_80px_90px] gap-4 border-b px-5 py-4 text-xs font-bold uppercase tracking-widest text-[#668084]">
            <span>Code</span><span>Discount</span><span>Min order</span><span>Status</span><span />
          </div>
          {coupons.map((coupon) => (
            <div key={coupon.code} className="grid grid-cols-[1fr_1fr_1fr_80px_90px] items-center gap-4 border-b px-5 py-4 text-sm">
              <span className="font-bold">{coupon.code}</span>
              <span>{coupon.discountType === "percentage" ? `${coupon.discountValue}%` : `${(coupon.discountValue / 100).toFixed(2)} ${coupon.minOrder.currency}`}</span>
              <span>{(coupon.minOrder.amountMinor / 100).toFixed(2)} {coupon.minOrder.currency}</span>
              <span className={coupon.isActive ? "font-bold text-[#14777a]" : "text-[#668084]"}>{coupon.isActive ? "active" : "inactive"}</span>
              <PromotionRowActions kind="coupons" id={coupon.code} isActive={coupon.isActive} />
            </div>
          ))}
          {!coupons.length && <p className="p-8 text-center text-[#668084]">No coupons yet.</p>}
        </div>
      </section>

      <section className="mt-14">
        <h2 className="display-font text-2xl text-[#103d42]">Banners</h2>
        <BannerForm />
        <div className="mt-4 grid gap-3">
          {banners.map((banner) => (
            <div key={banner.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white px-5 py-4">
              <div>
                <p className="font-bold">{banner.title}</p>
                <p className="text-sm text-[#668084]">{banner.placement} · priority {banner.priority}{banner.subtitle ? ` · ${banner.subtitle}` : ""}</p>
              </div>
              <div className="flex items-center gap-3">
                {banner.linkUrl && <a href={banner.linkUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-[#14777a]">Link ↗</a>}
                <BannerDeleteButton bannerId={banner.id} />
              </div>
            </div>
          ))}
          {!banners.length && <p className="rounded-2xl border bg-white p-8 text-center text-[#668084]">No banners yet.</p>}
        </div>
      </section>
    </main>
  );
}
