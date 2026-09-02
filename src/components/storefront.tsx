"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Boxes,
  Clock,
  Cloud,
  Download,
  GraduationCap,
  Headphones,
  Heart,
  Layers3,
  Package,
  ShieldCheck,
  Sparkles,
  Tags,
  Truck,
} from "lucide-react";
import type { Banner, Category, Product } from "@/types/domain";
import { AddToBagButton } from "@/components/store/add-to-bag-button";
import { StoreFooter } from "@/components/store/store-footer";
import { StoreHeader } from "@/components/store/store-header";
import { Reveal } from "@/components/store/reveal";
import { formatMoney } from "@/lib/pricing";
import { PHYSICAL_GOODS_ENABLED } from "@/constants/product";

type Props = {
  products: Product[];
  banners?: Banner[];
  featured?: Product[];
  categories?: Category[];
  initialSearch?: string;
  catalogMode?: boolean;
  usdToPkr?: number;
};

const money = formatMoney;

function defaultVariant(product: Product) {
  return product.variants.find((v) => v.isDefault) ?? product.variants[0];
}

function primaryImage(product: Product) {
  return product.media.find((m) => m.isPrimary) ?? product.media[0];
}

function isDigital(product: Product) {
  return ["digital", "course", "notes", "test_series"].includes(product.productType);
}

// Category color-coding (design spec §8) — a stable hash-free mapping by
// slug for known categories, with a small rotation for anything custom an
// admin/seller adds later so it still looks intentional rather than gray.
const CATEGORY_COLOR: Record<string, string> = {
  books: "chip-blue",
  notes: "chip-mint",
  courses: "chip-lavender",
  "test-series": "chip-sky",
  digital: "chip-lavender",
  bundles: "chip-peach",
};
const COLOR_ROTATION = ["chip-blue", "chip-mint", "chip-lavender", "chip-sky", "chip-peach"];
function categoryChipClass(slug: string | undefined, fallbackIndex = 0) {
  if (slug && CATEGORY_COLOR[slug]) return CATEGORY_COLOR[slug];
  return COLOR_ROTATION[fallbackIndex % COLOR_ROTATION.length];
}

// Missing-photo placeholder tile — rotated per the same chip color so a grid
// of un-photographed products reads as varied, not a wall of navy blocks.
const PLACEHOLDER_GRADIENT: Record<string, string> = {
  "chip-blue": "from-[#2563EB] to-[#1d4fd1]",
  "chip-mint": "from-[#22C55E] to-[#16a34a]",
  "chip-lavender": "from-[#A78BFA] to-[#8b5cf6]",
  "chip-sky": "from-[#38BDF8] to-[#0ea5e9]",
  "chip-peach": "from-[#FDBA74] to-[#fb923c]",
  "chip-navy": "from-[var(--navy)] to-[#142a52]",
};
function placeholderGradient(chip: string | undefined) {
  return (chip && PLACEHOLDER_GRADIENT[chip]) || "from-[#2563EB] to-[#1d4fd1]";
}

const CATEGORY_ICONS: Record<string, typeof BookOpen> = {
  books: BookOpen,
  notes: Layers3,
  courses: GraduationCap,
  "test-series": Clock,
  bundles: Boxes,
  digital: Cloud,
};
const FALLBACK_ICONS = [BookOpen, Layers3, GraduationCap, Clock, Boxes, Cloud];

