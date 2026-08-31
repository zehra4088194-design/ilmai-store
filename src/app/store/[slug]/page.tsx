import { notFound } from "next/navigation";
import { after } from "next/server";
import { ProductService } from "@/services/ProductService";
import { ReviewService } from "@/services/ReviewService";
import { ProductEventService } from "@/services/ProductEventService";
import { NotFoundError } from "@/lib/errors";
import { ProductDetail } from "@/components/store/product-detail";
import { ProductReviews } from "@/components/store/product-reviews";
import { StoreFooter } from "@/components/store/store-footer";
import { StoreHeader } from "@/components/store/store-header";
import { getPlatformSettings } from "@/lib/platform-settings/server";
import Link from "next/link";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params;

  const product = await ProductService.getBySlug(slug).catch((err) => {
    if (err instanceof NotFoundError) notFound();
    throw err;
  });

  const [reviews, settings] = await Promise.all([
    ReviewService.listForProduct(product.id),
    getPlatformSettings(),
  ]);

  // Fire-and-forget: runs after the response is sent, never delays the page.
  after(() => ProductEventService.recordView(product.id));

  return (
    <main className="store-shell">
      <StoreHeader />
      <div className="store-container py-8 sm:py-12">
        <div className="flex items-center justify-between gap-4">
          <Link href="/store" className="section-link">← Back to the shelf</Link>
          <span className="hidden rounded-full border border-[var(--line)] bg-white px-3 py-2 text-[10px] font-black uppercase tracking-[.16em] text-[#64748B] sm:inline-flex">
            IlmAI original
          </span>
        </div>
        <div className="mt-8 rounded-[32px] border border-[var(--line)] bg-white p-5 shadow-[0_20px_60px_rgba(17,45,51,.06)] sm:p-8">
          <ProductDetail product={product} usdToPkr={settings.exchangeRate.usdToPkr} />
        </div>
        <div className="mt-8 rounded-[32px] border border-[var(--line)] bg-white p-6 sm:p-8">
          <ProductReviews productId={product.id} reviews={reviews} />
        </div>
      </div>
      <StoreFooter />
    </main>
  );
}
