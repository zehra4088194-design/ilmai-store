"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BadgeCheck, BookOpen, Download, Facebook, Heart, Minus, Plus, Share2, ShieldCheck, Star, Truck, Twitter } from "lucide-react";
import type { Product, ProductVariant } from "@/types/domain";
import { AddToBagButton } from "@/components/store/add-to-bag-button";

function money(m: { amountMinor: number; currency: string }) {
  return `${m.currency} ${new Intl.NumberFormat("en-PK").format(m.amountMinor / 100)}`;
}

export function ProductDetail({ product }: { product: Product }) {
  const [variant, setVariant] = useState<ProductVariant | undefined>(product.variants.find((v) => v.isDefault) ?? product.variants[0]);
  const [activeImage, setActiveImage] = useState(0);
  const [liked, setLiked] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const router = useRouter();
  const [buying, setBuying] = useState(false);
  const images = product.media.filter((item) => item.mediaType !== "digital_file");
  const price = variant?.price ?? product.basePrice;
  const digital = ["digital", "course", "notes", "test_series"].includes(product.productType);

  const bullets = useMemo(() => [
    "Complete, topic-wise coverage — nothing skipped.",
    "Easy to learn and revise before exams.",
    digital ? "Instant access after successful payment." : "Made for delivery within Pakistan.",
    "Follows the latest board/curriculum syllabus.",
  ], [digital]);

  return (
    <div className="grid gap-9 lg:grid-cols-[1fr_1.05fr] lg:items-start">
      <div>
        <div className="relative aspect-square overflow-hidden rounded-2xl border border-[var(--line)] bg-gradient-to-br from-[#16324a] to-[#112d33]">
          {images.length ? (
            <img src={images[activeImage]?.url} alt={images[activeImage]?.altText ?? product.title} className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full place-items-center">
              <BookOpen size={110} strokeWidth={1} className="text-white/25" />
            </div>
          )}
          <button
            type="button"
            onClick={() => setLiked((v) => !v)}
            aria-label={liked ? "Remove from wishlist" : "Add to wishlist"}
            className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/90 text-[#112d33]"
          >
            <Heart size={17} fill={liked ? "currentColor" : "none"} />
          </button>
        </div>

        <div className="mt-3 flex gap-3 overflow-x-auto">
          {(images.length ? images : [null, null, null]).map((media, index) => (
            <button
              key={media?.id ?? index}
              onClick={() => setActiveImage(index)}
              className={`grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl border-2 bg-[#eef2ee] ${index === activeImage ? "border-[#f4bf43]" : "border-[var(--line)]"}`}
            >
              {media ? <img src={media.url} alt={media.altText ?? product.title} className="h-full w-full object-cover" /> : <BookOpen size={20} className="text-[#112d33]/25" />}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-black uppercase tracking-[.12em] text-[#7a8d90]">{product.productType.replaceAll("_", " ")}</p>
        <h1 className="mt-2 text-3xl font-black leading-tight tracking-[-.03em] text-[#112d33] sm:text-4xl">{product.title}</h1>

        <div className="mt-3 flex items-center gap-4 text-sm">
          <div className="rating-row">{Array.from({ length: 5 }).map((_, i) => <Star key={i} size={15} fill="currentColor" />)}</div>
          <span className="text-[#7a8d90]">New listing</span>
        </div>

        <div className="mt-5 flex items-baseline gap-3">
          <span className="text-4xl font-black tracking-[-.03em] text-[#112d33]">{money(price)}</span>
          {digital && <span className="rounded-full bg-[#e8f1eb] px-3 py-1.5 text-[10px] font-black uppercase tracking-[.1em] text-[#1a7775]">Instant access</span>}
        </div>

        {product.description && <p className="mt-5 text-[15px] leading-7 text-[#5f7476]">{product.description}</p>}

        <div className="mt-6 grid gap-2.5">
          {bullets.map((item) => (
            <div key={item} className="flex items-start gap-2.5 text-sm leading-6 text-[#4c6265]">
              <BadgeCheck size={16} className="mt-0.5 shrink-0 text-[#1a7775]" /> {item}
            </div>
          ))}
        </div>

        {product.variants.length > 1 && (
          <div className="mt-7">
            <p className="mb-2.5 text-xs font-black uppercase tracking-[.12em] text-[#7a8d90]">Choose an option</p>
            <div className="flex flex-wrap gap-2">
              {product.variants.map((v) => (
                <button key={v.id} onClick={() => setVariant(v)} className={`rounded-full border px-4 py-2 text-sm font-bold transition ${variant?.id === v.id ? "border-[#112d33] bg-[#112d33] text-white" : "bg-white text-[#112d33] hover:border-[#aac5bf]"}`}>
                  {v.name} · {money(v.price)}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-7 flex flex-wrap items-center gap-3">
          <div className="qty-stepper">
            <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} aria-label="Decrease quantity"><Minus size={14} /></button>
            <span>{quantity}</span>
            <button type="button" onClick={() => setQuantity((q) => Math.min(99, q + 1))} aria-label="Increase quantity"><Plus size={14} /></button>
          </div>
          <AddToBagButton
            variantId={variant?.id}
            quantity={quantity}
            label="Add to Cart"
            className="flex min-h-[46px] flex-1 items-center justify-center gap-2 rounded-xl border-2 border-[#112d33] px-6 text-sm font-black text-[#112d33] transition hover:bg-[#112d33] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          />
          <button
            type="button"
            disabled={!variant?.id || buying}
            onClick={async () => {
              if (!variant?.id) return;
              setBuying(true);
              try {
                const response = await fetch("/api/cart", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ variantId: variant.id, quantity }),
                });
                if (!response.ok) throw new Error("Could not add this item to your bag.");
                router.push("/checkout");
              } finally {
                setBuying(false);
              }
            }}
            className="gold-btn min-h-[46px] flex-1 px-6"
          >
            {buying ? "Preparing…" : "Buy Now"}
          </button>
        </div>

        {!!product.categories.length && (
          <div className="mt-6 flex flex-wrap items-center gap-2 text-sm">
            <span className="font-bold text-[#112d33]">Categories:</span>
            {product.categories.map((c) => (
              <Link key={c.id} href={`/store?search=${encodeURIComponent(c.name)}`} className="rounded-full bg-[#eef4ee] px-3 py-1 text-xs font-bold text-[#1a7775] hover:bg-[#dcece0]">{c.name}</Link>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center gap-3 text-sm text-[#4c6265]">
          <span className="font-bold text-[#112d33]">Share:</span>
          <a href="#" onClick={(e) => e.preventDefault()} className="icon-button h-9 w-9"><Facebook size={14} /></a>
          <a href="#" onClick={(e) => e.preventDefault()} className="icon-button h-9 w-9"><Twitter size={14} /></a>
          <a href="#" onClick={(e) => e.preventDefault()} className="icon-button h-9 w-9"><Share2 size={14} /></a>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-2">
          <div className="detail-trust"><ShieldCheck size={16} /><span>Secure</span></div>
          <div className="detail-trust"><BadgeCheck size={16} /><span>Official</span></div>
          <div className="detail-trust">{digital ? <Download size={16} /> : <Truck size={16} />}<span>{digital ? "Instant" : "Delivery"}</span></div>
        </div>
      </div>
    </div>
  );
}
