-- Transactional inventory reservations. Stock is held when an order is
-- created, committed when payment is confirmed, and returned on cancellation,
-- payment failure, or expiry.

create table if not exists public.inventory_reservations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  variant_id uuid not null references public.product_variants (id) on delete restrict,
  quantity int not null check (quantity > 0),
  status text not null default 'reserved'
    check (status in ('reserved', 'committed', 'released')),
  expires_at timestamptz not null default (now() + interval '45 minutes'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id, variant_id)
);

create index if not exists idx_inventory_reservations_expiry
  on public.inventory_reservations (expires_at)
  where status = 'reserved';
create index if not exists idx_inventory_reservations_order_id
  on public.inventory_reservations (order_id);

create trigger trg_inventory_reservations_updated_at
before update on public.inventory_reservations
for each row execute function public.set_updated_at();

create or replace function public.reserve_order_inventory(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  item record;
  available int;
begin
  if exists (
    select 1 from inventory_reservations
    where order_id = p_order_id and status in ('reserved', 'committed')
  ) then
    return;
  end if;

  delete from inventory_reservations
  where order_id = p_order_id and status = 'released';

  for item in
    select variant_id, sum(quantity)::int as quantity
    from order_items
    where order_id = p_order_id
      and variant_id is not null
      and product_type_snapshot in ('physical', 'book')
    group by variant_id
  loop
    select quantity_available into available
    from inventory_items
    where variant_id = item.variant_id
    for update;

    if available is null then
      raise exception 'Inventory is not configured for variant %', item.variant_id;
    end if;
    if available < item.quantity then
      raise exception 'Insufficient inventory for variant %', item.variant_id;
    end if;

    update inventory_items
    set quantity_available = quantity_available - item.quantity
    where variant_id = item.variant_id;

    insert into inventory_reservations (order_id, variant_id, quantity)
    values (p_order_id, item.variant_id, item.quantity);
  end loop;
end;
$$;

create or replace function public.commit_order_inventory(p_order_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update inventory_reservations
  set status = 'committed', expires_at = now()
  where order_id = p_order_id and status = 'reserved';
$$;

create or replace function public.release_order_inventory(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  reservation record;
begin
  for reservation in
    select variant_id, quantity
    from inventory_reservations
    where order_id = p_order_id and status = 'reserved'
    for update
  loop
    update inventory_items
    set quantity_available = quantity_available + reservation.quantity
    where variant_id = reservation.variant_id;
  end loop;

  update inventory_reservations
  set status = 'released', expires_at = now()
  where order_id = p_order_id and status = 'reserved';
end;
$$;

create or replace function public.release_expired_inventory_reservations()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  order_row record;
  released_count int := 0;
begin
  for order_row in
    select distinct order_id
    from inventory_reservations
    where status = 'reserved' and expires_at <= now()
  loop
    perform release_order_inventory(order_row.order_id);
    released_count := released_count + 1;
  end loop;
  return released_count;
end;
$$;

create or replace function public.refund_order_inventory(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  reservation record;
begin
  for reservation in
    select variant_id, quantity
    from inventory_reservations
    where order_id = p_order_id and status = 'committed'
    for update
  loop
    update inventory_items
    set quantity_available = quantity_available + reservation.quantity
    where variant_id = reservation.variant_id;
  end loop;

  update inventory_reservations
  set status = 'released', expires_at = now()
  where order_id = p_order_id and status = 'committed';
end;
$$;

alter table public.inventory_reservations enable row level security;
create policy "inventory_reservations_admin_only" on public.inventory_reservations
  for select using (public.is_admin());
revoke all on public.inventory_reservations from anon, authenticated;
grant all on public.inventory_reservations to service_role;
revoke all on function public.reserve_order_inventory(uuid) from public;
revoke all on function public.commit_order_inventory(uuid) from public;
revoke all on function public.release_order_inventory(uuid) from public;
revoke all on function public.release_expired_inventory_reservations() from public;
revoke all on function public.refund_order_inventory(uuid) from public;
grant execute on function public.reserve_order_inventory(uuid) to service_role;
grant execute on function public.commit_order_inventory(uuid) to service_role;
grant execute on function public.release_order_inventory(uuid) to service_role;
grant execute on function public.release_expired_inventory_reservations() to service_role;
grant execute on function public.refund_order_inventory(uuid) to service_role;
