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
  weightGrams: z.number().int().positive().optional(),
  paddlePriceId: z.string().regex(/^pri_[a-z0-9]+$/).optional(),
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
  isFeatured: z.boolean().default(false),
  categoryIds: z.array(z.string().uuid()).default([]),
  variants: z.array(createProductVariantSchema).min(1),
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
