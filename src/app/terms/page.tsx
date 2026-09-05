import type { Metadata } from "next";
import Link from "next/link";
import { StoreHeader } from "@/components/store/store-header";
import { StoreFooter } from "@/components/store/store-footer";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = { title: "Terms of Service — IlmAI Store" };

export default function TermsOfServicePage() {
  return (
    <main className="store-shell">
      <StoreHeader />
      <div className="store-container py-10 sm:py-14">
        <span className="eyebrow">Legal</span>
        <h1 className="section-title mt-3">Terms of Service</h1>
        <p className="mt-3 text-sm text-[#64748B]">Last updated: {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>

        <div className="prose-policy mt-10 max-w-3xl">
          <p>
            These terms apply whenever you use IlmAI Store (<code>ilmai.store</code>) — browsing, creating an account,
            or placing an order. By using the store, you agree to them. If you don&apos;t agree, please don&apos;t use the store.
          </p>

          <h2>1. Accounts</h2>
          <p>
            You need an account to check out with a saved order history, though guest checkout is available for some
            purchases. You&apos;re responsible for keeping your login details secure and for anything that happens under
            your account. Tell us right away if you think someone else has access to it.
          </p>

          <h2>2. Products and pricing</h2>
          <p>
            We try to keep product descriptions, images, and prices accurate, but mistakes can happen — we reserve the
            right to correct pricing or listing errors, and to cancel and refund an order affected by one. Prices are
            shown in the currency displayed at checkout and can change at any time before you complete an order.
          </p>

          <h2>3. Orders and payment</h2>
          <p>
            Placing an order is an offer to buy — we accept it once payment is confirmed (automatically for card
            payments via Safepay, or manually for JazzCash wallet payments once our team verifies your transaction).
            We may decline or cancel an order — for example, for suspected fraud, an out-of-stock item, or a pricing
            error — in which case any payment already made will be refunded.
          </p>

          <h2>4. Digital products</h2>
          <p>
            Digital purchases (notes, courses, test series, other downloads) are licensed to you for your own personal,
            non-commercial study use. You may not resell, redistribute, or publicly share the files. Access is
            delivered through a private, time-limited link tied to your order — please don&apos;t share that link.
          </p>

          <h2>5. Refunds and cancellations</h2>
          <p>
            See our <Link href="/refund-policy">Refund Policy</Link> for how delivery, returns, and refunds work
            for our digital products.
          </p>

          <h2>6. Reviews</h2>
          <p>
            If you leave a product review, keep it honest and relevant to the product. We moderate reviews before they
            go public and may decline to publish ones that are abusive, spam, or unrelated to the product.
          </p>

          <h2>7. Acceptable use</h2>
          <p>
            Don&apos;t use the store to break the law, attempt to access another user&apos;s account or data, interfere with
            how the site works, or upload/share anything illegal or infringing.
          </p>

          <h2>8. Liability</h2>
          <p>
            We work to keep the store accurate and available, but it&apos;s provided &ldquo;as is&rdquo;. To the extent
            allowed by law, we&apos;re not liable for indirect losses arising from your use of the store; our liability
            for any claim is limited to the amount you paid for the order in question.
          </p>

          <h2>9. Changes</h2>
          <p>
            We may update these terms from time to time — the &ldquo;last updated&rdquo; date above will reflect that.
            Continuing to use the store after a change means you accept the updated terms.
          </p>

          <h2>10. Governing law</h2>
          <p>These terms are governed by the laws of Pakistan.</p>

          <h2>Contact</h2>
          <p>
            Questions about these terms — email{" "}
            <a href={`mailto:${siteConfig.supportEmail}`} className="font-bold text-[#0F766E]">{siteConfig.supportEmail}</a>.
          </p>
        </div>
      </div>
      <StoreFooter />
    </main>
  );
}
