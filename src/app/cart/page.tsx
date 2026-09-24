import { CartService } from "@/services/CartService";
import { CartLineItems } from "@/components/store/cart-line-items";
import { StoreHeader } from "@/components/store/store-header";
import { StoreFooter } from "@/components/store/store-footer";

export const dynamic = "force-dynamic";

export default async function CartPage() {
  const cart = await CartService.getCurrentCart();

  return (
    <main className="store-shell">
      <StoreHeader />
      <div className="store-container py-10 sm:py-14">
        <div>
          <span className="eyebrow">Your study picks</span>
          <h1 className="section-title mt-3">Your study basket.</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-[#64748B]">Collect the notes, books and other study resources you need here, then check out once you are ready.</p>
        </div>
        <CartLineItems cart={cart ?? { id: "empty", items: [], subtotal: { amountMinor: 0, currency: "PKR" } }} />
      </div>
      <StoreFooter />
    </main>
  );
}
