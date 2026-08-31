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
  Star,
  Tags,
  Truck,
} from "lucide-react";
import type { Banner, Category, Product } from "@/types/domain";
import { AddToBagButton } from "@/components/store/add-to-bag-button";
import { StoreFooter } from "@/components/store/store-footer";
import { StoreHeader } from "@/components/store/store-header";
import { Reveal } from "@/components/store/reveal";
import { compareAtAmountMinor } from "@/lib/pricing";

type Props = {
  products: Product[];
  banners?: Banner[];
  featured?: Product[];
  categories?: Category[];
  initialSearch?: string;
  catalogMode?: boolean;
  usdToPkr?: number;
};

function money(m: { amountMinor: number; currency: string }) {
  return `${m.currency} ${new Intl.NumberFormat("en-PK").format(m.amountMinor / 100)}`;
}

function defaultVariant(product: Product) {
  return product.variants.find((v) => v.isDefault) ?? product.variants[0];
}

function primaryImage(product: Product) {
  return product.media.find((m) => m.isPrimary) ?? product.media[0];
}

function isDigital(product: Product) {
  return ["digital", "course", "notes", "test_series"].includes(product.productType);
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

function ProductCard({ product, index, usdToPkr }: { product: Product; index: number; usdToPkr: number }) {
  const image = primaryImage(product);
  const variant = defaultVariant(product);
  const price = variant?.price ?? product.basePrice;
  const compareAt = compareAtAmountMinor(price.amountMinor, price.currency, usdToPkr);
  const [liked, setLiked] = useState(false);

  return (
    <article className="product-card-grid group relative overflow-hidden animate-pop-in" style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}>
      <Link href={`/store/${product.slug}`} className="relative block aspect-[4/3.4] overflow-hidden bg-[#eef2ee]">
        {image ? (
          <img src={image.url} alt={image.altText ?? product.title} className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]" />
        ) : (
          <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-[#16324a] to-[#112d33]">
            <BookOpen size={80} strokeWidth={1} className="text-white/25" />
          </div>
        )}
        <button
          type="button"
          aria-label={liked ? "Remove from wishlist" : "Add to wishlist"}
          onClick={(event) => { event.preventDefault(); setLiked((v) => !v); }}
          className={`absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/90 shadow-sm ${liked ? "text-[#e5484d]" : "text-[#112d33]"}`}
        >
          <Heart size={15} fill={liked ? "currentColor" : "none"} />
        </button>
        <span className="absolute left-3 top-3 rounded-full bg-white/92 px-2.5 py-1 text-[9px] font-black uppercase tracking-[.1em] text-[#112d33]">
          {product.productType.replaceAll("_", " ")}
        </span>
      </Link>

      <div className="p-4">
        <p className="text-[11px] font-bold uppercase tracking-[.08em] text-[#7a8d90]">{product.categories[0]?.name ?? (isDigital(product) ? "Digital" : "Physical")}</p>
        <Link href={`/store/${product.slug}`}>
          <h3 className="mt-1.5 line-clamp-2 text-[15px] font-black leading-snug text-[#112d33]">{product.title}</h3>
        </Link>
        <div className="rating-row mt-2">
          {Array.from({ length: 5 }).map((_, i) => <Star key={i} size={13} fill="currentColor" />)}
          <span className="ml-1 text-[11px] font-semibold text-[#8698a0]">New</span>
        </div>
        <div className="mt-2.5 flex items-baseline gap-2">
          <span className="text-sm font-bold text-[#b3bec0] line-through">{money(compareAt)}</span>
          <span className="text-lg font-black tracking-[-.02em] text-[#112d33]">{money(price)}</span>
        </div>
        <p className="mt-1 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-[.08em] text-[#1a7775]"><Truck size={11} /> Free shipping</p>
        <AddToBagButton
          variantId={variant?.id}
          className="gold-btn mt-3.5 h-11 w-full disabled:cursor-not-allowed"
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
          className="w-full accent-[#f4bf43]"
        />
        <div className="mt-2 flex items-center justify-between text-xs font-bold text-[#4c6265]">
          <span>PKR {minPrice}</span>
          <span>PKR {price}</span>
        </div>
      </div>

      <div className="filter-card mt-4">
        <p className="filter-heading">Why shop with us</p>
        <div className="grid gap-3 text-xs leading-5 text-[#4c6265]">
          <div className="flex items-center gap-2"><ShieldCheck size={15} className="text-[#1a7775]" /> Secure checkout</div>
          <div className="flex items-center gap-2"><Truck size={15} className="text-[#1a7775]" /> Delivery across Pakistan</div>
          <div className="flex items-center gap-2"><Download size={15} className="text-[#1a7775]" /> Instant digital access</div>
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
  usdToPkr = 280,
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
      <div className="flex flex-col gap-4 border-b border-[var(--line)] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="eyebrow">{catalogMode ? "All Products" : "On the shelf right now"}</span>
          <h2 className="section-title mt-2 !text-3xl sm:!text-4xl">{catalogMode ? "Everything worth studying with." : "Start somewhere good."}</h2>
        </div>
        {initialSearch && (
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white px-4 py-2 text-xs font-bold text-[#5f7476]">
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
              <button type="button" onClick={() => setActiveCategory(null)} className={`shrink-0 rounded-full border px-4 py-2 text-xs font-black ${!activeCategory ? "border-[#112d33] bg-[#112d33] text-white" : "border-[var(--line)] bg-white text-[#112d33]"}`}>All</button>
              {categories.slice(0, 10).map((category) => (
                <button key={category.id} type="button" onClick={() => setActiveCategory(category.id)} className={`shrink-0 rounded-full border px-4 py-2 text-xs font-black ${activeCategory === category.id ? "border-[#112d33] bg-[#112d33] text-white" : "border-[var(--line)] bg-white text-[#112d33]"}`}>{category.name}</button>
              ))}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visibleProducts.map((product, index) => <ProductCard key={product.id} product={product} index={index} usdToPkr={usdToPkr} />)}
          </div>

          {visibleProducts.length === 0 && (
            <div className="empty-state">
              <h3 className="text-xl font-black text-[#112d33]">Nothing on the shelf yet.</h3>
              <p className="mt-2 text-sm text-[#718184]">Try another search or browse all products.</p>
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
                  <h1 className="mt-5 max-w-lg text-[clamp(2.4rem,5.2vw,4.2rem)] font-black leading-[.98] tracking-[-.04em] text-[#112d33]">
                    Learn More.<br />Achieve More.<br /><span className="hero-accent">IlmAI Store.</span>
                  </h1>
                  <p className="mt-6 max-w-md text-[15px] leading-7 text-[#5f7476]">
                    All the study resources, books, notes and courses you need — in one place.
                  </p>
                  <div className="mt-8 flex flex-wrap gap-3">
                    <Link href="/store" className="gold-btn min-h-12 px-6">Shop Now <ArrowRight size={16} /></Link>
                    <a href="#collections" className="secondary-cta">Explore Categories</a>
                  </div>
                </div>

                <div className="relative min-h-[300px] overflow-hidden bg-gradient-to-br from-[#16324a] via-[#132c40] to-[#0f2233] lg:min-h-full">
                  <div className="hero-orb orb-a" />
                  <div className="hero-orb orb-b" />
                  <div className="absolute inset-0 flex items-center justify-center p-8">
                    <div className="relative grid h-full w-full max-w-sm place-items-center">
                      <div className="animate-float grid h-40 w-40 place-items-center rounded-[32px] bg-[#f4bf43] shadow-[0_25px_60px_rgba(244,191,67,.35)] sm:h-52 sm:w-52">
                        <BookOpen size={80} className="text-[#112d33]" strokeWidth={1.3} />
                      </div>
                      <div className="absolute -left-2 top-6 flex flex-col gap-2 sm:left-2">
                        {["Mathematics", "Physics", "Chemistry"].map((s, i) => (
                          <div key={s} className="rounded-xl bg-white/95 px-3 py-2 text-[11px] font-black text-[#112d33] shadow-lg" style={{ transform: `translateX(${i * 6}px)` }}>{s}</div>
                        ))}
                      </div>
                      <div className="absolute -right-1 bottom-4 rounded-2xl bg-white/95 px-4 py-3 text-center shadow-lg sm:right-3">
                        <div className="text-[10px] font-black uppercase tracking-[.1em] text-[#1a7775]">Smart Learning</div>
                        <div className="mt-1 text-lg font-black text-[#112d33]">IlmAI</div>
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

          {/* Feature strip */}
          <Reveal className="store-container mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              [Sparkles, "High Quality Products", "Carefully selected resources"],
              [ShieldCheck, "Secure Payments", "100% secure checkout"],
              [Truck, "Fast Delivery", "Across Pakistan"],
              [Headphones, "24/7 Support", "We're here to help"],
            ].map(([Icon, title, body]) => {
              const IconComp = Icon as typeof BookOpen;
              return (
                <div key={title as string} className="surface-card flex items-center gap-3 p-4">
                  <IconComp size={22} className="shrink-0 text-[#1a7775]" />
                  <div className="min-w-0">
                    <div className="truncate text-xs font-black text-[#112d33]">{title as string}</div>
                    <div className="truncate text-[11px] text-[#788a8c]">{body as string}</div>
                  </div>
                </div>
              );
            })}
          </Reveal>

          {/* Promo cards */}
          <section className="store-container mt-6 grid gap-4 lg:grid-cols-3">
            <div className="promo-card bg-[#fbf1de] text-[#112d33]">
              <span className="rounded-full bg-[#f4bf43] px-3 py-1 text-[10px] font-black uppercase tracking-[.1em]">Special offer</span>
              <h3 className="mt-4 text-2xl font-black leading-tight">Up to 30% off<br />on selected books</h3>
              <p className="mt-2 text-xs text-[#7a6a45]">On selected books &amp; study materials</p>
              <Link href="/store?search=books" className="mt-5 inline-flex items-center gap-1.5 text-xs font-black text-[#112d33]">Shop now <ArrowRight size={13} /></Link>
              <Package size={90} className="pointer-events-none absolute -bottom-4 -right-4 text-[#112d33]/8" />
            </div>

            <div className="promo-card bg-white border border-[var(--line)]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-[.1em] text-[#7a8d90]">Top Categories</span>
                <Link href="/store" className="text-[11px] font-black text-[#1a7775]">View all</Link>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {(categories.length ? categories.slice(0, 6) : [
                  { id: "books", name: "Books" }, { id: "notes", name: "Notes" }, { id: "courses", name: "Courses" },
                ] as Category[]).slice(0, 6).map((c) => {
                  const Icon = CATEGORY_ICONS[c.id] ?? BookOpen;
                  return (
                    <Link key={c.id} href={`/store?search=${encodeURIComponent(c.name)}`} className="flex flex-col items-center gap-2 rounded-xl p-2 text-center hover:bg-[#f7f8f6]">
                      <span className="icon-circle"><Icon size={20} /></span>
                      <span className="text-[10px] font-bold text-[#112d33]">{c.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="promo-card bg-[#eaf1f8] text-[#112d33]">
              <Tags size={22} className="text-[#1a7775]" />
              <h3 className="mt-4 text-2xl font-black leading-tight">Digital Products</h3>
              <p className="mt-1 text-sm font-bold text-[#4c6265]">Instant Download</p>
              <p className="mt-2 text-xs text-[#5f7476]">PDF notes, past papers, eBooks &amp; more</p>
              <Link href="/store?search=digital" className="mt-5 inline-flex items-center gap-1.5 text-xs font-black text-[#112d33]">Explore now <ArrowRight size={13} /></Link>
              <Cloud size={90} className="pointer-events-none absolute -bottom-6 -right-4 text-[#112d33]/8" />
            </div>
          </section>

          {/* Category strip */}
          <Reveal id="collections" className="store-container mt-16">
            <div className="mb-6 flex items-end justify-between gap-5">
              <div>
                <span className="eyebrow">Browse by category</span>
                <h2 className="section-title mt-2 !text-3xl sm:!text-4xl">Find your lane.</h2>
              </div>
              <Link href="/store" className="section-link">View all <ArrowRight size={14} /></Link>
            </div>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
              {(categories.length ? categories : ["Notes", "Books", "Courses", "Test Series", "Bundles", "Digital"].map((n, i) => ({ id: String(i), name: n, slug: n } as Category))).slice(0, 6).map((category, index) => {
                const Icon = CATEGORY_ICONS[category.id] ?? FALLBACK_ICONS[index % FALLBACK_ICONS.length] ?? BookOpen;
                return (
                  <button key={category.id} onClick={() => setActiveCategory(categories.length ? category.id : null)} className="category-tile flex flex-col items-center gap-3 text-center">
                    <span className="icon-circle"><Icon size={22} /></span>
                    <span className="text-xs font-black text-[#112d33]">{category.name}</span>
                  </button>
                );
              })}
            </div>
          </Reveal>

          {!!featuredProducts.length && (
            <Reveal className="store-container mt-16">
              <div className="curated-strip">
                <div className="grid gap-10 lg:grid-cols-[.5fr_1.5fr] lg:items-end">
                  <div>
                    <span className="eyebrow text-[#f4bf43]">Editor&apos;s shelf</span>
                    <h2 className="mt-3 text-3xl font-black leading-tight tracking-[-.03em] text-white sm:text-4xl">Picked for a productive week.</h2>
                    <Link href="/store" className="mt-6 inline-flex items-center gap-2 text-sm font-black text-[#f4bf43]">See everything <ArrowRight size={15} /></Link>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {featuredProducts.slice(0, 4).map((product) => (
                      <Link key={product.id} href={`/store/${product.slug}`} className="featured-mini">
                        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 text-[#f4bf43]"><BookOpen size={18} /></span>
                        <span className="min-w-0"><span className="block truncate text-sm font-black text-white">{product.title}</span><span className="mt-1 block text-xs text-[#9eb8b5]">{money(product.basePrice)}</span></span>
                        <ArrowRight size={16} className="ml-auto text-[#87a5a1]" />
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
          <div className="grid overflow-hidden rounded-[28px] border border-[var(--line)] bg-[#f1ead9] lg:grid-cols-[.85fr_1.15fr]">
            <div className="p-8 sm:p-10 lg:p-12">
              <span className="eyebrow">The IlmAI difference</span>
              <h2 className="mt-4 text-3xl font-black leading-tight tracking-[-.03em] text-[#112d33] sm:text-4xl">Designed around attention.</h2>
              <p className="mt-4 max-w-md text-sm leading-7 text-[#617577]">A store should help you decide, not make you scroll forever.</p>
            </div>
            <div className="grid gap-px bg-[#d7cdb7] sm:grid-cols-2">
              {[
                ["01", "Useful first", "No filler products. Every resource has a clear learning job."],
                ["02", "Built to last", "Clear files, clean layouts, practical formats."],
                ["03", "Quietly premium", "A calmer visual language so the important thing stays important."],
                ["04", "Inside IlmAI", "Store promotions connect naturally with study experiences."],
              ].map(([no, title, body]) => (
                <div key={no} className="bg-[#fbf7ee] p-6 sm:p-7">
                  <div className="text-xs font-black tracking-[.18em] text-[#b49659]">{no}</div>
                  <h3 className="mt-5 text-lg font-black tracking-[-.02em] text-[#112d33]">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#718184]">{body}</p>
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
