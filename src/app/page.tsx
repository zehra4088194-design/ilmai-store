import { Storefront } from "@/components/storefront";
import { ProductService } from "@/services/ProductService";
import { PromotionService } from "@/services/PromotionService";
import { CategoryService } from "@/services/CategoryService";
import { WishlistService } from "@/services/WishlistService";
import { productListQuerySchema } from "@/validators/product";
import { getPlatformSettings } from "@/lib/platform-settings/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const query = productListQuerySchema.parse({ page: 1, pageSize: 12, sort: "newest" });
  const { data: { user } } = await (await createSupabaseServerClient()).auth.getUser();
  const [{ items: products }, banners, featured, categories, settings, wishlistProductIds] = await Promise.all([
    ProductService.list(query),
    PromotionService.getActiveBanners("store_home"),
    PromotionService.getFeaturedProducts("store_home"),
    CategoryService.list(),
    getPlatformSettings(),
    user ? WishlistService.listProductIds(user.id) : Promise.resolve(new Set<string>()),
  ]);

  const siteUrl = 'https://ilmai.store';
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${siteUrl}/#website`,
        name: 'IlmAI Store',
        url: siteUrl,
        description: 'The official store of the IlmAI education platform.',
        publisher: { '@id': `${siteUrl}/#organization` },
      },
      {
        '@type': 'Organization',
        '@id': `${siteUrl}/#organization`,
        name: 'IlmAI',
        url: 'https://ilmai.study',
        sameAs: [siteUrl],
      },
    ],
  };

  return (
    <>
    <Storefront
      products={products}
      banners={banners}
      featured={featured}
      categories={categories}
      usdToPkr={settings.exchangeRate.usdToPkr}
      wishlistProductIds={Array.from(wishlistProductIds)}
      isLoggedIn={Boolean(user)}
    />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }} />
    </>
  );
}
