"use client";

import Link from "next/link";
import { ChevronDown, Heart, LifeBuoy, Menu, PackageSearch, Phone, Search, Star, UserRound, X } from "lucide-react";
import { useEffect, useState } from "react";
import { CartBadge } from "@/components/store/cart-badge";
import type { Category } from "@/types/domain";

type Props = { initialSearch?: string; categories?: Category[] };

const NAV_LINKS: Array<[string, string]> = [
  ["Home", "/store"],
  ["Shop", "/store"],
  ["Digital Products", "/store?search=digital"],
  ["Books", "/store?search=books"],
  ["Courses", "/store?search=courses"],
  ["Bundles", "/store?search=bundle"],
];

export function StoreHeader({ initialSearch = "", categories = [] }: Props) {
  const [open, setOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [query, setQuery] = useState(initialSearch);

  useEffect(() => setQuery(initialSearch), [initialSearch]);

  return (
    <header className="sticky top-0 z-40">
      {/* Utility bar */}
      <div className="utility-bar hidden sm:block">
        <div className="store-container flex min-h-9 items-center justify-between gap-4">
          <span className="inline-flex items-center gap-1.5"><Star size={12} className="text-[#f4bf43]" fill="currentColor" /> Welcome to IlmAI Store</span>
          <span className="inline-flex items-center gap-1.5 text-[#f4bf43]"><PackageSearch size={13} /> Free delivery on orders over PKR 2,000</span>
          <span className="flex items-center gap-4">
            <Link href="/orders" className="inline-flex items-center gap-1.5 hover:text-[#f4bf43]"><PackageSearch size={12} /> Track order</Link>
            <a href="mailto:ilmai.study1@gmail.com" className="inline-flex items-center gap-1.5 hover:text-[#f4bf43]"><LifeBuoy size={12} /> Help</a>
            <a href="mailto:ilmai.study1@gmail.com" className="inline-flex items-center gap-1.5 hover:text-[#f4bf43]"><Phone size={12} /> Contact us</a>
          </span>
        </div>
      </div>

      {/* Main bar: logo + search + account icons */}
      <div className="border-b border-[var(--line)] bg-white">
        <div className="store-container flex min-h-[76px] items-center gap-4">
          <Link href="/" className="flex items-center gap-2.5 shrink-0" aria-label="IlmAI Store home">
            <span className="text-xl font-black tracking-[-.04em] text-[#112d33]">IlmAI</span>
            <span className="rounded-md bg-[#f4bf43] px-2 py-1 text-[11px] font-black uppercase tracking-[.06em] text-[#112d33]">.store</span>
          </Link>

          <form action="/store" method="GET" className="hidden min-w-0 flex-1 items-stretch overflow-hidden rounded-xl border border-[var(--line)] md:flex">
            <label className="hidden items-center gap-1.5 border-r border-[var(--line)] bg-[#f7f8f6] px-3 text-xs font-bold text-[#4c6265] lg:flex">
              All Categories <ChevronDown size={13} />
            </label>
            <input
              name="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for books, notes, courses…"
              className="min-w-0 flex-1 border-0 px-4 text-sm text-[#112d33] outline-none"
            />
            <button type="submit" aria-label="Search" className="grid w-14 shrink-0 place-items-center bg-[#f4bf43] text-[#112d33] transition hover:bg-[#f7ca62]">
              <Search size={18} />
            </button>
          </form>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-3">
            <button className="hidden items-center gap-2 text-xs font-bold text-[#112d33] sm:flex" aria-label="Wishlist">
              <Heart size={19} /> <span className="hidden lg:inline">Wishlist</span>
            </button>
            <CartBadge />
            <Link href="/account" className="hidden items-center gap-2 text-xs font-bold text-[#112d33] sm:flex" aria-label="Account">
              <UserRound size={19} /> <span className="hidden lg:inline">My Account</span>
            </Link>
            <button onClick={() => setOpen((v) => !v)} className="icon-button md:hidden" aria-label="Menu">
              {open ? <X size={19} /> : <Menu size={19} />}
            </button>
          </div>
        </div>

        <form action="/store" method="GET" className="store-container flex items-stretch overflow-hidden rounded-xl border border-[var(--line)] pb-3 md:hidden">
          <input name="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search the store…" className="min-w-0 flex-1 border-0 px-4 text-sm outline-none" />
          <button type="submit" aria-label="Search" className="grid w-12 shrink-0 place-items-center bg-[#f4bf43] text-[#112d33]"><Search size={16} /></button>
        </form>
      </div>

      {/* Category nav bar */}
      <div className="category-nav-bar hidden md:block">
        <div className="store-container flex min-h-[52px] items-center gap-8">
          <div className="relative">
            <button
              onClick={() => setCatOpen((v) => !v)}
              className="flex items-center gap-2 rounded-lg bg-[#f4bf43] px-4 py-2.5 text-xs font-black text-[#112d33]"
            >
              <Menu size={15} /> All Categories <ChevronDown size={13} />
            </button>
            {catOpen && (
              <div className="absolute left-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-[var(--line)] bg-white py-2 shadow-2xl">
                {(categories.length ? categories : []).map((c) => (
                  <Link key={c.id} href={`/store?search=${encodeURIComponent(c.name)}`} onClick={() => setCatOpen(false)} className="block px-4 py-2.5 text-sm font-semibold text-[#112d33] hover:bg-[#f7f8f6]">
                    {c.name}
                  </Link>
                ))}
                {!categories.length && ["Notes", "Books", "Courses", "Test Series", "Bundles", "Digital Products"].map((label) => (
                  <Link key={label} href={`/store?search=${encodeURIComponent(label)}`} onClick={() => setCatOpen(false)} className="block px-4 py-2.5 text-sm font-semibold text-[#112d33] hover:bg-[#f7f8f6]">
                    {label}
                  </Link>
                ))}
              </div>
            )}
          </div>
          <nav className="flex items-center gap-7">
            {NAV_LINKS.map(([label, href]) => (
              <Link key={label} href={href} className="category-nav-link">{label}</Link>
            ))}
          </nav>
        </div>
      </div>

      {open && (
        <div className="border-t border-[var(--line)] bg-[#f8f6f0] md:hidden">
          <nav className="store-container grid gap-2 py-5">
            {[...NAV_LINKS, ["My account", "/account"] as [string, string], ["Cart", "/cart"] as [string, string]].map(([label, href]) => (
              <Link key={label} href={href} onClick={() => setOpen(false)} className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm font-bold text-[#112d33]">
                {label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
