import { ProductService } from "@/services/ProductService";
import { PromotionService } from "@/services/PromotionService";
import { productListQuerySchema } from "@/validators/product";
import { Storefront } from "@/components/storefront";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ search?: string }>;

export default async function StorePage({ searchParams }: { searchParams: SearchParams }) {
  const { search } = await searchParams;
  const query = productListQuerySchema.parse({ page: 1, pageSize: 24, sort: "newest", search: search || undefined });

  const [{ items: products }, banners, featured] = await Promise.all([
    ProductService.list(query),
    PromotionService.getActiveBanners("store_home"),
    PromotionService.getFeaturedProducts("store_home"),
  ]);

  return <Storefront products={products} banners={banners} featured={featured} initialSearch={search ?? ""} />;
}
