import type { Metadata } from "next";
import Link from "next/link";
import { StoreHeader } from "@/components/store/store-header";
import { StoreFooter } from "@/components/store/store-footer";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = { title: "Privacy Policy — IlmAI Store" };

export default function PrivacyPolicyPage() {
  return (
    <main className="store-shell">
      <StoreHeader />
      <div className="store-container py-10 sm:py-14">
        <span className="eyebrow">Legal</span>
        <h1 className="section-title mt-3">Privacy Policy</h1>
        <p className="mt-3 text-sm text-[#718184]">Last updated: {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>

        <div className="prose-policy mt-10 max-w-3xl">
          <p>
            IlmAI Store (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) is the official ecommerce store of the IlmAI
            education platform. This page explains what information we collect when you use{" "}
            <code>ilmai.store</code>, why we collect it, and how it&apos;s handled.
          </p>

          <h2>What we collect</h2>
          <ul>
            <li><strong>Account information</strong> — email address and password (handled by Supabase Auth) when you sign up or sign in.</li>
            <li><strong>Order information</strong> — the products you buy, your email, a phone number, and for physical orders your shipping address (name, address, city, phone), so we can deliver your order and contact you about it.</li>
            <li><strong>Payment information</strong> — we never see or store your card details. Card payments are processed entirely by Paddle, our card payment provider. For local wallet payments (JazzCash), you send payment directly to our wallet and share a transaction reference/screenshot with our team for manual verification — we don&apos;t store wallet PINs or credentials.</li>
            <li><strong>Usage information</strong> — basic interactions like product page views and cart activity, used only in aggregate to understand what&apos;s useful on the store (e.g. for sellers to see how their own listings are doing).</li>
          </ul>

          <h2>How we use it</h2>
          <ul>
            <li>To create your account and process your orders.</li>
            <li>To deliver digital products (via a secure, time-limited download link only you can access) and to arrange shipping for physical products.</li>
            <li>To contact you about your order — confirmation, delivery/shipping updates, or if we need to verify a manual payment.</li>
            <li>To respond to support requests you send us.</li>
            <li>To send you optional updates about new products or offers, only if you subscribe to our newsletter — you can unsubscribe at any time.</li>
          </ul>

          <h2>Who we share it with</h2>
          <p>We don&apos;t sell your data. We only share what&apos;s necessary to operate the store, with:</p>
          <ul>
            <li><strong>Supabase</strong> — hosts our database and handles authentication.</li>
            <li><strong>Paddle</strong> — processes card payments and, for those transactions, acts as the merchant of record.</li>
            <li><strong>Backblaze (B2)</strong> — stores product images and digital files; digital files are only ever reachable through a private, ownership-checked, time-limited link.</li>
            <li><strong>Resend</strong> — sends transactional emails (order confirmations, etc.).</li>
          </ul>
          <p>Each of these providers only receives what they need to do their specific job, and none of them may use your data for their own purposes.</p>

          <h2>How long we keep it</h2>
          <p>
            We keep order records for as long as your account exists, since they&apos;re your purchase history and proof of
            purchase for digital entitlements. You can ask us to delete your account and associated personal data at any
            time (see Contact below) — we&apos;ll keep only what we&apos;re legally required to (e.g. financial records for tax purposes).
          </p>

          <h2>Your choices</h2>
          <ul>
            <li>You can view and update your account details from <Link href="/account">My Account</Link>.</li>
            <li>You can unsubscribe from marketing emails at any time using the link in those emails.</li>
            <li>You can ask us to export or delete your data by emailing us.</li>
          </ul>

          <h2>Contact</h2>
          <p>
            Questions about this policy or your data — email{" "}
            <a href={`mailto:${siteConfig.supportEmail}`} className="font-bold text-[#1a7775]">{siteConfig.supportEmail}</a>.
          </p>

          <h2>Changes to this policy</h2>
          <p>If this policy changes in a meaningful way, we&apos;ll update the date at the top of this page.</p>
        </div>
      </div>
      <StoreFooter />
    </main>
  );
}
