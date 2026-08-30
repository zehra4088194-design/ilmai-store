import Link from "next/link";
import { CartService } from "@/services/CartService";
import { getPlatformSettings } from "@/lib/platform-settings/server";
import { manualPaymentTotalPkr } from "@/lib/pricing";
import { CheckoutOptions } from "@/components/checkout/CheckoutOptions";
import { StoreHeader } from "@/components/store/store-header";
import { StoreFooter } from "@/components/store/store-footer";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const [cart, settings] = await Promise.all([CartService.getCurrentCart(), getPlatformSettings()]);
  const exchangeRate = settings.exchangeRate.usdToPkr;
  const totalPkr = cart ? manualPaymentTotalPkr(cart.subtotal.amountMinor, cart.subtotal.currency, exchangeRate) : 0;

  return (
    <main className="store-shell">
      <StoreHeader />
      <div className="store-container py-10 sm:py-14">
        <div>
          <span className="eyebrow">Secure checkout</span>
          <h1 className="section-title mt-3">Finish with confidence.</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-[#718184]">Your order is created server-side, payment status is verified, and digital access is issued only after confirmation.</p>
        </div>
        <div className="mt-9">
          {cart?.items.length ? (
            <CheckoutOptions cart={cart} exchangeRate={exchangeRate} totalPkr={totalPkr} />
          ) : (
            <div className="empty-state">
              <h2 className="text-2xl font-black text-[#112d33]">Your bag is empty.</h2>
              <Link href="/store" className="gold-btn mt-6 inline-flex min-h-12 px-6">Browse the store</Link>
            </div>
          )}
        </div>
      </div>
      <StoreFooter />
    </main>
  );
}
