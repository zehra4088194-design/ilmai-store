"use client";

import { useEffect, useState } from "react";
import { ShoppingBag } from "lucide-react";
import type { Cart } from "@/types/domain";
import { onCartUpdate } from "./cart-events";

function countOf(cart: Cart | null | undefined): number {
  return cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
}

/** Header cart icon + item-count badge. Fetches the real cart on mount and
 * stays in sync with any "Add to bag" action elsewhere on the page. */
export function CartBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/cart")
      .then((res) => (res.ok ? res.json() : null))
      .then((cart: Cart | null) => { if (!cancelled) setCount(countOf(cart)); })
      .catch(() => {});
    const unsubscribe = onCartUpdate((cart) => setCount(countOf(cart)));
    return () => { cancelled = true; unsubscribe(); };
  }, []);

  return (
    <a href="/cart" aria-label="Shopping bag" className="relative rounded-full border bg-white/60 p-3 hover:bg-white">
      <ShoppingBag size={18} />
      {count > 0 && <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-[#0F766E] text-[10px] font-bold text-white">{count}</span>}
    </a>
  );
}
