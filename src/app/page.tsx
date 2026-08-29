import { Storefront } from "@/components/storefront";
import { ProductService } from "@/services/ProductService";
import { PromotionService } from "@/services/PromotionService";
import { productListQuerySchema } from "@/validators/product";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const query = productListQuerySchema.parse({ page: 1, pageSize: 24, sort: "newest" });
  const [{ items: products }, banners, featured] = await Promise.all([
    ProductService.list(query),
    PromotionService.getActiveBanners("store_home"),
    PromotionService.getFeaturedProducts("store_home"),
  ]);
  return <Storefront products={products} banners={banners} featured={featured} />;
}