/** Compact by design (spec §9) — this is a marketplace grid, not a hero card. */
function ProductCard({ product, index }: { product: Product; index: number }) {
  const image = primaryImage(product);
  const variant = defaultVariant(product);
  const price = variant?.price ?? product.basePrice;
  const compareAt = product.compareAtPrice && product.compareAtPrice.amountMinor > price.amountMinor ? product.compareAtPrice : undefined;
  const digital = isDigital(product);
  const category = product.categories[0];
  const chip = categoryChipClass(category?.slug, index);
  const [liked, setLiked] = useState(false);
  const outOfStock = variant?.requiresShipping && variant.stockQuantity !== undefined && variant.stockQuantity <= 0;

  return (
    <article className="product-card-grid group relative overflow-hidden animate-pop-in" style={{ animationDelay: `${Math.min(index, 8) * 30}ms` }}>
      <Link href={`/store/${product.slug}`} className="relative block aspect-square overflow-hidden bg-[var(--gray)]">
        {image ? (
          <img src={image.url} alt={image.altText ?? product.title} className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.05]" />
        ) : (
          <div className={`absolute inset-0 grid place-items-center bg-gradient-to-br ${placeholderGradient(chip)}`}>
            <BookOpen size={48} strokeWidth={1} className="text-white/35" />
          </div>
        )}
        <button
          type="button"
          aria-label={liked ? "Remove from wishlist" : "Add to wishlist"}
          onClick={(event) => { event.preventDefault(); setLiked((v) => !v); }}
          className={`absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-white/90 shadow-sm ${liked ? "text-[#E11D48]" : "text-[var(--navy)]"}`}
        >
          <Heart size={13} fill={liked ? "currentColor" : "none"} />
        </button>
        {digital && <span className="badge badge-digital absolute left-2 top-2">Digital</span>}
        {outOfStock && <span className="badge absolute left-2 top-2 bg-[#0B1D3A] text-white">Out of stock</span>}
      </Link>

      <div className="p-2.5 sm:p-3">
        <span className={`chip ${chip} inline-block rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[.06em]`}>
          {category?.name ?? product.productType.replaceAll("_", " ")}
        </span>
        <Link href={`/store/${product.slug}`}>
          <h3 className="mt-1.5 line-clamp-2 text-[13px] font-semibold leading-snug text-[var(--navy)] sm:text-sm">{product.title}</h3>
        </Link>
        <div className="mt-1.5 flex items-baseline gap-1.5">
          <span className="text-sm font-bold text-[var(--navy)] sm:text-[15px]">{money(price)}</span>
          {compareAt && <span className="text-[11px] font-medium text-[#94A3B8] line-through">{money(compareAt)}</span>}
        </div>
        <AddToBagButton
          variantId={variant?.id}
          label={outOfStock ? "Out of stock" : undefined}
          disabled={outOfStock}
          className="gold-btn mt-2.5 h-9 w-full text-[12px] disabled:cursor-not-allowed"
        />
      </div>
    </article>
  );
}

function FilterSidebar({
  categories,
  activeCategory,
  onSelect,
  minPrice,
  maxPrice,
  price,
  onPrice,
}: {
  categories: Category[];
  activeCategory: string | null;
  onSelect: (id: string | null) => void;
  minPrice: number;
  maxPrice: number;
  price: number;
  onPrice: (n: number) => void;
}) {
  return (
    <aside className="hidden w-full shrink-0 lg:block lg:w-64">
      <div className="filter-card">
        <p className="filter-heading">Categories</p>
        <div
          className={`filter-check-row ${!activeCategory ? "active" : ""}`}
          onClick={() => onSelect(null)}
        >
          All Products
        </div>
        {categories.map((c) => (
          <div key={c.id} className={`filter-check-row ${activeCategory === c.id ? "active" : ""}`} onClick={() => onSelect(c.id)}>
            {c.name}
          </div>
        ))}
      </div>

      <div className="filter-card mt-4">
        <p className="filter-heading">Filter by Price</p>
        <input
          type="range"
          min={minPrice}
          max={maxPrice}
          value={price}
          onChange={(e) => onPrice(Number(e.target.value))}
          className="w-full accent-[var(--blue)]"
        />
        <div className="mt-2 flex items-center justify-between text-xs font-bold text-[var(--muted)]">
          <span>PKR {minPrice}</span>
          <span>PKR {price}</span>
        </div>
      </div>

      <div className="filter-card mt-4">
        <p className="filter-heading">Why shop with us</p>
        <div className="grid gap-3 text-xs leading-5 text-[var(--muted)]">
          <div className="flex items-center gap-2"><ShieldCheck size={15} className="text-[var(--blue)]" /> Secure checkout</div>
          {PHYSICAL_GOODS_ENABLED ? (
            <div className="flex items-center gap-2"><Truck size={15} className="text-[var(--blue)]" /> Delivery across Pakistan</div>
          ) : (
            <div className="flex items-center gap-2"><ShieldCheck size={15} className="text-[var(--blue)]" /> Verified content</div>
          )}
          <div className="flex items-center gap-2"><Download size={15} className="text-[var(--blue)]" /> Instant digital access</div>
        </div>
      </div>
    </aside>
  );
}

