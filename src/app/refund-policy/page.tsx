import type { Metadata } from "next";
import { StoreHeader } from "@/components/store/store-header";
import { StoreFooter } from "@/components/store/store-footer";
import { siteConfig } from "@/config/site";
import { SUPPORT_WHATSAPP_NUMBER } from "@/constants/manual-payment";
import { PHYSICAL_GOODS_ENABLED } from "@/constants/product";

export const metadata: Metadata = { title: PHYSICAL_GOODS_ENABLED ? "Shipping & Refund Policy — IlmAI Store" : "Refund Policy — IlmAI Store" };

export default function RefundPolicyPage() {
  return (
    <main className="store-shell">
      <StoreHeader />
      <div className="store-container py-10 sm:py-14">
        <span className="eyebrow">Legal</span>
        <h1 className="section-title mt-3">{PHYSICAL_GOODS_ENABLED ? "Shipping & Refund Policy" : "Refund Policy"}</h1>
        <p className="mt-3 text-sm text-[#64748B]">Last updated: {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>

        <div className="prose-policy mt-10 max-w-3xl">
          <h2>Digital products (notes, courses, test series, other downloads)</h2>
          <ul>
            <li><strong>Delivery:</strong> instant, as soon as your payment is confirmed. Your download stays available anytime from your order in <code>My Account</code>.</li>
            <li>
              <strong>Refunds:</strong> because digital files can be downloaded immediately, we can only offer a refund
              before the file has been accessed/downloaded, or if the file is genuinely faulty, corrupted, or not what
              was described. Once a digital product has been downloaded, we cannot offer a refund for a simple change of mind.
            </li>
            <li>Contact us within 7 days of purchase if there&apos;s a problem with a digital order.</li>
          </ul>

          {PHYSICAL_GOODS_ENABLED && (
            <>
              <h2>Physical products (books, stationery)</h2>
              <ul>
                <li><strong>Shipping:</strong> we currently ship within Pakistan. Orders over PKR 2,000 ship free; smaller orders may include a delivery charge shown at checkout. Delivery typically takes a few business days depending on your city.</li>
                <li><strong>Damaged or wrong item:</strong> if what arrives is damaged, defective, or not what you ordered, contact us within 3 days of delivery with a photo — we&apos;ll replace it or refund it at no extra cost to you.</li>
                <li><strong>Change of mind:</strong> unused, unopened items in their original condition can be returned within 7 days of delivery. You&apos;re responsible for return shipping in this case, unless the return is due to our error.</li>
                <li>Once we receive and check a returned item, we process the refund to your original payment method within 5–7 business days.</li>
              </ul>
            </>
          )}

          <h2>How refunds are paid</h2>
          <p>
            A refund always goes back the way you paid: card payments (via Safepay) are refunded to the same card;
            JazzCash payments are refunded to the same wallet, coordinated with our support team over WhatsApp/email
            since those payments are verified manually.
          </p>

          <h2>Order cancellations</h2>
          <p>
            {PHYSICAL_GOODS_ENABLED
              ? "You can ask us to cancel an order before it's been fulfilled (before a digital file is issued, or before a physical order ships) for a full refund. Once a digital file has been issued or a physical order has shipped, the relevant policy above applies instead."
              : "You can ask us to cancel an order before it's been fulfilled (before a digital file is issued) for a full refund. Once a digital file has been issued, the policy above applies instead."}
          </p>

          <h2>Need help?</h2>
          <p>
            Email <a href={`mailto:${siteConfig.supportEmail}`} className="font-bold text-[#2563EB]">{siteConfig.supportEmail}</a>{" "}
            or message us on{" "}
            <a href={`https://wa.me/${SUPPORT_WHATSAPP_NUMBER.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="font-bold text-[#2563EB]">WhatsApp</a>{" "}
            with your order number and we&apos;ll help sort it out.
          </p>
        </div>
      </div>
      <StoreFooter />
    </main>
  );
}
