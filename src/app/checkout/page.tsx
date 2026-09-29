import Link from "next/link";
import { CartService } from "@/services/CartService";
import { getPlatformSettings } from "@/lib/platform-settings/server";

import { CheckoutOptions } from "@/components/checkout/CheckoutOptions";
import { StoreHeader } from "@/components/store/store-header";
import { StoreFooter } from "@/components/store/store-footer";
import { STUDY_BASKET_MIN_ITEMS, studyBasketItemCount } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const [cart, settings] = await Promise.all([CartService.getCurrentCart(), getPlatformSettings()]);
  const exchangeRate = settings.exchangeRate.usdToPkr;

  return (
    <main className="store-shell">
      <StoreHeader />
      <div className="store-container py-10 sm:py-14">
        <div>
          <span className="eyebrow">Secure checkout</span>
          <h1 className="section-title mt-3">Finish with confidence.</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-[#64748B]">Your order is created server-side, payment status is verified, and digital access is issued only after confirmation.</p>
        </div>
        <div className="mt-9">
          {cart?.items.length && studyBasketItemCount(cart.items) >= STUDY_BASKET_MIN_ITEMS ? (
            <CheckoutOptions cart={cart} exchangeRate={exchangeRate} />
          ) : cart?.items.length ? (
            <div className="rounded-3xl border border-[#D4AF37]/40 bg-[#FFFBEB] p-6 text-center sm:p-9">
              <h2 className="text-2xl font-black text-[#0B1D3A]">Add a few more study picks.</h2>
              <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[#64748B]">Checkout opens when your basket has at least {STUDY_BASKET_MIN_ITEMS} items. You have {studyBasketItemCount(cart.items)} so far — add more notes to unlock 10% off.</p>
              <Link href="/store/ilm-ai-notes" className="gold-btn mt-6 inline-flex min-h-12 px-6">Explore study notes</Link>
            </div>
          ) : (
            <div className="empty-state">
              <h2 className="text-2xl font-black text-[#0B1D3A]">Your study basket is empty.</h2>
              <Link href="/store" className="gold-btn mt-6 inline-flex min-h-12 px-6">Browse the store</Link>
            </div>
          )}
        </div>
      </div>
      <StoreFooter />
    </main>
  );
}
