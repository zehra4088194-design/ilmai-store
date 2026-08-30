import { Storefront } from "@/components/storefront";
import { ProductService } from "@/services/ProductService";
import { PromotionService } from "@/services/PromotionService";
import { CategoryService } from "@/services/CategoryService";
import { productListQuerySchema } from "@/validators/product";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const query = productListQuerySchema.parse({ page: 1, pageSize: 12, sort: "newest" });
  const [{ items: products }, banners, featured, categories] = await Promise.all([
    ProductService.list(query),
    PromotionService.getActiveBanners("store_home"),
    PromotionService.getFeaturedProducts("store_home"),
    CategoryService.list(),
  ]);

  return (
    <Storefront
      products={products}
      banners={banners}
      featured={featured}
      categories={categories}
    />
  );
}