export function Storefront({
  products,
  banners,
  featured = [],
  categories = [],
  initialSearch = "",
  catalogMode = false,
}: Props) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const hero = banners?.[0];

  const maxPrice = useMemo(() => Math.max(1000, ...products.map((p) => Math.round(p.basePrice.amountMinor / 100))), [products]);
  const [price, setPrice] = useState(maxPrice);

  const visibleProducts = useMemo(() => {
    let list = products;
    if (activeCategory) {
      const category = categories.find((item) => item.id === activeCategory);
      if (category) list = list.filter((product) => product.categories.some((item) => item.id === category.id));
    }
    return list.filter((p) => Math.round(p.basePrice.amountMinor / 100) <= price);
  }, [activeCategory, categories, products, price]);

  const featuredProducts = featured.length ? featured : products.slice(0, 4);

  const productGrid = (
    <section className={`store-container ${catalogMode ? "pt-10" : "mt-10"}`}>
      <div className="flex flex-col gap-4 border-b border-[var(--border)] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="eyebrow">{catalogMode ? "All Products" : "On the shelf right now"}</span>
          <h2 className="section-title mt-2 !text-2xl sm:!text-3xl">{catalogMode ? "Everything worth studying with." : "Start somewhere good."}</h2>
        </div>
        {initialSearch && (
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-white px-4 py-2 text-xs font-bold text-[var(--muted)]">
            Results for &ldquo;{initialSearch}&rdquo;
          </div>
        )}
      </div>

      <div className={catalogMode ? "mt-8 flex flex-col gap-8 lg:flex-row" : "mt-8"}>
        {catalogMode && (
          <FilterSidebar
            categories={categories}
            activeCategory={activeCategory}
            onSelect={setActiveCategory}
            minPrice={0}
            maxPrice={maxPrice}
            price={price}
            onPrice={setPrice}
          />
        )}

        <div className="min-w-0 flex-1">
          {catalogMode && categories.length > 0 && (
            <div className="mb-5 flex gap-2 overflow-x-auto pb-1 lg:hidden">
              <button type="button" onClick={() => setActiveCategory(null)} className={`shrink-0 rounded-full border px-4 py-2 text-xs font-black ${!activeCategory ? "border-[var(--navy)] bg-[var(--navy)] text-white" : "border-[var(--border)] bg-white text-[var(--navy)]"}`}>All</button>
              {categories.slice(0, 10).map((category) => (
                <button key={category.id} type="button" onClick={() => setActiveCategory(category.id)} className={`shrink-0 rounded-full border px-4 py-2 text-xs font-black ${activeCategory === category.id ? "border-[var(--navy)] bg-[var(--navy)] text-white" : "border-[var(--border)] bg-white text-[var(--navy)]"}`}>{category.name}</button>
              ))}
            </div>
          )}

          {/* Mobile-first: always 2 columns on phones, growing on larger screens. Cards stay compact at every size (see .product-card-grid). */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {visibleProducts.map((product, index) => <ProductCard key={product.id} product={product} index={index} />)}
          </div>

          {visibleProducts.length === 0 && (
            <div className="empty-state">
              <h3 className="text-xl font-bold text-[var(--navy)]">Nothing on the shelf yet.</h3>
              <p className="mt-2 text-sm text-[var(--muted)]">Try another search or browse all products.</p>
              <Link href="/store" className="gold-btn mt-6 min-h-12 px-6">Browse all products <ArrowRight size={15} /></Link>
            </div>
          )}
        </div>
      </div>

      {!catalogMode && <div className="mt-8 flex justify-center"><Link href="/store" className="secondary-cta">Explore the full store <ArrowRight size={15} /></Link></div>}
    </section>
  );

  return (
    <main className="store-shell">
      <StoreHeader initialSearch={initialSearch} categories={categories} />

      {!catalogMode && (
        <>
          {/* Hero */}
          <section className="store-container pt-6 sm:pt-8">
            <div className="hero-panel overflow-hidden rounded-[26px]">
              <div className="grid lg:grid-cols-[1.1fr_.9fr]">
                <div className="relative z-10 flex flex-col justify-center px-6 py-12 sm:px-10 lg:px-14 lg:py-16">
                  <span className="eyebrow"><Sparkles size={13} /> The IlmAI collection · 2026</span>
                  <h1 className="mt-5 max-w-lg text-[clamp(2.1rem,4.6vw,3.7rem)] font-bold leading-[1.03] tracking-[-.02em] text-[var(--navy)]">
                    Everything a <span className="hero-accent">Smart Student</span> Needs.
                  </h1>
                  <p className="mt-6 max-w-md text-[15px] leading-7 text-[var(--muted)]">
                    {PHYSICAL_GOODS_ENABLED
                      ? "Premium study resources, AI tools, books and digital products to help you learn, create and excel."
                      : "Premium study resources, AI tools and digital products to help you learn, create and excel."}
                  </p>
                  <div className="mt-8 flex flex-wrap gap-3">
                    <Link href="/store" className="gold-btn min-h-12 px-6">Explore Products <ArrowRight size={16} /></Link>
                    <a href="#collections" className="secondary-cta">View Bundles</a>
                  </div>
                </div>

                <div className="relative min-h-[280px] overflow-hidden bg-gradient-to-br from-[var(--navy)] via-[#142a52] to-[#0B1D3A] lg:min-h-full">
                  <div className="hero-orb orb-a" />
                  <div className="hero-orb orb-b" />
                  <div className="absolute inset-0 flex items-center justify-center p-8">
                    <div className="relative grid h-full w-full max-w-sm place-items-center">
                      <div className="animate-float grid h-36 w-36 place-items-center rounded-[32px] bg-[var(--blue)] shadow-[0_25px_60px_rgba(37,99,235,.35)] sm:h-48 sm:w-48">
                        <BookOpen size={72} className="text-white" strokeWidth={1.3} />
                      </div>
                      <div className="absolute -left-2 top-6 flex flex-col gap-2 sm:left-2">
                        {["Mathematics", "Physics", "Chemistry"].map((s, i) => (
                          <div key={s} className="rounded-xl bg-white/95 px-3 py-2 text-[11px] font-bold text-[var(--navy)] shadow-lg" style={{ transform: `translateX(${i * 6}px)` }}>{s}</div>
                        ))}
                      </div>
                      <div className="absolute -right-1 bottom-4 rounded-2xl bg-white/95 px-4 py-3 text-center shadow-lg sm:right-3">
                        <div className="text-[10px] font-bold uppercase tracking-[.1em] text-[var(--blue)]">Smart Learning</div>
                        <div className="mt-1 text-lg font-bold text-[var(--navy)]">IlmAI</div>
                      </div>
                    </div>
                  </div>
                  {hero?.title && <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-white/20 bg-black/30 p-4 text-sm font-bold text-white backdrop-blur">{hero.title}</div>}
                </div>
              </div>
            </div>
          </section>

          {/* Real products, right up front — not buried under marketing sections. */}
          {productGrid}

          {/* Trust / benefit strip */}
          <Reveal className="store-container mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              [Sparkles, "Premium Quality", "Verified content", "chip-lavender"],
              [ShieldCheck, "Secure Payments", "100% secure checkout", "chip-blue"],
              [Truck, "Instant Access", "Download & use", "chip-mint"],
              [Headphones, "Student Friendly", "Made for you", "chip-peach"],
            ].map(([Icon, title, body, chip]) => {
              const IconComp = Icon as typeof BookOpen;
              return (
                <div key={title as string} className="surface-card flex items-center gap-3 p-4">
                  <span className={`chip ${chip as string} grid h-10 w-10 shrink-0 place-items-center rounded-xl`}><IconComp size={19} /></span>
                  <div className="min-w-0">
                    <div className="truncate text-xs font-bold text-[var(--navy)]">{title as string}</div>
                    <div className="truncate text-[11px] text-[var(--muted)]">{body as string}</div>
                  </div>
                </div>
              );
            })}
          </Reveal>

          {/* Promo cards */}
          <section className="store-container mt-6 grid gap-4 lg:grid-cols-3">
            {PHYSICAL_GOODS_ENABLED ? (
              <div className="promo-card text-[var(--navy)]" style={{ background: "linear-gradient(135deg,#FFF3E8,#FFE4CC)" }}>
                <span className="badge badge-sale">Special offer</span>
                <h3 className="mt-4 text-xl font-bold leading-tight sm:text-2xl">Up to 30% off<br />on selected books</h3>
                <p className="mt-2 text-xs text-[#9A5B26]">On selected books &amp; study materials</p>
                <Link href="/store?search=books" className="mt-5 inline-flex items-center gap-1.5 text-xs font-bold text-[var(--navy)]">Shop now <ArrowRight size={13} /></Link>
                <Package size={90} className="pointer-events-none absolute -bottom-4 -right-4 text-[var(--navy)]/8" />
              </div>
            ) : (
              <div className="promo-card text-[var(--navy)]" style={{ background: "linear-gradient(135deg,#FFF3E8,#FFE4CC)" }}>
                <span className="badge badge-sale">Special offer</span>
                <h3 className="mt-4 text-xl font-bold leading-tight sm:text-2xl">Up to 30% off<br />on selected notes</h3>
                <p className="mt-2 text-xs text-[#9A5B26]">On selected notes &amp; study materials</p>
                <Link href="/store?search=notes" className="mt-5 inline-flex items-center gap-1.5 text-xs font-bold text-[var(--navy)]">Shop now <ArrowRight size={13} /></Link>
                <Package size={90} className="pointer-events-none absolute -bottom-4 -right-4 text-[var(--navy)]/8" />
              </div>
            )}

            <div className="promo-card bg-white border border-[var(--border)]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-[.1em] text-[var(--muted)]">Top Categories</span>
                <Link href="/store" className="text-[11px] font-bold text-[var(--blue)]">View all</Link>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {(categories.length ? categories.slice(0, 6) : (
                  PHYSICAL_GOODS_ENABLED
                    ? [{ id: "books", name: "Books" }, { id: "notes", name: "Notes" }, { id: "courses", name: "Courses" }]
                    : [{ id: "notes", name: "Notes" }, { id: "courses", name: "Courses" }, { id: "test-series", name: "Test Series" }]
                ) as Category[]).slice(0, 6).map((c, i) => {
                  const Icon = CATEGORY_ICONS[c.id] ?? BookOpen;
                  const chip = categoryChipClass(c.slug ?? c.id, i);
                  return (
                    <Link key={c.id} href={`/store?search=${encodeURIComponent(c.name)}`} className="flex flex-col items-center gap-2 rounded-xl p-2 text-center hover:bg-[var(--gray)]">
                      <span className={`chip ${chip} grid h-11 w-11 place-items-center rounded-full`}><Icon size={20} /></span>
                      <span className="text-[10px] font-bold text-[var(--navy)]">{c.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="promo-card text-[var(--navy)]" style={{ background: "linear-gradient(135deg,#F3EEFF,#E5DAFF)" }}>
              <Tags size={22} className="text-[#6D28D9]" />
              <h3 className="mt-4 text-xl font-bold leading-tight sm:text-2xl">Digital Products</h3>
              <p className="mt-1 text-sm font-bold text-[var(--muted)]">Instant Download</p>
              <p className="mt-2 text-xs text-[var(--muted)]">PDF notes, past papers, eBooks &amp; more</p>
              <Link href="/store?search=digital" className="mt-5 inline-flex items-center gap-1.5 text-xs font-bold text-[var(--navy)]">Explore now <ArrowRight size={13} /></Link>
              <Cloud size={90} className="pointer-events-none absolute -bottom-6 -right-4 text-[var(--navy)]/8" />
            </div>
          </section>

          {/* Category strip */}
          <Reveal id="collections" className="store-container mt-16">
            <div className="mb-6 flex items-end justify-between gap-5">
              <div>
                <span className="eyebrow">Browse by category</span>
                <h2 className="section-title mt-2 !text-2xl sm:!text-3xl">Find your lane.</h2>
              </div>
              <Link href="/store" className="section-link">View all <ArrowRight size={14} /></Link>
            </div>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
              {(categories.length ? categories : (PHYSICAL_GOODS_ENABLED ? ["Notes", "Books", "Courses", "Test Series", "Bundles", "Digital"] : ["Notes", "Courses", "Test Series", "Bundles", "Digital"]).map((n, i) => ({ id: String(i), name: n, slug: n } as Category))).slice(0, 6).map((category, index) => {
                const Icon = CATEGORY_ICONS[category.id] ?? FALLBACK_ICONS[index % FALLBACK_ICONS.length] ?? BookOpen;
                const chip = categoryChipClass(category.slug ?? category.id, index);
                return (
                  <button key={category.id} onClick={() => setActiveCategory(categories.length ? category.id : null)} className="category-tile flex flex-col items-center gap-3 text-center">
                    <span className={`chip ${chip} grid h-11 w-11 place-items-center rounded-full`}><Icon size={22} /></span>
                    <span className="text-xs font-bold text-[var(--navy)]">{category.name}</span>
                  </button>
                );
              })}
            </div>
          </Reveal>

          {!!featuredProducts.length && (
            <Reveal className="store-container mt-16">
              <div className="curated-strip">
                <div className="grid grid-cols-1 gap-10 lg:grid-cols-[.5fr_1.5fr] lg:items-end">
                  <div>
                    <span className="eyebrow text-[var(--sky)]">Editor&apos;s shelf</span>
                    <h2 className="mt-3 text-2xl font-bold leading-tight tracking-[-.01em] text-white sm:text-3xl">Picked for a productive week.</h2>
                    <Link href="/store" className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-[var(--sky)]">See everything <ArrowRight size={15} /></Link>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {featuredProducts.slice(0, 4).map((product) => (
                      <Link key={product.id} href={`/store/${product.slug}`} className="featured-mini">
                        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 text-[var(--sky)]"><BookOpen size={18} /></span>
                        <span className="min-w-0"><span className="block truncate text-sm font-bold text-white">{product.title}</span><span className="mt-1 block text-xs text-[#B9C4E0]">{money(product.basePrice)}</span></span>
                        <ArrowRight size={16} className="ml-auto text-[#8FA0C9]" />
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>
          )}
        </>
      )}

      {/* catalogMode never entered the fragment above, so its product grid renders here instead. */}
      {catalogMode && productGrid}

      {!catalogMode && (
        <Reveal id="why-ilmai" className="store-container mt-16">
          <div className="grid overflow-hidden rounded-[28px] border border-[var(--border)] bg-white lg:grid-cols-[.85fr_1.15fr]">
            <div className="p-8 sm:p-10 lg:p-12">
              <span className="eyebrow">The IlmAI difference</span>
              <h2 className="mt-4 text-2xl font-bold leading-tight tracking-[-.01em] text-[var(--navy)] sm:text-3xl">Designed around attention.</h2>
              <p className="mt-4 max-w-md text-sm leading-7 text-[var(--muted)]">A store should help you decide, not make you scroll forever.</p>
            </div>
            <div className="grid gap-px bg-[var(--border)] sm:grid-cols-2">
              {[
                ["01", "Useful first", "No filler products. Every resource has a clear learning job.", "chip-blue"],
                ["02", "Built to last", "Clear files, clean layouts, practical formats.", "chip-mint"],
                ["03", "Quietly premium", "A calmer visual language so the important thing stays important.", "chip-lavender"],
                ["04", "Inside IlmAI", "Store promotions connect naturally with study experiences.", "chip-peach"],
              ].map(([no, title, body, chip]) => (
                <div key={no} className="bg-white p-6 sm:p-7">
                  <span className={`chip ${chip} inline-block rounded-full px-2.5 py-1 text-[10px] font-black tracking-[.1em]`}>{no}</span>
                  <h3 className="mt-5 text-lg font-bold tracking-[-.01em] text-[var(--navy)]">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      )}

      <StoreFooter />
    </main>
  );
}
