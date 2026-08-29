"use client";

import { useState } from "react";
import { BookOpen } from "lucide-react";
import type { Product, ProductVariant } from "@/types/domain";
import { AddToBagButton } from "@/components/store/add-to-bag-button";

function money(m: { amountMinor: number; currency: string }) {
  return `${m.currency} ${new Intl.NumberFormat("en-PK").format(m.amountMinor / 100)}`;
}

export function ProductDetail({ product }: { product: Product }) {
  const [variant, setVariant] = useState<ProductVariant | undefined>(product.variants.find((v) => v.isDefault) ?? product.variants[0]);
  const images = product.media.length ? product.media : [];
  const [activeImage, setActiveImage] = useState(0);
  const price = variant?.price ?? product.basePrice;

  return <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
    <div>
      <div className="grain relative flex h-80 items-center justify-center overflow-hidden rounded-[2rem] border bg-[#e9f1e8] sm:h-[420px]">
        {images.length
          ? <img src={images[activeImage]?.url} alt={images[activeImage]?.altText ?? product.title} className="h-full w-full object-cover" />
          : <BookOpen className="text-[#103d42]/20" size={120} strokeWidth={1} />}
      </div>
      {images.length > 1 && <div className="mt-4 flex gap-3">
        {images.map((m, i) => <button key={m.id} onClick={() => setActiveImage(i)} className={`h-16 w-16 overflow-hidden rounded-xl border-2 ${i === activeImage ? "border-[#14777a]" : "border-transparent"}`}>
          <img src={m.url} alt={m.altText ?? product.title} className="h-full w-full object-cover" />
        </button>)}
      </div>}
    </div>
    <div>
      <p className="text-xs font-bold uppercase tracking-[.2em] text-[#14777a]">{product.productType.replace("_", " ")}</p>
      <h1 className="display-font mt-3 text-4xl leading-tight text-[#103d42] sm:text-5xl">{product.title}</h1>
      <p className="mt-4 text-lg font-bold text-[#14777a]">{money(price)}</p>
      {product.description && <p className="mt-5 max-w-lg text-base leading-7 text-[#5e7477]">{product.description}</p>}

      {product.variants.length > 1 && <div className="mt-7">
        <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[#103d42]">Choose an option</p>
        <div className="flex flex-wrap gap-2">
          {product.variants.map((v) => <button key={v.id} onClick={() => setVariant(v)} className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${variant?.id === v.id ? "border-[#103d42] bg-[#103d42] text-white" : "border-[#d7e3e0] text-[#103d42] hover:bg-white"}`}>
            {v.name} · {money(v.price)}
          </button>)}
        </div>
      </div>}

      <div className="mt-8 max-w-xs">
        <AddToBagButton variantId={variant?.id} className="flex w-full items-center justify-center gap-2 rounded-full bg-[#103d42] py-3.5 text-sm font-bold text-white transition hover:bg-[#14777a] disabled:cursor-not-allowed disabled:opacity-60" />
      </div>
    </div>
  </div>;
}
