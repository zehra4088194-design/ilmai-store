/**
 * Types that mirror `supabase/migrations/001_initial_store_schema.sql`
 * row-for-row. Suffixed `Row` to avoid colliding with the domain types in
 * `src/types/*.ts`, which are what services and UI actually consume.
 *
 * Regenerate/reconcile this file whenever the schema changes. Codex may
 * eventually replace this with `supabase gen types typescript` output —
 * that's fine, keep the `Row` naming convention if so.
 */

export type UUID = string;
export type ISODateString = string;

export interface PlatformSettingsRow {
  key: string;
  value: Record<string, unknown>;
  updated_by: UUID | null;
  updated_at: ISODateString;
}

export interface ProfileRow {
  id: UUID;
  ilmai_study_user_id: UUID | null;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: ISODateString;
  updated_at: ISODateString;
}

export interface AddressRow {
  id: UUID;
  user_id: UUID;
  label: string | null;
  full_name: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string | null;
  postal_code: string | null;
  country: string;
  is_default: boolean;
  created_at: ISODateString;
  updated_at: ISODateString;
}

export interface AdminUserRow {
  user_id: UUID;
  role: "admin";
  created_at: ISODateString;
}

export interface CategoryRow {
  id: UUID;
  slug: string;
  name: string;
  description: string | null;
  parent_id: UUID | null;
  sort_order: number;
  is_active: boolean;
  created_at: ISODateString;
  updated_at: ISODateString;
}

export interface ProductRow {
  id: UUID;
  slug: string;
  title: string;
  description: string | null;
  product_type: string;
  status: "draft" | "published" | "archived";
  base_price_minor: number;
  currency: string;
  is_featured: boolean;
  metadata: Record<string, unknown>;
  created_at: ISODateString;
  updated_at: ISODateString;
}

export interface ProductVariantRow {
  id: UUID;
  product_id: UUID;
  sku: string;
  name: string;
  price_minor: number;
  currency: string;
  is_default: boolean;
  weight_grams: number | null;
  requires_shipping: boolean;
  metadata: Record<string, unknown>;
  created_at: ISODateString;
  updated_at: ISODateString;
}

export interface ProductMediaRow {
  id: UUID;
  product_id: UUID;
  storage_key: string;
  media_type: "image" | "video" | "digital_file";
  alt_text: string | null;
  sort_order: number;
  is_primary: boolean;
  created_at: ISODateString;
}

export interface InventoryItemRow {
  id: UUID;
  variant_id: UUID;
  quantity_available: number;
  low_stock_threshold: number;
  updated_at: ISODateString;
}

export interface CartRow {
  id: UUID;
  user_id: UUID | null;
  session_token: string | null;
  status: "active" | "converted" | "abandoned";
  created_at: ISODateString;
  updated_at: ISODateString;
}

export interface CartItemRow {
  id: UUID;
  cart_id: UUID;
  variant_id: UUID;
  quantity: number;
  unit_price_snapshot_minor: number;
  created_at: ISODateString;
  updated_at: ISODateString;
}

export interface OrderRow {
  id: UUID;
  order_number: string;
  user_id: UUID | null;
  status:
    | "pending"
    | "processing"
    | "fulfilled"
    | "completed"
    | "cancelled"
    | "refunded";
  payment_status: "pending" | "paid" | "failed" | "refunded";
  fulfillment_status:
    | "unfulfilled"
    | "partially_fulfilled"
    | "fulfilled"
    | "not_applicable";
  subtotal_minor: number;
  discount_minor: number;
  shipping_minor: number;
  tax_minor: number;
  total_minor: number;
  currency: string;
  coupon_code: string | null;
  customer_email: string;
  customer_note: string | null;
  metadata: Record<string, unknown>;
  checkout_idempotency_key: string | null;
  checkout_provider_id: string | null;
  checkout_url: string | null;
  shipping_carrier: string | null;
  tracking_number: string | null;
  shipped_at: ISODateString | null;
  delivered_at: ISODateString | null;
  created_at: ISODateString;
  updated_at: ISODateString;
}

export interface OrderItemRow {
  id: UUID;
  order_id: UUID;
  product_id: UUID | null;
  variant_id: UUID | null;
  product_name_snapshot: string;
  variant_name_snapshot: string | null;
  product_type_snapshot: string;
  sku_snapshot: string | null;
  unit_price_snapshot_minor: number;
  quantity: number;
  line_total_minor: number;
  created_at: ISODateString;
  provider_price_id: string | null;
}

export interface OrderAddressRow {
  id: UUID;
  order_id: UUID;
  address_type: "shipping" | "billing";
  full_name: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string | null;
  postal_code: string | null;
  country: string;
  created_at: ISODateString;
}

export interface PaymentRow {
  id: UUID;
  order_id: UUID;
  provider: "paddle" | "jazzcash";
  provider_customer_id: string | null;
  provider_transaction_id: string;
  status: "pending" | "paid" | "failed" | "refunded";
  amount_minor: number;
  currency: string;
  paid_at: ISODateString | null;
  raw_event: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  created_at: ISODateString;
  updated_at: ISODateString;
}

export interface DigitalEntitlementRow {
  id: UUID;
  user_id: UUID | null;
  order_id: UUID;
  order_item_id: UUID;
  product_id: UUID;
  storage_key: string;
  download_count: number;
  max_downloads: number | null;
  expires_at: ISODateString | null;
  created_at: ISODateString;
}

export interface PromotionRow {
  id: UUID;
  name: string;
  description: string | null;
  discount_type: "percentage" | "fixed_amount";
  discount_value: number;
  starts_at: ISODateString;
  ends_at: ISODateString | null;
  is_active: boolean;
  created_at: ISODateString;
  updated_at: ISODateString;
}

export interface CouponRow {
  id: UUID;
  promotion_id: UUID | null;
  code: string;
  discount_type: "percentage" | "fixed_amount";
  discount_value: number;
  max_redemptions: number | null;
  times_redeemed: number;
  min_order_minor: number;
  starts_at: ISODateString;
  ends_at: ISODateString | null;
  is_active: boolean;
  created_at: ISODateString;
}

export type PromotionPlacement =
  | "store_home"
  | "store_category"
  | "ilmai_app_home"
  | "ilmai_dashboard"
  | "subject_page"
  | "study_page";

export interface BannerRow {
  id: UUID;
  title: string;
  subtitle: string | null;
  image_storage_key: string | null;
  link_url: string | null;
  placement: PromotionPlacement;
  priority: number;
  starts_at: ISODateString;
  ends_at: ISODateString | null;
  is_active: boolean;
  created_at: ISODateString;
}

export interface FeaturedProductRow {
  id: UUID;
  product_id: UUID;
  placement: PromotionPlacement;
  sort_order: number;
  starts_at: ISODateString;
  ends_at: ISODateString | null;
  is_active: boolean;
  created_at: ISODateString;
}

export interface ReviewRow {
  id: UUID;
  product_id: UUID;
  user_id: UUID;
  order_item_id: UUID | null;
  rating: number;
  title: string | null;
  body: string | null;
  moderation_status: "pending" | "approved" | "rejected";
  created_at: ISODateString;
  updated_at: ISODateString;
}
