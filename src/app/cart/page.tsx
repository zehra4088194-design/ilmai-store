import { CartService } from "@/services/CartService";
import { CartLineItems } from "@/components/store/cart-line-items";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function CartPage() {
  const cart = await CartService.getCurrentCart();

  return <main className="min-h-screen bg-[#f3f6f1] px-5 py-8 text-[#103d42] sm:py-14">
    <div className="mx-auto max-w-6xl">
      <Link href="/store" className="text-sm font-bold text-[#14777a]">← Back to store</Link>
      <h1 className="display-font mt-4 text-4xl">Your bag</h1>
      <CartLineItems cart={cart ?? { id: "empty", items: [], subtotal: { amountMinor: 0, currency: "PKR" } }} />
    </div>
  </main>;
}
