"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, Heart, LifeBuoy, Loader2, LogOut, Menu, PackageSearch, Phone, Search, Star, UserRound, X } from "lucide-react";
import { useEffect, useState } from "react";
import { CartBadge } from "@/components/store/cart-badge";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { PHYSICAL_GOODS_ENABLED } from "@/constants/product";
import { siteConfig } from "@/config/site";
import type { Category } from "@/types/domain";

type Props = { initialSearch?: string; categories?: Category[] };

// These link by the real category slug (see FilterSidebar/CategoryManager —
// "digital"/"books"/"courses"/"bundles" are seeded category slugs), not a
// `search=` text match — a `search=` link only ever matched product
// title/description, never actual category membership.
const NAV_LINKS: Array<[string, string]> = [
  ["Home", "/store"],
  ["Shop", "/store"],
  ["Digital Products", "/store?category=digital"],
  ...(PHYSICAL_GOODS_ENABLED ? [["Books", "/store?category=books"] as [string, string]] : []),
  ["Courses", "/store?category=courses"],
  ["Bundles", "/store?category=bundles"],
];

const FALLBACK_CATEGORY_LINKS: Array<[string, string]> = [
  ["Notes", "notes"],
  ...(PHYSICAL_GOODS_ENABLED ? [["Books", "books"] as [string, string]] : []),
  ["Courses", "courses"],
  ["Test Series", "test-series"],
  ["Bundles", "bundles"],
  ["Digital Products", "digital"],
];

