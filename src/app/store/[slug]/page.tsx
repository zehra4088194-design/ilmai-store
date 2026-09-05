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

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

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
    </main>
  );
}
