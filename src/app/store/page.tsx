import { ProductService } from "@/services/ProductService";
import { PromotionService } from "@/services/PromotionService";
import { CategoryService } from "@/services/CategoryService";
import { WishlistService } from "@/services/WishlistService";
import { productListQuerySchema } from "@/validators/product";
import { Storefront } from "@/components/storefront";
import { getPlatformSettings } from "@/lib/platform-settings/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ search?: string }>;

export default async function StorePage({ searchParams }: { searchParams: SearchParams }) {
  const { search } = await searchParams;
  const query = productListQuerySchema.parse({ page: 1, pageSize: 24, sort: "newest", search: search || undefined });
  const { data: { user } } = await (await createSupabaseServerClient()).auth.getUser();

  const [{ items: products }, banners, featured, categories, settings, wishlistProductIds] = await Promise.all([
    ProductService.list(query),
    PromotionService.getActiveBanners("store_home"),
    PromotionService.getFeaturedProducts("store_home"),
    CategoryService.list(),
    getPlatformSettings(),
    user ? WishlistService.listProductIds(user.id) : Promise.resolve(new Set<string>()),
  ]);

  return (
    <Storefront
      products={products}
      banners={banners}
      featured={featured}
      categories={categories}
      initialSearch={search ?? ""}
      catalogMode
      usdToPkr={settings.exchangeRate.usdToPkr}
      wishlistProductIds={Array.from(wishlistProductIds)}
      isLoggedIn={Boolean(user)}
    />
  );
}
