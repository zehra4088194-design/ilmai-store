"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BadgeCheck, BookOpen, Download, Facebook, Heart, Minus, Plus, Share2, ShieldCheck, Star, Truck, Twitter } from "lucide-react";
import type { Product, ProductVariant } from "@/types/domain";
import { AddToBagButton } from "@/components/store/add-to-bag-button";
import { formatMoney } from "@/lib/pricing";
import { PHYSICAL_GOODS_ENABLED } from "@/constants/product";

const money = formatMoney;

export function ProductDetail({ product }: { product: Product }) {
  const [variant, setVariant] = useState<ProductVariant | undefined>(product.variants.find((v) => v.isDefault) ?? product.variants[0]);
  const [activeImage, setActiveImage] = useState(0);
  const [liked, setLiked] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const router = useRouter();
  const [buying, setBuying] = useState(false);
  const images = product.media.filter((item) => item.mediaType !== "digital_file");
  const price = variant?.price ?? product.basePrice;
  const compareAt = product.compareAtPrice && product.compareAtPrice.amountMinor > price.amountMinor ? product.compareAtPrice : undefined;
  const digital = ["digital", "course", "notes", "test_series"].includes(product.productType);
  const freeDelivery = product.deliveryFee.amountMinor === 0;
  // Stock only applies to shippable variants — digital variants never
  // carry an inventory row, so stockQuantity stays undefined for them.
  const trackingStock = variant?.requiresShipping && variant.stockQuantity !== undefined;
  const outOfStock = trackingStock && variant!.stockQuantity! <= 0;
  const lowStock = trackingStock && !outOfStock && variant!.stockQuantity! <= (variant!.lowStockThreshold ?? 5);

  const bullets = useMemo(() => [
    "Complete, topic-wise coverage — nothing skipped.",
    "Easy to learn and revise before exams.",
    digital || !PHYSICAL_GOODS_ENABLED ? "Instant access after successful payment." : "Made for delivery within Pakistan.",
    "Follows the latest board/curriculum syllabus.",
  ], [digital]);

  return (
    <div className="grid gap-9 lg:grid-cols-[1fr_1.05fr] lg:items-start">
      <div>
        <div className="relative aspect-square overflow-hidden rounded-2xl border border-[var(--line)] bg-gradient-to-br from-[#142a52] to-[#0B1D3A]">
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
            className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/90 text-[#0B1D3A]"
          >
            <Heart size={17} fill={liked ? "currentColor" : "none"} />
          </button>
        </div>

        <div className="mt-3 flex gap-3 overflow-x-auto">
          {(images.length ? images : [null, null, null]).map((media, index) => (
            <button
              key={media?.id ?? index}
              onClick={() => setActiveImage(index)}
              className={`grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl border-2 bg-[#F1F5F9] ${index === activeImage ? "border-[#2563EB]" : "border-[var(--line)]"}`}
            >
              {media ? <img src={media.url} alt={media.altText ?? product.title} className="h-full w-full object-cover" /> : <BookOpen size={20} className="text-[#0B1D3A]/25" />}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-black uppercase tracking-[.12em] text-[#64748B]">{product.productType.replaceAll("_", " ")}</p>
        <h1 className="mt-2 text-3xl font-black leading-tight tracking-[-.03em] text-[#0B1D3A] sm:text-4xl">{product.title}</h1>

        <div className="mt-3 flex items-center gap-4 text-sm">
          <div className="rating-row">{Array.from({ length: 5 }).map((_, i) => <Star key={i} size={15} fill="currentColor" />)}</div>
          <span className="text-[#64748B]">New listing</span>
        </div>

        <div className="mt-5 flex flex-wrap items-baseline gap-3">
          {compareAt && <span className="text-lg font-bold text-[#94A3B8] line-through">{money(compareAt)}</span>}
          <span className="text-4xl font-black tracking-[-.03em] text-[#0B1D3A]">{money(price)}</span>
          {digital && <span className="rounded-full bg-[#DCFCE7] px-3 py-1.5 text-[10px] font-black uppercase tracking-[.1em] text-[#2563EB]">Instant access</span>}
        </div>
        <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-[.1em] text-[#2563EB]">
          {digital || !PHYSICAL_GOODS_ENABLED
            ? <><Download size={13} /> Instant digital delivery</>
            : freeDelivery
              ? <><Truck size={13} /> Free delivery on this order</>
              : <><Truck size={13} /> Delivery: {money(product.deliveryFee)}</>}
        </p>
        {trackingStock && (
          outOfStock
            ? <p className="mt-2 text-xs font-black uppercase tracking-[.1em] text-red-600">Out of stock</p>
            : <p className={`mt-2 text-xs font-black uppercase tracking-[.1em] ${lowStock ? "text-amber-600" : "text-[#64748B]"}`}>{lowStock ? `Only ${variant!.stockQuantity} left in stock` : `${variant!.stockQuantity} in stock`}</p>
        )}

        {product.description && <p className="mt-5 text-[15px] leading-7 text-[#64748B]">{product.description}</p>}

        <div className="mt-6 grid gap-2.5">
          {bullets.map((item) => (
            <div key={item} className="flex items-start gap-2.5 text-sm leading-6 text-[#64748B]">
              <BadgeCheck size={16} className="mt-0.5 shrink-0 text-[#2563EB]" /> {item}
            </div>
          ))}
        </div>

        {product.variants.length > 1 && (
          <div className="mt-7">
            <p className="mb-2.5 text-xs font-black uppercase tracking-[.12em] text-[#64748B]">Choose an option</p>
            <div className="flex flex-wrap gap-2">
              {product.variants.map((v) => (
                <button key={v.id} onClick={() => setVariant(v)} className={`rounded-full border px-4 py-2 text-sm font-bold transition ${variant?.id === v.id ? "border-[#0B1D3A] bg-[#0B1D3A] text-white" : "bg-white text-[#0B1D3A] hover:border-[#CBD5E1]"}`}>
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
            label={outOfStock ? "Out of stock" : "Add to Cart"}
            disabled={outOfStock}
            className="flex min-h-[46px] flex-1 items-center justify-center gap-2 rounded-xl border-2 border-[#0B1D3A] px-6 text-sm font-black text-[#0B1D3A] transition hover:bg-[#0B1D3A] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          />
          <button
            type="button"
            disabled={!variant?.id || buying || outOfStock}
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
            {buying ? "Preparing…" : outOfStock ? "Out of stock" : "Buy Now"}
          </button>
        </div>

        {!!product.categories.length && (
          <div className="mt-6 flex flex-wrap items-center gap-2 text-sm">
            <span className="font-bold text-[#0B1D3A]">Categories:</span>
            {product.categories.map((c) => (
              <Link key={c.id} href={`/store?search=${encodeURIComponent(c.name)}`} className="rounded-full bg-[#F1F5F9] px-3 py-1 text-xs font-bold text-[#2563EB] hover:bg-[#DCFCE7]">{c.name}</Link>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center gap-3 text-sm text-[#64748B]">
          <span className="font-bold text-[#0B1D3A]">Share:</span>
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
