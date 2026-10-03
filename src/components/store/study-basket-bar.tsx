"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Gift, ShoppingBag, X } from "lucide-react";
import { usePathname } from "next/navigation";
import type { Cart } from "@/types/domain";
import { onCartUpdate } from "./cart-events";
import { formatMoney, STUDY_BASKET_DISCOUNT_PERCENT, STUDY_BASKET_MIN_ITEMS, studyBasketDiscountMinor, studyBasketItemCount } from "@/lib/pricing";

export function StudyBasketBar() {
  const pathname = usePathname();
  const [cart, setCart] = useState<Cart | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let receivedUpdate = false;
    const unsubscribe = onCartUpdate((nextCart) => {
      receivedUpdate = true;
      setCart(nextCart);
      setIsOpen(true);
      setLoadError(null);
    });

    fetch("/api/cart")
      .then(async (response) => {
        const data = await response.json() as Cart | { error?: string };
        if (!response.ok) throw new Error(("error" in data && data.error) || "Your study basket could not be loaded.");
        return data as Cart;
      })
      .then((nextCart) => {
        if (!cancelled && !receivedUpdate) {
          setCart(nextCart);
          setIsOpen(nextCart.items.length > 0);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : "Your study basket could not be loaded.");
      });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  if (pathname === "/cart" || pathname === "/checkout") return null;

  const count = studyBasketItemCount(cart?.items ?? []);
  const subtotalMinor = cart?.subtotal.amountMinor ?? 0;
  const currency = cart?.subtotal.currency ?? "PKR";
  const discountMinor = studyBasketDiscountMinor(cart?.items ?? [], subtotalMinor);
  const discountedSubtotalMinor = Math.max(0, subtotalMinor - discountMinor);
  const remaining = Math.max(0, STUDY_BASKET_MIN_ITEMS - count);

  if (!count) {
    return loadError ? (
      <div role="alert" className="fixed bottom-4 right-4 z-30 max-w-sm rounded-2xl border border-red-200 bg-[var(--surface-strong)] p-4 text-sm font-semibold text-red-800 shadow-xl">
        {loadError}
      </div>
    ) : null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-30 flex w-[min(360px,calc(100vw-2rem))] flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      {isOpen && (
        <section aria-label="Your study basket" className="w-full overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface-strong)] shadow-[0_18px_55px_rgba(11,29,58,.2)]">
          <div className="flex items-center gap-3 bg-[var(--chrome)] p-4 text-white">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--surface-strong)]/10 text-[var(--commerce)]"><ShoppingBag size={19} /></span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black uppercase tracking-[.12em] text-[var(--commerce)]">Your study basket</p>
              <p className="mt-0.5 text-sm font-bold">{count} {count === 1 ? "item" : "items"} picked</p>
            </div>
            <button type="button" onClick={() => setIsOpen(false)} aria-label="Collapse study basket" className="grid h-9 w-9 place-items-center rounded-full text-white/70 hover:bg-[var(--surface-strong)]/10 hover:text-white"><X size={17} /></button>
          </div>

          <div className="max-h-64 divide-y divide-[var(--border)] overflow-y-auto px-4">
            {cart?.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="line-clamp-2 text-sm font-bold leading-snug text-[var(--foreground)]">{item.productTitle}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">{item.variantName} · Qty {item.quantity}</p>
                </div>
                <span className="shrink-0 text-xs font-black text-[var(--foreground)]">{formatMoney({ amountMinor: item.unitPrice.amountMinor * item.quantity, currency: item.unitPrice.currency })}</span>
              </div>
            ))}
          </div>

          <div className="p-4">
            {remaining > 0 ? (
              <div className="rounded-2xl bg-[var(--gray)] p-3">
                <div className="flex items-center gap-2 text-xs font-bold text-[var(--foreground)]"><Gift size={15} className="text-[var(--brand-primary)]" /> Add {remaining} more {remaining === 1 ? "item" : "items"} for {STUDY_BASKET_DISCOUNT_PERCENT}% off</div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--border)]">
                  <div className="h-full rounded-full bg-[var(--brand-primary)] transition-all" style={{ width: `${Math.min(100, count / STUDY_BASKET_MIN_ITEMS * 100)}%` }} />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-2xl bg-[var(--success-soft)] p-3 text-xs font-black text-[#15803d]">
                <Check size={15} /> {STUDY_BASKET_DISCOUNT_PERCENT}% basket discount applied
              </div>
            )}

            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="font-semibold text-[var(--muted)]">Subtotal</span>
              <span className="font-black text-[var(--foreground)]">{formatMoney({ amountMinor: subtotalMinor, currency })}</span>
            </div>
            {discountMinor > 0 && (
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="font-semibold text-[#15803d]">10% off</span>
                <span className="font-black text-[#15803d]">−{formatMoney({ amountMinor: discountMinor, currency })}</span>
              </div>
            )}
            <div className="mt-3 flex items-center justify-between border-t border-[var(--border)] pt-3">
              <span className="text-sm font-black text-[var(--foreground)]">Items total</span>
              <span className="text-lg font-black text-[var(--foreground)]">{formatMoney({ amountMinor: discountedSubtotalMinor, currency })}</span>
            </div>
            <p className="mt-1 text-right text-[10px] text-[var(--muted)]">Delivery, if needed, is calculated at checkout.</p>
            <Link href="/cart" className="gold-btn mt-4 min-h-11 w-full text-sm">
              View basket <ArrowRight size={15} />
            </Link>
          </div>
        </section>
      )}

      <button type="button" onClick={() => setIsOpen((open) => !open)} aria-expanded={isOpen} aria-label={`${count} items in study basket`} className="flex items-center gap-3 rounded-full border border-white/20 bg-[var(--chrome)] py-2.5 pl-3 pr-5 text-left text-white shadow-[0_12px_35px_rgba(11,29,58,.24)] transition hover:-translate-y-0.5">
        <span className="relative grid h-10 w-10 place-items-center rounded-full bg-[var(--commerce)] text-[var(--foreground)]"><ShoppingBag size={18} /><span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[var(--brand-primary)] px-1 text-[10px] font-black text-white">{count}</span></span>
        <span><span className="block text-xs font-black uppercase tracking-[.1em]">Study basket</span><span className="mt-0.5 block text-[11px] text-white/70">{remaining ? `${remaining} more for 10% off` : "10% discount unlocked"}</span></span>
      </button>
    </div>
  );
}