export function StoreHeader({ initialSearch = "", categories = [] }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [query, setQuery] = useState(initialSearch);
  const [email, setEmail] = useState<string | null | undefined>(undefined); // undefined = still checking
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => setQuery(initialSearch), [initialSearch]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => subscription.subscription.unsubscribe();
  }, []);

  async function signOut() {
    setSigningOut(true);
    await createSupabaseBrowserClient().auth.signOut();
    setSigningOut(false);
    router.push("/store");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40">
      {/* Utility bar */}
      <div className="utility-bar hidden sm:block">
        <div className="store-container flex min-h-9 items-center justify-between gap-4">
          <span className="inline-flex items-center gap-1.5"><Star size={12} className="text-[#0F766E]" fill="currentColor" /> Welcome to IlmAI Store</span>
          <span className="inline-flex items-center gap-1.5 text-[#0F766E]"><PackageSearch size={13} /> {PHYSICAL_GOODS_ENABLED ? "Delivery charge (if any) shown at checkout" : "Instant access after checkout"}</span>
          <span className="flex items-center gap-4">
            <Link href="/orders" className="inline-flex items-center gap-1.5 hover:text-[#0F766E]"><PackageSearch size={12} /> Track order</Link>
            <a href={`mailto:${siteConfig.supportEmail}`} className="inline-flex items-center gap-1.5 hover:text-[#0F766E]"><LifeBuoy size={12} /> Help</a>
            <a href={`mailto:${siteConfig.supportEmail}`} className="inline-flex items-center gap-1.5 hover:text-[#0F766E]"><Phone size={12} /> Contact us</a>
          </span>
        </div>
      </div>

      {/* Main bar: logo + search + account icons */}
      <div className="border-b border-[var(--line)] bg-white">
        <div className="store-container flex min-h-[76px] items-center gap-4">
          <Link href="/" className="flex items-center gap-2.5 shrink-0" aria-label="IlmAI Store home">
            <span className="text-xl font-black tracking-[-.04em] text-[#0B1D3A]">IlmAI</span>
            <span className="rounded-md bg-[#0F766E] px-2 py-1 text-[11px] font-black uppercase tracking-[.06em] text-white">.store</span>
          </Link>

          <form action="/store" method="GET" className="hidden min-w-0 flex-1 items-stretch overflow-hidden rounded-xl border border-[var(--line)] md:flex">
            <label className="hidden items-center gap-1.5 border-r border-[var(--line)] bg-[#F1F5F9] px-3 text-xs font-bold text-[#64748B] lg:flex">
              All Categories <ChevronDown size={13} />
            </label>
            <input
              name="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={PHYSICAL_GOODS_ENABLED ? "Search for books, notes, courses…" : "Search for notes, courses, test series…"}
              className="min-w-0 flex-1 border-0 px-4 text-sm text-[#0B1D3A] outline-none"
            />
            <button type="submit" aria-label="Search" className="grid w-14 shrink-0 place-items-center bg-[#0F766E] text-white transition hover:bg-[#115E59]">
              <Search size={18} />
            </button>
          </form>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-3">
            <Link href="/account" className="hidden items-center gap-2 text-xs font-bold text-[#0B1D3A] sm:flex" aria-label="Wishlist">
              <Heart size={19} /> <span className="hidden lg:inline">Wishlist</span>
            </Link>
            <CartBadge />
            {email ? (
              <div className="hidden items-center gap-2 sm:flex">
                <Link href="/account" className="flex items-center gap-2 text-xs font-bold text-[#0B1D3A]" aria-label="Account">
                  <UserRound size={19} /> <span className="hidden max-w-[120px] truncate lg:inline">{email}</span>
                </Link>
                <button onClick={signOut} disabled={signingOut} aria-label="Sign out" title="Sign out" className="icon-button h-9 w-9">
                  {signingOut ? <Loader2 size={15} className="animate-spin" /> : <LogOut size={15} />}
                </button>
              </div>
            ) : email === null ? (
              <Link href="/login" className="hidden items-center gap-2 text-xs font-bold text-[#0B1D3A] sm:flex" aria-label="Sign in">
                <UserRound size={19} /> <span className="hidden lg:inline">Sign in</span>
              </Link>
            ) : (
              <span className="hidden h-9 w-9 sm:block" aria-hidden />
            )}
            <button onClick={() => setOpen((v) => !v)} className="icon-button md:hidden" aria-label="Menu">
              {open ? <X size={19} /> : <Menu size={19} />}
            </button>
          </div>
        </div>

        <form action="/store" method="GET" className="store-container flex items-stretch overflow-hidden rounded-xl border border-[var(--line)] pb-3 md:hidden">
          <input name="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search the store…" className="min-w-0 flex-1 border-0 px-4 text-sm outline-none" />
          <button type="submit" aria-label="Search" className="grid w-12 shrink-0 place-items-center bg-[#0F766E] text-white"><Search size={16} /></button>
        </form>
      </div>

      {/* Category nav bar */}
      <div className="category-nav-bar hidden md:block">
        <div className="store-container flex min-h-[52px] items-center gap-8">
          <div className="relative">
            <button
              onClick={() => setCatOpen((v) => !v)}
              className="flex items-center gap-2 rounded-lg bg-[#0F766E] px-4 py-2.5 text-xs font-black text-white"
            >
              <Menu size={15} /> All Categories <ChevronDown size={13} />
            </button>
            {catOpen && (
              <div className="absolute left-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-[var(--line)] bg-white py-2 shadow-2xl">
                {(categories.length ? categories : []).map((c) => (
                  <Link key={c.id} href={`/store?category=${encodeURIComponent(c.slug)}`} onClick={() => setCatOpen(false)} className="block px-4 py-2.5 text-sm font-semibold text-[#0B1D3A] hover:bg-[#F1F5F9]">
                    {c.name}
                  </Link>
                ))}
                {!categories.length && FALLBACK_CATEGORY_LINKS.map(([label, slug]) => (
                  <Link key={label} href={`/store?category=${encodeURIComponent(slug)}`} onClick={() => setCatOpen(false)} className="block px-4 py-2.5 text-sm font-semibold text-[#0B1D3A] hover:bg-[#F1F5F9]">
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
        <div className="border-t border-[var(--line)] bg-[#F1F5F9] md:hidden">
          <nav className="store-container grid gap-2 py-5">
            {[...NAV_LINKS, ["My account", "/account"] as [string, string], ["Cart", "/cart"] as [string, string]].map(([label, href]) => (
              <Link key={label} href={href} onClick={() => setOpen(false)} className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm font-bold text-[#0B1D3A]">
                {label}
              </Link>
            ))}
            {email ? (
              <button
                onClick={() => { setOpen(false); signOut(); }}
                className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-left text-sm font-bold text-[#a13f3f]"
              >
                Sign out ({email})
              </button>
            ) : (
              <Link href="/login" onClick={() => setOpen(false)} className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm font-bold text-[#0B1D3A]">
                Sign in
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
