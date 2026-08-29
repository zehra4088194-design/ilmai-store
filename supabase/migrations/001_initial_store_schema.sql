-- ============================================================================
-- IlmAI Store — Initial Schema
-- See CLAUDE_CONTEXT.md §5 for the narrative explanation of these choices.
--
-- Conventions:
--   * All money columns are integer MINOR UNITS (e.g. paisa), never float.
--   * Status/type columns are `text` + CHECK constraints, not native enums,
--     so adding a new value later is a one-line migration, not a type
--     rebuild. Canonical value lists also live in src/constants/*.ts.
--   * Every table has `created_at` / `updated_at` (trigger-maintained).
--   * RLS is enabled on every table — see the POLICIES section at the end.
-- ============================================================================

create extension if not exists "pgcrypto";

-- Generic updated_at trigger -------------------------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================================
-- IDENTITY
-- ============================================================================

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  ilmai_study_user_id uuid, -- optional cross-link to the main ilmai.study platform
  full_name text,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_profiles_updated_at before update on profiles
  for each row execute function set_updated_at();

create table addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  label text, -- e.g. "Home", "Office"
  full_name text not null,
  phone text not null,
  line1 text not null,
  line2 text,
  city text not null,
  state text,
  postal_code text,
  country text not null default 'PK',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_addresses_user_id on addresses (user_id);
create trigger trg_addresses_updated_at before update on addresses
  for each row execute function set_updated_at();

-- ============================================================================
-- ADMIN
-- ============================================================================

create table admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'admin' check (role in ('admin')), -- room for more roles later
  created_at timestamptz not null default now()
);

-- ============================================================================
-- CATALOG
-- ============================================================================

create table categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  parent_id uuid references categories (id) on delete set null,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_categories_updated_at before update on categories
  for each row execute function set_updated_at();

create table products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  -- Free-form + CHECK, not a native enum, so new product types are cheap.
  -- Canonical list mirrored in src/constants/product.ts.
  product_type text not null check (
    product_type in (
      'digital', 'physical', 'course', 'book', 'notes', 'test_series',
      'bundle', 'service'
    )
  ),
  status text not null default 'draft' check (
    status in ('draft', 'published', 'archived')
  ),
  base_price_minor int not null check (base_price_minor >= 0),
  currency text not null default 'PKR',
  is_featured boolean not null default false,
  metadata jsonb not null default '{}'::jsonb, -- type-specific extra fields
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_products_status on products (status);
create index idx_products_type on products (product_type);
create trigger trg_products_updated_at before update on products
  for each row execute function set_updated_at();

create table product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  sku text not null unique,
  name text not null, -- e.g. "Paperback", "Class 11 Bundle"
  price_minor int not null check (price_minor >= 0),
  currency text not null default 'PKR',
  is_default boolean not null default false,
  -- physical-only shipping attributes; null for digital variants
  weight_grams int,
  requires_shipping boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_variants_product_id on product_variants (product_id);
create trigger trg_variants_updated_at before update on product_variants
  for each row execute function set_updated_at();

create table product_media (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  -- B2 object key, not a public URL — resolved to a URL (public or signed)
  -- by StorageService at read time. See CLAUDE_CONTEXT.md §8.
  storage_key text not null,
  media_type text not null default 'image' check (
    media_type in ('image', 'video', 'digital_file')
  ),
  alt_text text,
  sort_order int not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_media_product_id on product_media (product_id);

create table product_categories (
  product_id uuid not null references products (id) on delete cascade,
  category_id uuid not null references categories (id) on delete cascade,
  primary key (product_id, category_id)
);

create table inventory_items (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null unique references product_variants (id) on delete cascade,
  quantity_available int not null default 0 check (quantity_available >= 0),
  low_stock_threshold int not null default 5,
  updated_at timestamptz not null default now()
);
create trigger trg_inventory_updated_at before update on inventory_items
  for each row execute function set_updated_at();

-- ============================================================================
-- CART
-- ============================================================================

create table carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles (id) on delete cascade, -- null = guest cart
  session_token text unique, -- used to identify guest carts client-side
  status text not null default 'active' check (
    status in ('active', 'converted', 'abandoned')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_carts_user_id on carts (user_id);
create trigger trg_carts_updated_at before update on carts
  for each row execute function set_updated_at();

create table cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references carts (id) on delete cascade,
  variant_id uuid not null references product_variants (id) on delete cascade,
  quantity int not null check (quantity > 0),
  -- snapshotted at add-time for display consistency; re-validated at checkout
  unit_price_snapshot_minor int not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cart_id, variant_id)
);
create index idx_cart_items_cart_id on cart_items (cart_id);
create trigger trg_cart_items_updated_at before update on cart_items
  for each row execute function set_updated_at();

-- ============================================================================
-- ORDERS
-- ============================================================================

create table orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique, -- human-readable, e.g. IL-2026-000123
  user_id uuid references profiles (id) on delete set null,
  status text not null default 'pending' check (
    status in (
      'pending', 'processing', 'fulfilled', 'completed', 'cancelled', 'refunded'
    )
  ),
  payment_status text not null default 'pending' check (
    payment_status in ('pending', 'paid', 'failed', 'refunded')
  ),
  fulfillment_status text not null default 'unfulfilled' check (
    fulfillment_status in (
      'unfulfilled', 'partially_fulfilled', 'fulfilled', 'not_applicable'
    )
  ),
  subtotal_minor int not null check (subtotal_minor >= 0),
  discount_minor int not null default 0 check (discount_minor >= 0),
  shipping_minor int not null default 0 check (shipping_minor >= 0),
  tax_minor int not null default 0 check (tax_minor >= 0),
  total_minor int not null check (total_minor >= 0),
  currency text not null default 'PKR',
  coupon_code text,
  customer_email text not null,
  customer_note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_orders_user_id on orders (user_id);
create index idx_orders_status on orders (status);
create index idx_orders_payment_status on orders (payment_status);
create trigger trg_orders_updated_at before update on orders
  for each row execute function set_updated_at();

-- order_items SNAPSHOTS product info at purchase time — see
-- CLAUDE_CONTEXT.md §5. Editing/deleting a product later must never change
-- historical order data.
create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  product_id uuid references products (id) on delete set null,
  variant_id uuid references product_variants (id) on delete set null,
  product_name_snapshot text not null,
  variant_name_snapshot text,
  product_type_snapshot text not null,
  sku_snapshot text,
  unit_price_snapshot_minor int not null check (unit_price_snapshot_minor >= 0),
  quantity int not null check (quantity > 0),
  line_total_minor int not null check (line_total_minor >= 0),
  created_at timestamptz not null default now()
);
create index idx_order_items_order_id on order_items (order_id);

-- Snapshotted shipping/billing address at time of order — addresses can
-- change or be deleted afterward without affecting the historical order.
create table order_addresses (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  address_type text not null check (address_type in ('shipping', 'billing')),
  full_name text not null,
  phone text not null,
  line1 text not null,
  line2 text,
  city text not null,
  state text,
  postal_code text,
  country text not null,
  created_at timestamptz not null default now()
);
create index idx_order_addresses_order_id on order_addresses (order_id);

-- ============================================================================
-- PAYMENTS (provider-agnostic — see PaymentProvider abstraction)
-- ============================================================================

create table payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  provider text not null default 'paddle' check (provider in ('paddle')),
  provider_customer_id text,
  provider_transaction_id text not null,
  status text not null default 'pending' check (
    status in ('pending', 'paid', 'failed', 'refunded')
  ),
  amount_minor int not null check (amount_minor >= 0),
  currency text not null default 'PKR',
  paid_at timestamptz,
  raw_event jsonb, -- last webhook payload, for audit — never logged elsewhere
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_transaction_id)
);
create index idx_payments_order_id on payments (order_id);
create trigger trg_payments_updated_at before update on payments
  for each row execute function set_updated_at();

-- ============================================================================
-- DIGITAL FULFILLMENT
-- ============================================================================

create table digital_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  order_id uuid not null references orders (id) on delete cascade,
  order_item_id uuid not null references order_items (id) on delete cascade,
  product_id uuid not null references products (id) on delete cascade,
  -- storage_key of the deliverable file in B2 (private prefix)
  storage_key text not null,
  download_count int not null default 0,
  max_downloads int, -- null = unlimited
  expires_at timestamptz, -- null = never expires
  created_at timestamptz not null default now()
);
create index idx_entitlements_user_id on digital_entitlements (user_id);
create index idx_entitlements_order_id on digital_entitlements (order_id);

-- ============================================================================
-- MARKETING — promotions, coupons, banners, featured placements
-- ============================================================================

create table promotions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  discount_type text not null check (discount_type in ('percentage', 'fixed_amount')),
  discount_value int not null check (discount_value > 0), -- percent (1-100) or minor units
  starts_at timestamptz not null,
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_promotions_updated_at before update on promotions
  for each row execute function set_updated_at();

create table coupons (
  id uuid primary key default gen_random_uuid(),
  promotion_id uuid references promotions (id) on delete set null,
  code text not null unique,
  discount_type text not null check (discount_type in ('percentage', 'fixed_amount')),
  discount_value int not null check (discount_value > 0),
  max_redemptions int, -- null = unlimited
  times_redeemed int not null default 0,
  min_order_minor int not null default 0,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  image_storage_key text,
  link_url text,
  -- where this banner is allowed to render — see CLAUDE_CONTEXT.md
  -- "PROMOTIONS / ADS" section for the placement list.
  placement text not null check (
    placement in (
      'store_home', 'store_category', 'ilmai_app_home', 'ilmai_dashboard',
      'subject_page', 'study_page'
    )
  ),
  priority int not null default 0,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index idx_banners_placement on banners (placement);

create table featured_products (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  placement text not null check (
    placement in (
      'store_home', 'store_category', 'ilmai_app_home', 'ilmai_dashboard',
      'subject_page', 'study_page'
    )
  ),
  sort_order int not null default 0,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index idx_featured_products_placement on featured_products (placement);

-- ============================================================================
-- REVIEWS
-- ============================================================================

create table reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  order_item_id uuid references order_items (id) on delete set null, -- verified-purchase link
  rating int not null check (rating between 1 and 5),
  title text,
  body text,
  moderation_status text not null default 'pending' check (
    moderation_status in ('pending', 'approved', 'rejected')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, user_id)
);
create index idx_reviews_product_id on reviews (product_id);
create trigger trg_reviews_updated_at before update on reviews
  for each row execute function set_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table profiles enable row level security;
alter table addresses enable row level security;
alter table admin_users enable row level security;
alter table categories enable row level security;
alter table products enable row level security;
alter table product_variants enable row level security;
alter table product_media enable row level security;
alter table product_categories enable row level security;
alter table inventory_items enable row level security;
alter table carts enable row level security;
alter table cart_items enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table order_addresses enable row level security;
alter table payments enable row level security;
alter table digital_entitlements enable row level security;
alter table promotions enable row level security;
alter table coupons enable row level security;
alter table banners enable row level security;
alter table featured_products enable row level security;
alter table reviews enable row level security;

-- Helper: is the current user an admin?
create or replace function is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from admin_users where user_id = auth.uid()
  );
$$;

-- Profiles: users manage their own row only
create policy "profiles_select_own" on profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on profiles for update using (auth.uid() = id);

-- Addresses: owner only
create policy "addresses_all_own" on addresses for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Admin users: only readable by admins themselves; writes are service-role only
create policy "admin_users_select_self" on admin_users for select
  using (auth.uid() = user_id or is_admin());

-- Catalog: public read of published rows; writes are service-role/admin only
create policy "categories_public_read" on categories for select
  using (is_active = true or is_admin());
create policy "products_public_read" on products for select
  using (status = 'published' or is_admin());
create policy "variants_public_read" on product_variants for select
  using (
    is_admin() or exists (
      select 1 from products p
      where p.id = product_variants.product_id and p.status = 'published'
    )
  );
create policy "media_public_read" on product_media for select
  using (
    is_admin() or exists (
      select 1 from products p
      where p.id = product_media.product_id and p.status = 'published'
    )
  );
create policy "product_categories_public_read" on product_categories for select
  using (true);

-- Inventory: admin only (never exposed raw to storefront; ProductService
-- derives an in-stock/out-of-stock boolean for public display)
create policy "inventory_admin_only" on inventory_items for all
  using (is_admin()) with check (is_admin());

-- Cart: owner only (guest carts are matched by session_token at the app
-- layer using the service role, since anon sessions have no auth.uid())
create policy "carts_owner_all" on carts for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "cart_items_owner_all" on cart_items for all
  using (
    exists (select 1 from carts c where c.id = cart_items.cart_id and c.user_id = auth.uid())
  )
  with check (
    exists (select 1 from carts c where c.id = cart_items.cart_id and c.user_id = auth.uid())
  );

-- Orders: owner read-only (no client-side insert/update/delete — orders are
-- created and mutated exclusively by trusted server-side services)
create policy "orders_owner_select" on orders for select
  using (auth.uid() = user_id or is_admin());
create policy "order_items_owner_select" on order_items for select
  using (
    is_admin() or exists (
      select 1 from orders o where o.id = order_items.order_id and o.user_id = auth.uid()
    )
  );
create policy "order_addresses_owner_select" on order_addresses for select
  using (
    is_admin() or exists (
      select 1 from orders o where o.id = order_addresses.order_id and o.user_id = auth.uid()
    )
  );

-- Payments: never directly readable by clients beyond admin (financial audit
-- data) — order status/payment_status on `orders` is what the UI reads.
create policy "payments_admin_only" on payments for select using (is_admin());

-- Digital entitlements: owner read-only
create policy "entitlements_owner_select" on digital_entitlements for select
  using (auth.uid() = user_id or is_admin());

-- Marketing tables: public read of active rows, admin-only writes
create policy "promotions_public_read" on promotions for select
  using (is_active = true or is_admin());
create policy "coupons_admin_read" on coupons for select using (is_admin());
create policy "banners_public_read" on banners for select
  using (is_active = true or is_admin());
create policy "featured_products_public_read" on featured_products for select
  using (is_active = true or is_admin());

-- Reviews: public read of approved reviews; owner can insert/update own;
-- moderation (approve/reject) is admin-only via service role.
create policy "reviews_public_read" on reviews for select
  using (moderation_status = 'approved' or auth.uid() = user_id or is_admin());
create policy "reviews_owner_insert" on reviews for insert
  with check (auth.uid() = user_id);
create policy "reviews_owner_update" on reviews for update
  using (auth.uid() = user_id);

-- NOTE: all INSERT/UPDATE/DELETE on products, variants, media, categories,
-- orders, order_items, payments, digital_entitlements, promotions, coupons,
-- banners, featured_products, inventory_items is intentionally left to the
-- service-role key (used only inside admin-authorized / trusted server
-- services) rather than given RLS policies here — see SECURITY.md.
