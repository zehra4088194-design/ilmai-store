import { z } from "zod";
import { PRODUCT_TYPES, PRODUCT_STATUSES } from "@/constants/product";
import { SUPPORTED_CURRENCIES } from "@/constants/order";

export const moneyMinorSchema = z.number().int().min(0);

export const createProductVariantSchema = z.object({
  sku: z.string().min(1).max(64),
  name: z.string().min(1).max(120),
  priceMinor: moneyMinorSchema,
  currency: z.enum(SUPPORTED_CURRENCIES).default("PKR"),
  isDefault: z.boolean().default(false),
  requiresShipping: z.boolean().default(false),
  // Units on hand for a shippable variant; ignored for digital variants
  // (nothing to run out of). Omit/0 to start with no stock.
  stockQuantity: z.number().int().min(0).optional(),
  // Stock level at/below which the admin/seller inventory view flags this
  // variant as running low. Ignored for digital variants; DB defaults to 5
  // when omitted.
  lowStockThreshold: z.number().int().min(0).optional(),
  weightGrams: z.number().int().positive().optional(),
  providerPriceId: z.string().min(1).max(120).optional(),
});

export const adminCreateProductSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(160)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug must be kebab-case"),
  title: z.string().min(1).max(200),
  description: z.string().max(10_000).optional(),
  productType: z.enum(PRODUCT_TYPES),
  status: z.enum(PRODUCT_STATUSES).default("draft"),
  basePriceMinor: moneyMinorSchema,
  currency: z.enum(SUPPORTED_CURRENCIES).default("PKR"),
  // "Was" price shown struck through next to the real price when set;
  // omit/undefined to show no strike-through at all.
  compareAtPriceMinor: moneyMinorSchema.nullable().optional(),
  // Flat delivery fee for this product; 0 (default) means free delivery.
  deliveryFeeMinor: moneyMinorSchema.default(0),
  isFeatured: z.boolean().default(false),
  categoryIds: z.array(z.string().uuid()).default([]),
  variants: z.array(createProductVariantSchema).min(1),
  // Who on ilmai.study sees this product as an ad (see lib/ads/storeProductsFeed.ts over there).
  // Omitted/undefined = shown to everyone, same "no target_audience row" convention the main
  // app's own house-ad banners already use. adCategory only matters when adAudience is "student"
  // (or omitted) — a free-typed subject name like "Chemistry", matched case-insensitively against
  // whatever categoryContext the ilmai.study page passed in, same rule ad_banners.categories uses.
  adAudience: z.enum(["student", "parent", "teacher", "principal"]).optional(),
  adCategory: z.string().max(60).optional(),
  adGradeLevel: z.string().max(30).optional(),
});

export const adminUpdateProductSchema = adminCreateProductSchema.partial().extend({
  id: z.string().uuid(),
});

export const productListQuerySchema = z.object({
  categorySlug: z.string().optional(),
  productType: z.enum(PRODUCT_TYPES).optional(),
  search: z.string().max(200).optional(),
  minPriceMinor: z.coerce.number().int().min(0).optional(),
  maxPriceMinor: z.coerce.number().int().min(0).optional(),
  sort: z.enum(["newest", "price_asc", "price_desc", "featured"]).default("newest"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export const categorySchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  parentId: z.string().uuid().optional(),
  sortOrder: z.number().int().default(0),
});

export const categoryUpdateSchema = categorySchema.partial();

export const digitalFileMetadataSchema = z.object({
  fileName: z.string().min(1).max(255),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
});
