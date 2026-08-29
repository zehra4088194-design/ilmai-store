"use client";

import { useState } from "react";
import { Loader2, Minus, Plus, Trash2 } from "lucide-react";
import type { Cart } from "@/types/domain";
import { broadcastCartUpdate } from "./cart-events";
import Link from "next/link";

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
    return <div className="mt-10 rounded-[2rem] border bg-white p-10 text-center"><h1 className="display-font text-4xl">Your bag is empty.</h1><Link href="/store" className="mt-6 inline-flex rounded-full bg-[#103d42] px-5 py-3 text-sm font-bold text-white">Browse the store</Link></div>;
  }

  return <div className="mt-8 grid gap-8 lg:grid-cols-[1.6fr_1fr] lg:items-start">
    <div className="grid gap-4">
      {cart.items.map((item) => <div key={item.id} className="flex items-center gap-4 rounded-[1.5rem] border bg-white/70 p-4">
        <div className="min-w-0 flex-1">
          <p className="font-bold text-[#103d42]">{item.productTitle}</p>
          <p className="text-xs text-[#789094]">{item.variantName}</p>
          <p className="mt-1 text-sm font-semibold text-[#14777a]">{money(item.unitPrice)}</p>
        </div>
        <div className="flex items-center gap-2 rounded-full border bg-white px-2 py-1">
          <button aria-label="Decrease quantity" onClick={() => updateQuantity(item.id, item.quantity - 1)} disabled={pendingId === item.id} className="grid h-7 w-7 place-items-center rounded-full text-[#103d42] hover:bg-[#edf3ef] disabled:opacity-50">
            {item.quantity === 1 ? <Trash2 size={13} /> : <Minus size={13} />}
          </button>
          <span className="w-5 text-center text-sm font-bold">{pendingId === item.id ? <Loader2 size={13} className="mx-auto animate-spin" /> : item.quantity}</span>
          <button aria-label="Increase quantity" onClick={() => updateQuantity(item.id, item.quantity + 1)} disabled={pendingId === item.id} className="grid h-7 w-7 place-items-center rounded-full text-[#103d42] hover:bg-[#edf3ef] disabled:opacity-50">
            <Plus size={13} />
          </button>
        </div>
        <p className="w-24 shrink-0 text-right font-bold text-[#103d42]">{money({ amountMinor: item.unitPrice.amountMinor * item.quantity, currency: item.unitPrice.currency })}</p>
      </div>)}
    </div>
    <div className="rounded-[1.75rem] border bg-white/70 p-6">
      <p className="text-xs font-bold uppercase tracking-widest text-[#14777a]">Order summary</p>
      <div className="mt-4 flex items-center justify-between text-lg font-bold text-[#103d42]"><span>Subtotal</span><span>{money(cart.subtotal)}</span></div>
      <a href="/checkout" className="mt-6 flex w-full items-center justify-center rounded-full bg-[#103d42] py-3.5 text-sm font-bold text-white transition hover:bg-[#14777a]">Proceed to checkout</a>
      <Link href="/store" className="mt-3 flex w-full items-center justify-center rounded-full border py-3 text-sm font-bold text-[#103d42] hover:bg-white">Continue shopping</Link>
    </div>
  </div>;
}
