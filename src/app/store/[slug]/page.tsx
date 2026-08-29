import { notFound } from "next/navigation";
import { ProductService } from "@/services/ProductService";
import { ReviewService } from "@/services/ReviewService";
import { NotFoundError } from "@/lib/errors";
import { ProductDetail } from "@/components/store/product-detail";
import { ProductReviews } from "@/components/store/product-reviews";
import { CartBadge } from "@/components/store/cart-badge";
import Link from "next/link";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params;

  const product = await ProductService.getBySlug(slug).catch((err) => {
    if (err instanceof NotFoundError) notFound();
    throw err;
  });

  const reviews = await ReviewService.listForProduct(product.id);

  return <main className="min-h-screen bg-[#f3f6f1] px-5 py-8 text-[#103d42] sm:py-14">
    <div className="mx-auto max-w-6xl">
      <div className="flex items-center justify-between">
        <Link href="/store" className="text-sm font-bold text-[#14777a]">← Back to store</Link>
        <CartBadge />
      </div>
      <div className="mt-8">
        <ProductDetail product={product} />
        <ProductReviews productId={product.id} reviews={reviews} />
      </div>
    </div>
  </main>;
}
