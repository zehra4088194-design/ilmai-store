import { CartService } from "@/services/CartService";
import { getPlatformSettings } from "@/lib/platform-settings/server";
import { manualPaymentTotalPkr } from "@/lib/pricing";
import { CheckoutOptions } from "@/components/checkout/CheckoutOptions";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const [cart, settings] = await Promise.all([CartService.getCurrentCart(), getPlatformSettings()]);
  const exchangeRate = settings.exchangeRate.usdToPkr;
  const totalPkr = cart ? manualPaymentTotalPkr(cart.subtotal.amountMinor, cart.subtotal.currency, exchangeRate) : 0;

  return <main className="min-h-screen bg-[#f3f6f1] px-5 py-8 text-[#103d42] sm:py-14"><div className="mx-auto max-w-6xl"><Link href="/store" className="text-sm font-bold text-[#14777a]">← Back to store</Link>{cart?.items.length ? <div className="mt-8"><CheckoutOptions cart={cart} exchangeRate={exchangeRate} totalPkr={totalPkr}/></div> : <div className="mt-10 rounded-[2rem] border bg-white p-10 text-center"><h1 className="display-font text-4xl">Your bag is empty.</h1><Link href="/store" className="mt-6 inline-flex rounded-full bg-[#103d42] px-5 py-3 text-sm font-bold text-white">Browse the store</Link></div>}</div></main>;
}
