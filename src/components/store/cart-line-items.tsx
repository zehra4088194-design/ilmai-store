"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Gift, Loader2, Minus, Plus, ShieldCheck, ShoppingBag, Trash2, Truck } from "lucide-react";
import type { Cart } from "@/types/domain";
import { broadcastCartUpdate } from "./cart-events";
import { formatMoney, hasNotesItems, STUDY_BASKET_DISCOUNT_PERCENT, STUDY_BASKET_MIN_ITEMS, studyBasketDiscountMinor, studyBasketItemCount } from "@/lib/pricing";

const money = formatMoney;

export function CartLineItems({ cart: initialCart }: { cart: Cart }) {
  const [cart, setCart] = useState(initialCart);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);

  async function updateQuantity(cartItemId: string, quantity: number) {
    setPendingId(cartItemId);
    setUpdateError(null);
    try {
      const res = await fetch("/api/cart", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cartItemId, quantity }),
      });
      const data = await res.json() as Cart | { error?: string };
      if (!res.ok) throw new Error(("error" in data && data.error) || "Your basket could not be updated.");
      const updated = data as Cart;
      setCart(updated);
      broadcastCartUpdate(updated);
    } catch (error) {
      setUpdateError(error instanceof Error ? error.message : "Your basket could not be updated.");
    } finally {
      setPendingId(null);
    }
  }

  if (cart.items.length === 0) {
    return (
      <div className="empty-state mt-9">
        <div className="grid h-16 w-16 place-items-center rounded-[22px] bg-[#F1F5F9] text-[#0F766E]"><ShoppingBag size={26} /></div>
        <h1 className="mt-5 text-2xl font-black text-[#0B1D3A]">Your study basket is empty.</h1>
        <p className="mt-2 max-w-sm text-sm leading-6 text-[#64748B]">Add notes, books or courses to your basket and keep exploring until you have everything you need.</p>
        <Link href="/store" className="gold-btn mt-6 min-h-12 px-6">Browse the shelf <ArrowRight size={15} /></Link>
      </div>
    );
  }

  // The exact notes delivery tier depends on the city selected at checkout,
  // so the basket intentionally does not guess a city. Ordinary physical-product
  // fees can still be shown immediately.
  const hasNotes = hasNotesItems(cart.items);
  const shippableItems = cart.items.filter((i) => i.productType === "physical" || i.productType === "book");
  const delivery = hasNotes ? 0 : (shippableItems.length ? Math.max(...shippableItems.map((i) => i.deliveryFeeMinor)) : 0);
  const itemCount = studyBasketItemCount(cart.items);
  const remaining = Math.max(0, STUDY_BASKET_MIN_ITEMS - itemCount);
  const discount = studyBasketDiscountMinor(cart.items, cart.subtotal.amountMinor);
  const discountedSubtotal = Math.max(0, cart.subtotal.amountMinor - discount);
  const total = discountedSubtotal + delivery;

  return (
    <div className="mt-9 grid gap-7 lg:grid-cols-[1.6fr_.85fr] lg:items-start">
      <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white">
        <div className="hidden grid-cols-[2.2fr_.8fr_1fr_.9fr] gap-4 border-b border-[var(--line)] bg-[#F1F5F9] px-5 py-3 text-[11px] font-black uppercase tracking-[.1em] text-[#64748B] sm:grid">
          <span>Product</span><span>Price</span><span>Quantity</span><span className="text-right">Subtotal</span>
        </div>
        <div className="divide-y divide-[var(--line)]">
          {cart.items.map((item) => (
            <div key={item.id} className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-[2.2fr_.8fr_1fr_.9fr] sm:items-center sm:px-5">
              <div className="flex items-center gap-3">
                <div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#142a52] to-[#0B1D3A] text-white/30"><ShoppingBag size={22} /></div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-[#0B1D3A]">{item.productTitle}</p>
                  <p className="mt-0.5 text-xs font-semibold text-[#64748B]">{item.variantName}</p>
                  <button
                    onClick={() => updateQuantity(item.id, 0)}
                    className="mt-1.5 inline-flex items-center gap-1 text-xs font-bold text-[#e5484d] hover:underline"
                  >
                    <Trash2 size={12} /> Remove
                  </button>
                </div>
              </div>
              <span className="text-sm font-bold text-[#0B1D3A] sm:text-center">{money(item.unitPrice)}</span>
              <div className="qty-stepper sm:mx-auto">
                <button aria-label="Decrease quantity" onClick={() => updateQuantity(item.id, item.quantity - 1)} disabled={pendingId === item.id}>{item.quantity === 1 ? <Trash2 size={13} /> : <Minus size={13} />}</button>
                <span>{pendingId === item.id ? <Loader2 size={13} className="mx-auto animate-spin" /> : item.quantity}</span>
                <button aria-label="Increase quantity" onClick={() => updateQuantity(item.id, item.quantity + 1)} disabled={pendingId === item.id}><Plus size={13} /></button>
              </div>
              <span className="text-right text-sm font-black text-[#0B1D3A]">{money({ amountMinor: item.unitPrice.amountMinor * item.quantity, currency: item.unitPrice.currency })}</span>
            </div>
          ))}
        </div>
      </div>

      <aside className="rounded-2xl border border-[var(--line)] bg-white p-6 lg:sticky lg:top-28">
        <h2 className="text-sm font-black uppercase tracking-[.1em] text-[#0B1D3A]">Basket Summary</h2>
        {updateError && <p role="alert" className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{updateError}</p>}
        <div className="mt-4 rounded-2xl bg-[#F1F5F9] p-4">
          <p className="flex items-center gap-2 text-sm font-black text-[#0B1D3A]"><Gift size={16} className="text-[#0F766E]" /> Get 10% off your basket</p>
          {remaining > 0 ? (
            <p className="mt-2 text-xs leading-5 text-[#64748B]">Add {remaining} more {remaining === 1 ? "item" : "items"} to unlock your discount. Your basket has {itemCount} of {STUDY_BASKET_MIN_ITEMS} required.</p>
          ) : (
            <p className="mt-2 text-xs font-bold text-[#047857]">Your {STUDY_BASKET_DISCOUNT_PERCENT}% study basket discount is unlocked.</p>
          )}
        </div>
        <div className="mt-5 grid gap-3 border-b border-[var(--line)] pb-5 text-sm">
          <div className="flex justify-between text-[#64748B]"><span>Subtotal</span><span className="font-bold text-[#0B1D3A]">{money(cart.subtotal)}</span></div>
          {discount > 0 && <div className="flex justify-between text-[#047857]"><span>Study basket discount ({STUDY_BASKET_DISCOUNT_PERCENT}%)</span><span className="font-bold">−{money({ amountMinor: discount, currency: cart.subtotal.currency })}</span></div>}
          <div className="flex justify-between text-[#64748B]"><span>Delivery</span><span className="font-bold text-[#0B1D3A]">{hasNotes ? "Calculated at checkout" : delivery ? money({ amountMinor: delivery, currency: cart.subtotal.currency }) : "Free"}</span></div>
        </div>
        <div className="mt-5 flex items-center justify-between">
          <span className="text-sm font-black text-[#0B1D3A]">Total</span>
          <span className="text-2xl font-black text-[#0B1D3A]">{hasNotes ? money({ amountMinor: discountedSubtotal, currency: cart.subtotal.currency }) : money({ amountMinor: total, currency: cart.subtotal.currency })}</span>
        </div>
        {remaining === 0 ? (
          <Link href="/checkout" className="gold-btn mt-6 flex min-h-[52px] w-full">Proceed to Checkout <ArrowRight size={15} /></Link>
        ) : (
          <p className="mt-6 rounded-xl border border-[#D4AF37]/40 bg-[#FFFBEB] px-4 py-3 text-center text-sm font-bold text-[#854D0E]">Add {remaining} more {remaining === 1 ? "item" : "items"} before checkout</p>
        )}
        <Link href="/store" className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[var(--line)] text-sm font-bold text-[#0B1D3A] hover:bg-[#F1F5F9]"><ArrowLeft size={14} /> Continue Shopping</Link>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <div className="detail-trust"><ShieldCheck size={14} /><span>Secure checkout</span></div>
          <div className="detail-trust"><Truck size={14} /><span>Fast delivery</span></div>
        </div>
      </aside>
    </div>
  );
}
