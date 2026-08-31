-- Multi-seller layer. Admin stays in full control of everything (every
-- existing /admin/** route already uses requireAdmin() + the service-role
-- client, untouched by this migration) — this only adds a second,
-- narrower-scoped role: a seller can manage their OWN products, nothing
-- else. Products with seller_id = null are platform/admin-owned (all
-- existing products stay this way unless an admin reassigns them).

create table if not exists public.sellers (
  id uuid primary key references auth.users (id) on delete cascade,
  business_name text,
  status text not null default 'active' check (status in ('active', 'suspended')),
  created_at timestamptz not null default now()
);

alter table public.sellers enable row level security;

drop policy if exists "sellers read own row" on public.sellers;
create policy "sellers read own row"
  on public.sellers for select
  using (id = auth.uid());

-- Products gain an owner. Nullable and on delete set null: removing a
-- seller (or their account) must never cascade-delete their past products —
-- those just fall back to platform-owned, matching how order_items already
-- snapshot everything needed for order history independent of the product
-- row's later fate.
alter table public.products add column if not exists seller_id uuid references public.sellers (id) on delete set null;
create index if not exists idx_products_seller on public.products (seller_id);

-- Lightweight click/view tracking so a seller can see how their listings
-- are doing. Deliberately just an append-only event log (no aggregation
-- table) — the dashboard aggregates with count() on read, which is fine at
-- this store's scale and never risks the count drifting from reality.
create table if not exists public.product_events (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  event_type text not null check (event_type in ('view', 'add_to_cart')),
  created_at timestamptz not null default now()
);
create index if not exists idx_product_events_product on public.product_events (product_id, event_type, created_at);

alter table public.product_events enable row level security;
-- No client-facing policies on purpose: every row is written by the
-- service-role client from a route handler (POST /api/cart, product page
-- render), and read only via SellerService/admin using the service-role
-- client too — there's no legitimate direct-from-browser access pattern.

-- Lets the admin "add a seller by email" flow resolve an email to a user id
-- without needing to query the auth schema directly from application code
-- (the supabase-js client only targets the public schema by default).
-- security definer + a narrow grant, NOT exposed to anon/authenticated —
-- otherwise this would let any logged-in visitor enumerate which emails
-- have an account here.
create or replace function public.get_user_id_by_email(p_email text)
returns uuid
language sql
security definer
set search_path = public, auth
as $$
  select id from auth.users where lower(email) = lower(p_email) limit 1;
$$;

revoke all on function public.get_user_id_by_email(text) from public;
grant execute on function public.get_user_id_by_email(text) to service_role;
