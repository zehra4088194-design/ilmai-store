/**
 * Canonical product-type values. Must stay in sync with the CHECK
 * constraint on `products.product_type` in
 * supabase/migrations/001_initial_store_schema.sql. Adding a new type is a
 * two-line change: add it here AND add it to the SQL CHECK constraint via a
 * new migration — never edit the original migration in place.
 */
export const PRODUCT_TYPES = [
  "digital",
  "physical",
  "course",
  "book",
  "notes",
  "test_series",
  "bundle",
  "service",
] as const;

export type ProductType = (typeof PRODUCT_TYPES)[number];

export const DIGITAL_PRODUCT_TYPES: ProductType[] = [
  "digital",
  "course",
  "notes",
  "test_series",
];

export const PHYSICAL_PRODUCT_TYPES: ProductType[] = ["physical", "book"];

export function isDigitalProductType(type: ProductType): boolean {
  return DIGITAL_PRODUCT_TYPES.includes(type);
}

export const PRODUCT_STATUSES = ["draft", "published", "archived"] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const PRODUCT_MEDIA_TYPES = ["image", "video", "digital_file"] as const;
export type ProductMediaType = (typeof PRODUCT_MEDIA_TYPES)[number];
