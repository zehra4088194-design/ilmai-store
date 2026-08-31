"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Loader2, Minus, Plus, ShieldCheck, ShoppingBag, Trash2, Truck } from "lucide-react";
import type { Cart } from "@/types/domain";
import { broadcastCartUpdate } from "./cart-events";

function money(m: { amountMinor: number; currency: string }) {
  return `${m.currency} ${new Intl.NumberFormat("en-PK").format(m.amountMinor / 100)}`;
}

export function CartLineItems({ cart: initialCart }: { cart: Cart }) {
  const [cart, setCart] = useState(initialCart);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function updateQuantity(cartItemId: string, quantity: number) {
    setPendingId(cartItemId);
    try {
      const res = await fetch("/api/cart", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cartItemId, quantity }),
      });
      if (!res.ok) return;
      const updated = (await res.json()) as Cart;
      setCart(updated);
      broadcastCartUpdate(updated);
    } finally {
      setPendingId(null);
    }
  }

  if (cart.items.length === 0) {
    return (
      <div className="empty-state mt-9">
        <div className="grid h-16 w-16 place-items-center rounded-[22px] bg-[#F1F5F9] text-[#2563EB]"><ShoppingBag size={26} /></div>
        <h1 className="mt-5 text-2xl font-black text-[#0B1D3A]">Your cart is empty.</h1>
        <p className="mt-2 max-w-sm text-sm leading-6 text-[#64748B]">Add a note, book or course and come back here when you are ready to check out.</p>
        <Link href="/store" className="gold-btn mt-6 min-h-12 px-6">Browse the shelf <ArrowRight size={15} /></Link>
      </div>
    );
  }

  const delivery = cart.items.some((i) => i.productType === "physical" || i.productType === "book") ? 150_00 : 0;
  const total = cart.subtotal.amountMinor + delivery;

  return (
    <div className="mt-9 grid gap-7 lg:grid-cols-[1.6fr_.85fr] lg:items-start">
      <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white">
        <div className="hidden grid-cols-[2.2fr_.8fr_1fr_.9fr] gap-4 border-b border-[var(--line)] bg-[#F1F5F9] px-5 py-3 text-[11px] font-black uppercase tracking-[.1em] text-[#64748B] sm:grid">
          <span>Product</span><span>Price</span><span>Quantity</span><span className="text-right">Subtotal</span>
        </div>
        <div className="divide-y divide-[var(--line)]">
          {cart.items.map((item) => (
            <div key={item.id} className="grid gap-4 p-4 sm:grid-cols-[2.2fr_.8fr_1fr_.9fr] sm:items-center sm:px-5">
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
        <h2 className="text-sm font-black uppercase tracking-[.1em] text-[#0B1D3A]">Cart Totals</h2>
        <div className="mt-5 grid gap-3 border-b border-[var(--line)] pb-5 text-sm">
          <div className="flex justify-between text-[#64748B]"><span>Subtotal</span><span className="font-bold text-[#0B1D3A]">{money(cart.subtotal)}</span></div>
          <div className="flex justify-between text-[#64748B]"><span>Delivery</span><span className="font-bold text-[#0B1D3A]">{delivery ? money({ amountMinor: delivery, currency: cart.subtotal.currency }) : "Free"}</span></div>
        </div>
        <div className="mt-5 flex items-center justify-between">
          <span className="text-sm font-black text-[#0B1D3A]">Total</span>
          <span className="text-2xl font-black text-[#0B1D3A]">{money({ amountMinor: total, currency: cart.subtotal.currency })}</span>
        </div>
        <Link href="/checkout" className="gold-btn mt-6 flex min-h-[52px] w-full">Proceed to Checkout <ArrowRight size={15} /></Link>
        <Link href="/store" className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[var(--line)] text-sm font-bold text-[#0B1D3A] hover:bg-[#F1F5F9]"><ArrowLeft size={14} /> Continue Shopping</Link>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <div className="detail-trust"><ShieldCheck size={14} /><span>Secure checkout</span></div>
          <div className="detail-trust"><Truck size={14} /><span>Fast delivery</span></div>
        </div>
      </aside>
    </div>
  );
}
