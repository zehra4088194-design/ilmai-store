import Link from "next/link";
import { CartService } from "@/services/CartService";
import { getPlatformSettings } from "@/lib/platform-settings/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CheckoutOptions } from "@/components/checkout/CheckoutOptions";
import { StoreHeader } from "@/components/store/store-header";
import { StoreFooter } from "@/components/store/store-footer";
import { SHOPKEEPER_QR_PRODUCT_SLUG } from "@/constants/shopkeeper";
import { STUDY_BASKET_MIN_ITEMS, studyBasketItemCount } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const [cart, settings, auth] = await Promise.all([
    CartService.getCurrentCart(),
    getPlatformSettings(),
    (async () => (await createSupabaseServerClient()).auth.getUser())(),
  ]);
  const exchangeRate = settings.exchangeRate.usdToPkr;
  const user = auth.data.user;
  const shopkeeperItems = cart?.items.filter((item) => item.productSlug === SHOPKEEPER_QR_PRODUCT_SLUG) ?? [];
  const hasShopkeeperQr = shopkeeperItems.length > 0;
  const validShopkeeperCart = hasShopkeeperQr && cart?.items.length === 1 && shopkeeperItems[0]?.quantity === 1;
  const studyCheckoutAllowed = !hasShopkeeperQr && Boolean(cart?.items.length) && studyBasketItemCount(cart?.items ?? []) >= STUDY_BASKET_MIN_ITEMS;

  return (
    <main className="store-shell">
      <StoreHeader />
      <div className="store-container py-10 sm:py-14">
        <div>
          <span className="eyebrow">Secure checkout</span>
          <h1 className="section-title mt-3">Finish with confidence.</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--muted)]">Your order is created server-side, payment status is verified, and digital access is issued only after confirmation.</p>
        </div>
        <div className="mt-9">
          {cart?.items.length && hasShopkeeperQr && !user ? (
            <div className="rounded-3xl border bg-white p-7 text-center shadow-sm sm:p-12">
              <h2 className="text-2xl font-black text-[var(--foreground)]">Sign in to purchase the shopkeeper QR service.</h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[var(--muted)]">Your QR service access must be linked to your IlmAI Store account so your shopkeeper portal remains private to you.</p>
              <Link href="/login" className="gold-btn mt-6 inline-flex min-h-12 px-6">Sign in</Link>
            </div>
          ) : cart?.items.length && hasShopkeeperQr && !validShopkeeperCart ? (
            <div className="rounded-3xl border border-amber-200 bg-white p-7 text-center shadow-sm sm:p-12">
              <h2 className="text-2xl font-black text-[var(--foreground)]">Purchase the shopkeeper QR service separately.</h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[var(--muted)]">The Dynamic JazzCash QR service is a standalone merchant service. Remove the other Store items or complete their purchase separately.</p>
              <Link href="/store" className="gold-btn mt-6 inline-flex min-h-12 px-6">Back to Store</Link>
            </div>
          ) : cart?.items.length && (validShopkeeperCart || studyCheckoutAllowed) ? (
            <CheckoutOptions cart={cart} exchangeRate={exchangeRate} />
          ) : cart?.items.length ? (
            <div className="rounded-3xl border border-[rgba(245,158,11,.40)] bg-[var(--warning-soft)] p-6 text-center sm:p-9">
              <h2 className="text-2xl font-black text-[var(--foreground)]">Add a few more study picks.</h2>
              <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[var(--muted)]">Checkout opens when your basket has at least {STUDY_BASKET_MIN_ITEMS} items. You have {studyBasketItemCount(cart.items)} so far — add more notes to unlock 10% off.</p>
              <Link href="/store/ilm-ai-notes" className="gold-btn mt-6 inline-flex min-h-12 px-6">Explore study notes</Link>
            </div>
          ) : (
            <div className="empty-state">
              <h2 className="text-2xl font-black text-[var(--foreground)]">Your study basket is empty.</h2>
              <Link href="/store" className="gold-btn mt-6 inline-flex min-h-12 px-6">Browse the store</Link>
            </div>
          )}
        </div>
      </div>
      <StoreFooter />
    </main>
  );
}
