"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ShoppingBag } from "lucide-react";
import type { Cart } from "@/types/domain";
import { onCartUpdate } from "./cart-events";
import { formatMoney } from "@/lib/pricing";

function itemCount(cart: Cart | null): number {
  return cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
}

export function StudyBasketBar() {
  const [cart, setCart] = useState<Cart | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/cart")
      .then((response) => (response.ok ? response.json() as Promise<Cart> : null))
      .then((nextCart) => {
        if (!cancelled) setCart(nextCart);
      })
      .catch(() => {});
    const unsubscribe = onCartUpdate((nextCart) => setCart(nextCart));
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const count = itemCount(cart);
  if (!count) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-30 flex justify-center px-4 sm:bottom-6">
      <div className="pointer-events-auto flex w-full max-w-xl items-center gap-3 rounded-2xl border border-[#0B1D3A]/10 bg-white/95 p-3 shadow-[0_18px_55px_rgba(11,29,58,.18)] backdrop-blur">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#0B1D3A] text-white">
          <ShoppingBag size={19} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black uppercase tracking-[.1em] text-[#0F766E]">Study Basket</p>
          <p className="truncate text-sm font-bold text-[#0B1D3A]">
            {count} {count === 1 ? "item" : "items"} saved{cart?.subtotal ? ` · ${formatMoney(cart.subtotal)}` : ""}
          </p>
        </div>
        <Link href="/cart" className="gold-btn min-h-10 shrink-0 px-4 text-xs sm:px-5 sm:text-sm">
          View Basket <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}
