"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

type NavItem = readonly [string, string];

/**
 * Shared header hamburger + slide-in drawer for the admin/seller
 * dashboards. Both layouts previously rendered their sidebar nav as
 * `hidden lg:block` with nothing standing in for it below that breakpoint
 * — every nav destination other than whatever page you were already on was
 * simply unreachable on a phone. This is the mobile fallback.
 */
export function DashboardMobileNav({ brandLabel, brandBadge, navigation }: { brandLabel: string; brandBadge: string; navigation: readonly NavItem[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#E2E8F0] text-[#0B1D3A] lg:hidden"
      >
        <Menu size={20} />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-[#0B1D3A] p-6 text-white shadow-2xl">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-3 text-lg font-bold" onClick={() => setOpen(false)}>
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#0F766E] text-white">{brandBadge}</span> {brandLabel}
              </Link>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close menu" className="rounded-lg p-2 hover:bg-white/10">
                <X size={20} />
              </button>
            </div>
            <nav className="mt-10 grid gap-2 text-sm">
              {navigation.map(([label, href]) => (
                <Link key={href} href={href} onClick={() => setOpen(false)} className="rounded-xl px-4 py-3 hover:bg-white/10">
                  {label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
