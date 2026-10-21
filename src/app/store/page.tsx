import { ProductService } from "@/services/ProductService";
import { PromotionService } from "@/services/PromotionService";
import { CategoryService } from "@/services/CategoryService";
import { WishlistService } from "@/services/WishlistService";
import { productListQuerySchema } from "@/validators/product";
import { Storefront } from "@/components/storefront";
import { getPlatformSettings } from "@/lib/platform-settings/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Study Notes, Courses & Test Series | IlmAI Store",
  description: "Browse educational notes, courses, test series and digital study products from the official IlmAI Store.",
  alternates: { canonical: "/store" },
};

type SearchParams = Promise<{ search?: string; category?: string; page?: string; type?: string }>;

export default async function StorePage({ searchParams }: { searchParams: SearchParams }) {
  const { search, category, page, type } = await searchParams;
  // Apps get their own shelf. Both the dedicated /store?type=app link and an
  // "apps"/"softwares" category link (in case an admin created one) route to
  // the app-only listing instead of the general catalog, which excludes apps.
  const isAppsListing = type === "app" || ["app", "apps", "software", "softwares"].includes((category ?? "").toLowerCase());
  // Previously always requested page 1 / 24 and never read a page/category
  // param at all — anything past the first 24 published products, or a
  // real category filter, was unreachable via the URL.
  const query = productListQuerySchema.parse({ page: page || 1, pageSize: 24, sort: "newest", search: search || undefined, categorySlug: isAppsListing ? undefined : category || undefined, productType: isAppsListing ? "app" : undefined });
  const { data: { user } } = await (await createSupabaseServerClient()).auth.getUser();

  const [{ items: products, total }, banners, featured, categories, settings, wishlistProductIds] = await Promise.all([
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
      pagination={{ page: query.page, pageSize: query.pageSize, total, categorySlug: category, search, productType: query.productType }}
    />
  );
}
