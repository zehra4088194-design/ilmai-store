create table public.shopkeepers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  service_order_id uuid not null unique references public.orders(id) on delete restrict,
  business_name text,
  jazzcash_number text,
  jazzcash_account_name text,
  receiving_identifier text,
  receiving_identifier_verified boolean not null default false,
  status text not null default 'pending_setup'
    check (status in ('pending_setup', 'pending_verification', 'active', 'suspended', 'revoked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (not receiving_identifier_verified or receiving_identifier is not null)
);

create index idx_shopkeepers_status on public.shopkeepers(status);
create trigger trg_shopkeepers_updated_at before update on public.shopkeepers
  for each row execute function set_updated_at();
alter table public.shopkeepers enable row level security;
create policy shopkeepers_owner_select on public.shopkeepers for select
  using (auth.uid() = user_id or is_admin());
create policy shopkeepers_admin_update on public.shopkeepers for update
  using (is_admin()) with check (is_admin());
grant select on public.shopkeepers to authenticated;

insert into public.products (slug, title, description, product_type, status, base_price_minor, currency, metadata)
values (
  'jazzcash-dynamic-qr-for-shopkeepers',
  'JazzCash Dynamic QR for Shopkeepers',
  'A shopkeeper QR portal powered by IlmAI Store. After your purchase is paid and your JazzCash merchant receiving identifier is verified, enter whole-rupee amounts to create fresh, downloadable and printable payment QRs for your own account. JazzCash account onboarding and provider-issued merchant identifiers are configured separately; mobile numbers are never converted into merchant identifiers.',
  'service',
  'draft',
  0,
  'PKR',
  '{"service_key":"shopkeeper_jazzcash_qr"}'::jsonb
)
on conflict (slug) do nothing;

insert into public.product_variants (product_id, sku, name, price_minor, currency, is_default, requires_shipping)
select id, 'ILMAI-JC-QR-SERVICE', 'Shopkeeper Portal Access', 0, 'PKR', true, false
from public.products
where slug = 'jazzcash-dynamic-qr-for-shopkeepers'
on conflict (sku) do nothing;

create or replace function public.prevent_unpriced_shopkeeper_qr()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.slug = 'jazzcash-dynamic-qr-for-shopkeepers'
    and new.status = 'published'
    and not exists (
      select 1 from public.product_variants v
      where v.product_id = new.id and v.price_minor > 0
    )
  then
    raise exception 'Set a non-zero shopkeeper QR service price before publishing.';
  end if;
  return new;
end;
$$;

create trigger trg_prevent_unpriced_shopkeeper_qr
before insert or update of status, slug on public.products
for each row execute function public.prevent_unpriced_shopkeeper_qr();

create or replace function public.prevent_free_published_shopkeeper_qr()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.price_minor = 0
    and exists (
      select 1 from public.products p
      where p.id = new.product_id
        and p.slug = 'jazzcash-dynamic-qr-for-shopkeepers'
        and p.status = 'published'
    )
    and not exists (
      select 1 from public.product_variants v
      where v.product_id = new.product_id
        and v.id <> new.id
        and v.price_minor > 0
    )
  then
    raise exception 'A published shopkeeper QR service must retain at least one non-zero price.';
  end if;
  return new;
end;
$$;

create trigger trg_prevent_free_published_shopkeeper_qr
before insert or update of price_minor, product_id on public.product_variants
for each row execute function public.prevent_free_published_shopkeeper_qr();

-- The draft service is intentionally not assigned a made-up price. Set its
-- base and variant price in Admin → Products before publishing it.
