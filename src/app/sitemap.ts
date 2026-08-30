import type { MetadataRoute } from "next";
import { ProductService } from "@/services/ProductService";
import { siteConfig } from "@/config/site";

export const dynamic = "force-dynamic";

/**
 * Next.js App Router native sitemap (served at /sitemap.xml automatically).
 * Only public, indexable pages belong here — admin, account, orders, cart,
 * checkout, login/signup, and every /api/* route are deliberately excluded
 * (they're also blocked in public/robots.txt).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = siteConfig.url.replace(/\/$/, "");
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/store`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
  ];

  let productRoutes: MetadataRoute.Sitemap = [];
  try {
    const products = await ProductService.listPublishedForSitemap();
    productRoutes = products.map((product) => ({
      url: `${baseUrl}/store/${product.slug}`,
      lastModified: new Date(product.updatedAt),
      changeFrequency: "weekly",
      priority: 0.7,
    }));
  } catch {
    // A DB hiccup should never take the whole sitemap down — ship the
    // static routes and let the next regeneration pick products back up.
  }

  return [...staticRoutes, ...productRoutes];
}
