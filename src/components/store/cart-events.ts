"use client";

// A tiny pub/sub so any "Add to bag" button (product card, product detail
// page, etc.) can tell the header's cart badge to refresh, without lifting
// cart state through the whole tree.
import type { Cart } from "@/types/domain";

const EVENT_NAME = "ilmai:cart-updated";

export function broadcastCartUpdate(cart: Cart) {
  window.dispatchEvent(new CustomEvent<Cart>(EVENT_NAME, { detail: cart }));
}

export function onCartUpdate(handler: (cart: Cart) => void) {
  const listener = (event: Event) => handler((event as CustomEvent<Cart>).detail);
  window.addEventListener(EVENT_NAME, listener);
  return () => window.removeEventListener(EVENT_NAME, listener);
}
