"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Check, ChevronRight, Menu, Search, Sparkles, X } from "lucide-react";
import type { Banner, Product } from "@/types/domain";
import { AddToBagButton } from "@/components/store/add-to-bag-button";
import { CartBadge } from "@/components/store/cart-badge";

type Props = {
  products: Product[];
  banners?: Banner[];
  featured?: Product[];
  initialSearch?: string;
};

function money(product: Product) {
  return `${product.basePrice.currency} ${new Intl.NumberFormat("en-PK").format(product.basePrice.amountMinor / 100)}`;
}

function defaultVariantId(product: Product) {
  return product.variants.find((v) => v.isDefault)?.id ?? product.variants[0]?.id;
}

function primaryImage(product: Product) {
  return product.media.find((m) => m.isPrimary) ?? product.media[0];
}

const PLACEHOLDER_COLORS = ["bg-[#d8eee8]", "bg-[#f5e3b8]", "bg-[#dce5f2]"];

export function Storefront({ products, banners, featured, initialSearch = "" }: Props) {
  const [menu, setMenu] = useState(false);
  const hero = banners?.[0];

  return <main className="min-h-screen overflow-hidden">
    <div className="bg-[#103d42] px-5 py-2 text-center text-xs font-semibold tracking-[.18em] text-[#f8d58d]">FREE DIGITAL DELIVERY · BUILT FOR BETTER STUDY</div>
    <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-6 lg:px-8">
      <Link href="/" className="flex items-center gap-3" aria-label="IlmAI Store home"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#f5bc50] text-lg font-black text-[#103d42]">i</span><span className="font-bold tracking-tight">IlmAI <span className="text-[#14777a]">Store</span></span></Link>
      <nav className="hidden items-center gap-8 text-sm font-semibold text-[#486267] md:flex"><Link href="/store" className="text-[#103d42]">Shop all</Link><a href="#collections">Collections</a><a href="#why">Why IlmAI</a></nav>
      <div className="flex items-center gap-2">
        <form action="/store" method="GET" className="hidden items-center gap-2 rounded-full border bg-white/60 px-4 py-2 text-sm md:flex">
          <Search size={16} />
          <input name="search" defaultValue={initialSearch} placeholder="Search the shelf" className="w-32 bg-transparent outline-none placeholder:text-[#789094]" />
        </form>
        <CartBadge />
      <Link href="/login" className="hidden rounded-full border bg-white/60 px-4 py-2.5 text-sm font-semibold text-[#103d42] hover:bg-white md:inline-flex">Sign in</Link>
        <button aria-label="Toggle menu" onClick={() => setMenu(!menu)} className="rounded-full border p-3 md:hidden">{menu ? <X size={18} /> : <Menu size={18} />}</button>
      </div>
    </header>
    {menu && <nav className="mx-5 grid gap-3 rounded-3xl border bg-white p-5 text-sm font-semibold md:hidden">
      <Link href="/store">Shop all</Link><a href="#collections">Collections</a><a href="#why">Why IlmAI</a><Link href="/cart">Cart</Link><Link href="/login">Sign in</Link><Link href="/account">My account</Link>
    </nav>}
    <section className="mx-auto grid max-w-7xl gap-10 px-5 pb-20 pt-10 lg:grid-cols-[1.02fr_.98fr] lg:items-center lg:px-8 lg:pt-16">
      <div><div className="mb-6 flex items-center gap-2 text-xs font-bold uppercase tracking-[.2em] text-[#14777a]"><Sparkles size={15} /> The thoughtful study shelf</div><h1 className="display-font max-w-xl text-6xl leading-[.94] tracking-[-.045em] text-[#103d42] sm:text-7xl">Tools for the <em className="text-[#14777a]">curious</em> mind.</h1><p className="mt-7 max-w-md text-lg leading-8 text-[#5e7477]">{hero?.subtitle ?? "Notes, books and practice made by the people who understand that learning is more than ticking a box."}</p><div className="mt-9 flex flex-wrap gap-3"><a href="#collections" className="inline-flex items-center gap-3 rounded-full bg-[#103d42] px-6 py-3.5 text-sm font-bold text-white transition hover:bg-[#14777a]">Explore the collection <ArrowRight size={17} /></a><a href="#why" className="inline-flex items-center rounded-full border px-6 py-3.5 text-sm font-bold text-[#103d42] hover:bg-white">Our point of view</a></div></div>
      <div className="grain relative min-h-[390px] rounded-[2.5rem] border bg-[#e9f1e8] p-7 shadow-[0_25px_70px_rgba(16,61,66,.12)] sm:min-h-[470px]"><div className="absolute right-7 top-7 rounded-full bg-[#f5bc50] px-4 py-2 text-xs font-bold text-[#103d42]">NEW / 2026</div><div className="absolute bottom-8 left-8 right-8 rounded-[2rem] bg-[#103d42] p-7 text-white sm:p-9"><div className="mb-14 flex justify-between text-xs uppercase tracking-[.2em] text-[#f5d38c]"><span>IlmAI field notes</span><span>Vol. 01</span></div><p className="display-font max-w-sm text-4xl leading-tight">{hero?.title ?? "Make space for the idea before the answer."}</p><div className="mt-6 flex items-center gap-2 text-sm text-[#b5d1cd]"><span className="h-2 w-2 rounded-full bg-[#f5bc50]" /> Curated study resources</div></div><div className="absolute left-10 top-20 h-32 w-32 rounded-full border-[1.5px] border-[#14777a]/40" /><div className="absolute left-[5.5rem] top-[8.5rem] h-20 w-20 rounded-full bg-[#14777a]/20" /></div>
    </section>
    {featured && featured.length > 0 && <section className="mx-auto max-w-7xl px-5 pb-4 lg:px-8">
      <p className="text-xs font-bold uppercase tracking-[.2em] text-[#14777a]">Featured this week</p>
      <div className="mt-4 flex gap-4 overflow-x-auto pb-2">
        {featured.map((p) => <Link key={p.id} href={`/store/${p.slug}`} className="flex min-w-[220px] items-center gap-3 rounded-2xl border bg-white/70 p-3 hover:shadow-sm">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#f5bc50]/30 text-[#103d42]"><BookOpen size={20} strokeWidth={1.5} /></span>
          <span><span className="block text-sm font-bold text-[#103d42]">{p.title}</span><span className="block text-xs text-[#789094]">{money(p)}</span></span>
        </Link>)}
      </div>
    </section>}
    <section id="collections" className="mx-auto max-w-7xl px-5 pb-24 lg:px-8"><div className="mb-8 flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#14777a]">From the shelf</p><h2 className="display-font mt-2 text-4xl text-[#103d42]">Start somewhere good.</h2></div><Link href="/store" className="hidden items-center gap-1 text-sm font-bold text-[#14777a] sm:flex">View all <ChevronRight size={16} /></Link></div>
      <div className="grid gap-5 md:grid-cols-3">{products.map((p, i) => {
        const image = primaryImage(p);
        return <article key={p.id} className="group rounded-[1.75rem] border bg-white/70 p-3 transition hover:-translate-y-1 hover:shadow-xl">
          <Link href={`/store/${p.slug}`} className={`${image ? "" : PLACEHOLDER_COLORS[i % PLACEHOLDER_COLORS.length]} relative flex h-56 items-end overflow-hidden rounded-[1.35rem] p-5`}>
            {image
              ? <img src={image.url} alt={image.altText ?? p.title} className="absolute inset-0 h-full w-full object-cover" />
              : <><span className="absolute right-5 top-5 text-5xl font-black text-[#103d42]/10">{String(i + 1).padStart(2, "0")}</span><BookOpen className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[#103d42]/20" size={90} strokeWidth={1} /></>}
            <span className="relative rounded-full bg-white/75 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[#103d42]">{p.productType.replace("_", " ")}</span>
          </Link>
          <div className="p-4">
            <div className="flex items-start justify-between gap-3"><Link href={`/store/${p.slug}`}><h3 className="display-font text-2xl leading-tight text-[#103d42]">{p.title}</h3></Link><span className="whitespace-nowrap text-sm font-bold text-[#14777a]">{money(p)}</span></div>
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#6b7f82]">{p.description ?? ""}</p>
            <AddToBagButton variantId={defaultVariantId(p)} />
          </div>
        </article>;
      })}</div>
      {products.length === 0 && <p className="rounded-2xl border bg-white p-8 text-center text-[#5e7477]">No resources found. Try a different search.</p>}
    </section>
    <section id="why" className="bg-[#103d42] px-5 py-20 text-white lg:px-8"><div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.8fr_1.2fr] lg:items-end"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#f5bc50]">The IlmAI difference</p><h2 className="display-font mt-4 text-5xl leading-tight">Less clutter.<br />More clarity.</h2></div><div className="grid gap-8 sm:grid-cols-3">{["Made to understand", "Useful in real life", "Yours forever"].map((x, i) => <div key={x} className="border-t border-white/20 pt-4"><div className="mb-5 text-[#f5bc50]">0{i + 1}</div><h3 className="font-bold">{x}</h3><p className="mt-2 text-sm leading-6 text-[#b6cfcb]">Thoughtfully designed resources that respect your time and attention.</p><Check className="mt-5 text-[#f5bc50]" size={17} /></div>)}</div></div></section>
    <footer className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-8 text-sm text-[#6b7f82] sm:flex-row sm:items-center sm:justify-between lg:px-8"><span>© 2026 IlmAI Store</span><span>Learn deeply. Build boldly.</span><a className="font-semibold text-[#14777a]" href="https://ilmai.study">Visit IlmAI Study ↗</a></footer>
  </main>;
}
