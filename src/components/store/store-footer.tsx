"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowUpRight, Check, Facebook, Instagram, Loader2, Mail, Youtube } from "lucide-react";
import { siteConfig } from "@/config/site";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

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
        className="min-w-0 flex-1 border-0 bg-transparent px-4 py-3 text-sm text-white outline-none placeholder:text-[#B9C4E0]"
      />
      <button type="submit" disabled={status === "loading"} className="gold-btn min-w-[46px] rounded-none px-4">
        {status === "loading" ? <Loader2 size={15} className="animate-spin" /> : status === "done" ? <Check size={15} /> : "Subscribe"}
      </button>
    </form>
  );
}

function AccountLinks() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null | undefined>(undefined);
  const [signingOut, setSigningOut] = useState(false);

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
    <div className="mt-5 grid gap-3 text-sm text-[#B9C4E0]">
      <Link href="/account">My Account</Link>
      <Link href="/orders">My Orders</Link>
      <Link href="/cart">Cart</Link>
      {email ? (
        <button type="button" onClick={signOut} disabled={signingOut} className="flex items-center gap-2 text-left text-[#B9C4E0] hover:text-[#2563EB]">
          {signingOut && <Loader2 size={13} className="animate-spin" />} Sign out {email ? `(${email})` : ""}
        </button>
      ) : (
        <Link href="/login">Sign In</Link>
      )}
    </div>
  );
}

export function StoreFooter() {
  return (
    <footer className="mt-20 bg-[#0B1D3A] text-white">
      <div className="store-container grid gap-12 py-16 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Link href="/" className="flex items-center gap-2">
            <span className="text-lg font-black text-white">IlmAI</span>
            <span className="rounded-md bg-[#2563EB] px-1.5 py-0.5 text-[10px] font-black uppercase text-[#0B1D3A]">.store</span>
          </Link>
          <p className="mt-5 max-w-xs text-sm leading-6 text-[#B9C4E0]">
            Your one-stop shop for study materials, books, notes and test series — everything a student actually needs, in one place.
          </p>
          <div className="mt-5 flex items-center gap-3">
            <a href="https://www.facebook.com/" target="_blank" rel="noreferrer" className="footer-social"><Facebook size={16} /></a>
            <a href="https://www.instagram.com/" target="_blank" rel="noreferrer" className="footer-social"><Instagram size={16} /></a>
            <a href="https://www.youtube.com/" target="_blank" rel="noreferrer" className="footer-social"><Youtube size={16} /></a>
          </div>
        </div>

        <div>
          <h3 className="text-xs font-black uppercase tracking-[.2em] text-[#2563EB]">Shop</h3>
          <div className="mt-5 grid gap-3 text-sm text-[#B9C4E0]">
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
          <h3 className="text-xs font-black uppercase tracking-[.2em] text-[#2563EB]">Customer Service</h3>
          <div className="mt-5 grid gap-3 text-sm text-[#B9C4E0]">
            <a href="mailto:ilmai.study1@gmail.com">Contact Us</a>
            <Link href="/orders">Track Order</Link>
            <Link href="/account">My Orders</Link>
            <Link href="/refund-policy">Shipping &amp; Refund Policy</Link>
            <Link href="/terms">Terms of Service</Link>
            <Link href="/privacy">Privacy Policy</Link>
          </div>
        </div>

        <div>
          <h3 className="text-xs font-black uppercase tracking-[.2em] text-[#2563EB]">Account</h3>
          <AccountLinks />
          <h3 className="mt-7 text-xs font-black uppercase tracking-[.2em] text-[#2563EB]">Newsletter</h3>
          <p className="mt-2 text-xs leading-5 text-[#B9C4E0]">Subscribe to get updates on new products and offers.</p>
          <NewsletterForm />
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="store-container flex flex-col gap-4 py-6 text-xs text-[#B9C4E0] sm:flex-row sm:items-center sm:justify-between">
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>© {new Date().getFullYear()} IlmAI Store. All Rights Reserved.</span>
            <span className="hidden text-white/20 sm:inline">·</span>
            <Link href="/privacy" className="hover:text-[#2563EB]">Privacy</Link>
            <span className="text-white/20">·</span>
            <Link href="/terms" className="hover:text-[#2563EB]">Terms</Link>
            <span className="text-white/20">·</span>
            <Link href="/refund-policy" className="hover:text-[#2563EB]">Refunds</Link>
          </span>
          <div className="flex items-center gap-3">
            {["VISA", "Mastercard", "JazzCash", "Easypaisa"].map((p) => (
              <span key={p} className="rounded-md border border-white/15 bg-white/5 px-2.5 py-1 text-[10px] font-bold text-[#B9C4E0]">{p}</span>
            ))}
          </div>
          <Link href={siteConfig.ilmaiStudyUrl} className="inline-flex items-center gap-1.5 font-bold text-[#2563EB]">
            Visit IlmAI Study <ArrowUpRight size={13} />
          </Link>
          <span className="inline-flex items-center gap-1.5"><Mail size={12} /> {siteConfig.supportEmail}</span>
        </div>
      </div>
    </footer>
  );
}
