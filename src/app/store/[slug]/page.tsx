import { notFound } from "next/navigation";
import { after } from "next/server";
import { ProductService } from "@/services/ProductService";
import { ReviewService } from "@/services/ReviewService";
import { ProductEventService } from "@/services/ProductEventService";
import { WishlistService } from "@/services/WishlistService";
import { NotFoundError } from "@/lib/errors";
import { ProductDetail } from "@/components/store/product-detail";
import { RelatedProducts } from "@/components/store/related-products";
import { ProductReviews } from "@/components/store/product-reviews";
import { StoreFooter } from "@/components/store/store-footer";
import { StoreHeader } from "@/components/store/store-header";
import { productListQuerySchema } from "@/validators/product";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import Link from "next/link";
import type { Metadata } from "next";
import { siteConfig } from "@/config/site";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const product = await ProductService.getBySlug(slug).catch(() => null);
  if (!product) {
    return { title: "Product Not Found", robots: { index: false, follow: false } };
  }

  const title = `${product.title} | IlmAI Store`;
  const description = product.description || `${product.title} — an educational product from the official IlmAI Store.`;
  return {
    title,
    description,
    keywords: [
      product.title,
      "IlmAI",
      "study notes",
      "educational products",
      ...(product.categories || []).map((category) => category.name),
    ],
    alternates: { canonical: `/store/${product.slug}` },
    openGraph: {
      type: "website",
      url: `/store/${product.slug}`,
      title,
      description,
      ...(product.media[0]?.url ? { images: [product.media[0].url] } : {}),
    },
  };
}

export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params;

  const product = await ProductService.getBySlug(slug).catch((err) => {
    if (err instanceof NotFoundError) notFound();
    throw err;
  });

  const { data: { user } } = await (await createSupabaseServerClient()).auth.getUser();
  const categorySlug = product.categories[0]?.slug;
  const [reviews, wishlistProductIds, related, hasPurchased] = await Promise.all([
    ReviewService.listForProduct(product.id),
    user ? WishlistService.listProductIds(user.id) : Promise.resolve(new Set<string>()),
    categorySlug
      ? ProductService.list(productListQuerySchema.parse({ categorySlug, pageSize: 5 })).then((r) => r.items.filter((p) => p.id !== product.id).slice(0, 4))
      : Promise.resolve([]),
    user ? ReviewService.hasPurchased(user.id, product.id) : Promise.resolve(false),
  ]);

  const prices = product.variants.length
    ? product.variants.map((variant) => variant.price.amountMinor / 100)
    : [product.basePrice.amountMinor / 100];
  const currency = product.variants[0]?.price.currency || product.basePrice.currency;
  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.description || `${product.title} — an educational product from IlmAI.`,
    url: `${siteConfig.url.replace(/\/$/, "")}/store/${product.slug}`,
    brand: { "@type": "Brand", name: "IlmAI" },
    category: product.categories[0]?.name || "Educational products",
    ...(product.media.length ? { image: product.media.map((media) => media.url) } : {}),
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: currency,
      lowPrice: Math.min(...prices).toFixed(2),
      highPrice: Math.max(...prices).toFixed(2),
      offerCount: product.variants.length || 1,
      availability: product.variants.some((variant) => !variant.requiresShipping || variant.inStock !== false)
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    },
  };

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
          <ProductDetail product={product} isWishlisted={wishlistProductIds.has(product.id)} isLoggedIn={Boolean(user)} />
        </div>
        {related.length > 0 && <RelatedProducts products={related} />}
        <div className="mt-8 rounded-[32px] border border-[var(--line)] bg-white p-6 sm:p-8">
          <ProductReviews productId={product.id} productSlug={product.slug} reviews={reviews} isLoggedIn={Boolean(user)} hasPurchased={hasPurchased} />
        </div>
      </div>
      <StoreFooter />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema).replace(/</g, "\\u003c") }}
      />
    </main>
  );
}
