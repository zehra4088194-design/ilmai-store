"use client";

import { useState } from "react";
import Link from "next/link";
import { Heart, Trash2 } from "lucide-react";
import type { Product } from "@/types/domain";
import { formatMoney } from "@/lib/pricing";

function priceOf(product: Product) {
  return (product.variants.find((v) => v.isDefault) ?? product.variants[0])?.price ?? product.basePrice;
}

export function WishlistSection({ initialProducts }: { initialProducts: Product[] }) {
  const [products, setProducts] = useState(initialProducts);
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function remove(productId: string) {
    setRemovingId(productId);
    try {
      const response = await fetch(`/api/wishlist/${productId}`, { method: "DELETE" });
      if (response.ok) setProducts((current) => current.filter((p) => p.id !== productId));
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="rounded-[2rem] border bg-white p-6 sm:p-8">
      <p className="text-xs font-bold uppercase tracking-[.2em] text-[#0F766E]">Wishlist</p>
      <h2 className="display-font mt-1 text-2xl text-[#0B1D3A]">Saved for later.</h2>
      {!products.length ? (
        <p className="mt-4 text-sm text-[#64748B]">Nothing saved yet — tap the heart on any product to keep it here.</p>
      ) : (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {products.map((product) => (
            <div key={product.id} className="flex items-center justify-between gap-3 rounded-2xl border bg-[#F1F5F9] p-3">
              <Link href={`/store/${product.slug}`} className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-[#0B1D3A]">{product.title}</p>
                <p className="mt-0.5 text-xs font-semibold text-[#0F766E]">{formatMoney(priceOf(product))}</p>
              </Link>
              <button type="button" onClick={() => remove(product.id)} disabled={removingId === product.id} aria-label="Remove from wishlist" className="shrink-0 text-[#64748B] hover:text-red-700 disabled:opacity-50">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
      {!products.length && (
        <Link href="/store" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[#0F766E]">
          <Heart size={14} /> Browse the store
        </Link>
      )}
    </div>
  );
}
