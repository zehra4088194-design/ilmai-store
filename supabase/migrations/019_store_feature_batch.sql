-- Store feature batch: wishlist, back-in-stock alerts, self-serve
-- return/refund requests, and a lightweight referral program. Additive
-- only — nothing here changes existing behaviour until the app code that
-- reads/writes these tables ships.

-- ── Wishlist: a signed-in user's saved products. ──────────────────────────
create table if not exists public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);
alter table public.wishlist_items enable row level security;
create policy "wishlist_items_all_own" on public.wishlist_items for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists idx_wishlist_items_user on public.wishlist_items (user_id, created_at desc);

-- ── Back-in-stock alerts: "notify me" signups for an out-of-stock variant.
-- Written/read only via the service-role key (an anonymous shopper has no
-- auth.uid()), so no public RLS policy — matches inventory_items.
create table if not exists public.stock_notifications (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  email text not null,
  user_id uuid references public.profiles(id) on delete set null,
  notified_at timestamptz,
  created_at timestamptz not null default now(),
  unique (variant_id, email)
);
alter table public.stock_notifications enable row level security;
create index if not exists idx_stock_notifications_pending on public.stock_notifications (variant_id) where notified_at is null;

-- ── Self-serve return/refund requests on a paid order. ────────────────────
create table if not exists public.order_return_requests (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  reason text not null,
  status text not null default 'requested' check (status in ('requested', 'approved', 'rejected', 'refunded')),
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id)
);
alter table public.order_return_requests enable row level security;
create policy "return_requests_owner_select" on public.order_return_requests for select
  using (auth.uid() = user_id or is_admin());
create policy "return_requests_owner_insert" on public.order_return_requests for insert
  with check (auth.uid() = user_id);
create index if not exists idx_return_requests_status on public.order_return_requests (status, created_at desc);

-- ── Referral program: every user can be given a personal code; a redeemed
-- code on signup is captured on profiles.referred_by_code and turned into a
-- reward for the referrer on the referred user's first paid order. ────────
alter table public.profiles add column if not exists referred_by_code text;

create table if not exists public.referral_codes (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  code text not null unique,
  created_at timestamptz not null default now()
);
alter table public.referral_codes enable row level security;
create policy "referral_codes_select_own" on public.referral_codes for select
  using (auth.uid() = user_id);

create table if not exists public.referral_conversions (
  id uuid primary key default gen_random_uuid(),
  referrer_user_id uuid not null references public.profiles(id) on delete cascade,
  referred_user_id uuid not null unique references public.profiles(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  reward_coupon_code text,
  created_at timestamptz not null default now()
);
alter table public.referral_conversions enable row level security;
create policy "referral_conversions_select_own" on public.referral_conversions for select
  using (auth.uid() = referrer_user_id or is_admin());

-- Capture referred_by_code (passed as auth signUp `options.data`) into the
-- new profile row, same as full_name/avatar_url already were.
create or replace function public.handle_new_profile()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url, referred_by_code)
  values (new.id, new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'referred_by_code')
  on conflict (id) do nothing;
  return new;
end;
$$;
