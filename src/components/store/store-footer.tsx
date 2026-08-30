"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, Check, Facebook, Instagram, Loader2, Mail, Youtube } from "lucide-react";
import { siteConfig } from "@/config/site";

function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!email || status === "loading") return;
        setStatus("loading");
        window.setTimeout(() => setStatus("done"), 600);
      }}
      className="mt-4 flex overflow-hidden rounded-xl border border-white/15 bg-white/5"
    >
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email"
        className="min-w-0 flex-1 border-0 bg-transparent px-4 py-3 text-sm text-white outline-none placeholder:text-[#8ea9a6]"
      />
      <button type="submit" disabled={status === "loading"} className="gold-btn min-w-[46px] rounded-none px-4">
        {status === "loading" ? <Loader2 size={15} className="animate-spin" /> : status === "done" ? <Check size={15} /> : "Subscribe"}
      </button>
    </form>
  );
}

export function StoreFooter() {
  return (
    <footer className="mt-20 bg-[#112d33] text-white">
      <div className="store-container grid gap-12 py-16 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Link href="/" className="flex items-center gap-2">
            <span className="text-lg font-black text-white">IlmAI</span>
            <span className="rounded-md bg-[#f4bf43] px-1.5 py-0.5 text-[10px] font-black uppercase text-[#112d33]">.store</span>
          </Link>
          <p className="mt-5 max-w-xs text-sm leading-6 text-[#b5ccca]">
            Your one-stop shop for study materials, books, notes and test series — everything a student actually needs, in one place.
          </p>
          <div className="mt-5 flex items-center gap-3">
            <a href="https://www.facebook.com/" target="_blank" rel="noreferrer" className="footer-social"><Facebook size={16} /></a>
            <a href="https://www.instagram.com/" target="_blank" rel="noreferrer" className="footer-social"><Instagram size={16} /></a>
            <a href="https://www.youtube.com/" target="_blank" rel="noreferrer" className="footer-social"><Youtube size={16} /></a>
          </div>
        </div>

        <div>
          <h3 className="text-xs font-black uppercase tracking-[.2em] text-[#f4bf43]">Shop</h3>
          <div className="mt-5 grid gap-3 text-sm text-[#c2d4d2]">
            <Link href="/store">All Products</Link>
            <Link href="/store?search=books">Books</Link>
            <Link href="/store?search=notes">Notes</Link>
            <Link href="/store?search=courses">Courses</Link>
            <Link href="/store?search=test+series">Test Series</Link>
            <Link href="/store?search=bundle">Bundles</Link>
            <Link href="/store?search=digital">Digital Products</Link>
          </div>
        </div>

        <div>
          <h3 className="text-xs font-black uppercase tracking-[.2em] text-[#f4bf43]">Customer Service</h3>
          <div className="mt-5 grid gap-3 text-sm text-[#c2d4d2]">
            <a href="mailto:ilmai.study1@gmail.com">Contact Us</a>
            <Link href="/orders">Track Order</Link>
            <Link href="/account">My Orders</Link>
            <a href="mailto:ilmai.study1@gmail.com">Shipping Policy</a>
            <a href="mailto:ilmai.study1@gmail.com">Return Policy</a>
            <a href="mailto:ilmai.study1@gmail.com">FAQ</a>
          </div>
        </div>

        <div>
          <h3 className="text-xs font-black uppercase tracking-[.2em] text-[#f4bf43]">Account</h3>
          <div className="mt-5 grid gap-3 text-sm text-[#c2d4d2]">
            <Link href="/account">My Account</Link>
            <Link href="/login">Sign In</Link>
            <Link href="/cart">Cart</Link>
            <a href="mailto:ilmai.study1@gmail.com">Wishlist</a>
            <Link href="/account">Logout</Link>
          </div>
          <h3 className="mt-7 text-xs font-black uppercase tracking-[.2em] text-[#f4bf43]">Newsletter</h3>
          <p className="mt-2 text-xs leading-5 text-[#9eb6b3]">Subscribe to get updates on new products and offers.</p>
          <NewsletterForm />
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="store-container flex flex-col gap-4 py-6 text-xs text-[#8ea9a6] sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} IlmAI Store. All Rights Reserved.</span>
          <div className="flex items-center gap-3">
            {["VISA", "Mastercard", "JazzCash", "Easypaisa"].map((p) => (
              <span key={p} className="rounded-md border border-white/15 bg-white/5 px-2.5 py-1 text-[10px] font-bold text-[#cfe0dd]">{p}</span>
            ))}
          </div>
          <Link href={siteConfig.ilmaiStudyUrl} className="inline-flex items-center gap-1.5 font-bold text-[#f4bf43]">
            Visit IlmAI Study <ArrowUpRight size={13} />
          </Link>
          <span className="inline-flex items-center gap-1.5"><Mail size={12} /> {siteConfig.supportEmail}</span>
        </div>
      </div>
    </footer>
  );
}
