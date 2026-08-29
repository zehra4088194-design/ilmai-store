-- Coupon reservations are tied to an order so a coupon cannot be consumed
-- twice by concurrent checkouts.

create table if not exists public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons (id) on delete restrict,
  order_id uuid not null unique references public.orders (id) on delete cascade,
  code text not null,
  status text not null default 'reserved' check (status in ('reserved', 'committed', 'released')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_coupon_redemptions_updated_at
before update on public.coupon_redemptions
for each row execute function public.set_updated_at();
create index if not exists idx_coupon_redemptions_coupon_id on public.coupon_redemptions (coupon_id, status);

create or replace function public.reserve_coupon_for_order(p_order_id uuid, p_code text)
returns void language plpgsql security definer set search_path = public as $$
declare coupon_row coupons%rowtype; normalized_code text := upper(trim(p_code));
begin
  if exists (select 1 from coupon_redemptions where order_id = p_order_id and status in ('reserved', 'committed')) then return; end if;
  select * into coupon_row from coupons where code = normalized_code and is_active = true and starts_at <= now() and (ends_at is null or ends_at >= now()) for update;
  if coupon_row.id is null then raise exception 'Coupon is invalid or expired'; end if;
  if coupon_row.max_redemptions is not null and coupon_row.times_redeemed >= coupon_row.max_redemptions then raise exception 'Coupon redemption limit reached'; end if;
  update coupons set times_redeemed = times_redeemed + 1 where id = coupon_row.id;
  insert into coupon_redemptions (coupon_id, order_id, code) values (coupon_row.id, p_order_id, normalized_code)
    on conflict (order_id) do update set status = 'reserved', coupon_id = excluded.coupon_id, code = excluded.code;
end; $$;

create or replace function public.commit_coupon_for_order(p_order_id uuid)
returns void language sql security definer set search_path = public as $$
  update coupon_redemptions set status = 'committed' where order_id = p_order_id and status = 'reserved';
$$;

create or replace function public.release_coupon_for_order(p_order_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare redemption coupon_redemptions%rowtype;
begin
  select * into redemption from coupon_redemptions where order_id = p_order_id and status = 'reserved' for update;
  if redemption.id is null then return; end if;
  update coupons set times_redeemed = greatest(0, times_redeemed - 1) where id = redemption.coupon_id;
  update coupon_redemptions set status = 'released' where id = redemption.id;
end; $$;

create or replace function public.release_expired_coupon_redemptions()
returns int language plpgsql security definer set search_path = public as $$
declare redemption coupon_redemptions%rowtype; released_count int := 0;
begin
  for redemption in
    select cr.* from coupon_redemptions cr join orders o on o.id = cr.order_id
    where cr.status = 'reserved' and o.payment_status = 'pending' and cr.created_at <= now() - interval '45 minutes'
    for update
  loop
    update coupons set times_redeemed = greatest(0, times_redeemed - 1) where id = redemption.coupon_id;
    update coupon_redemptions set status = 'released' where id = redemption.id;
    released_count := released_count + 1;
  end loop;
  return released_count;
end; $$;

alter table public.coupon_redemptions enable row level security;
create policy "coupon_redemptions_admin_only" on public.coupon_redemptions for select using (public.is_admin());
revoke all on public.coupon_redemptions from public, anon, authenticated;
grant all on public.coupon_redemptions to service_role;
revoke all on function public.reserve_coupon_for_order(uuid, text) from public;
revoke all on function public.commit_coupon_for_order(uuid) from public;
revoke all on function public.release_coupon_for_order(uuid) from public;
revoke all on function public.release_expired_coupon_redemptions() from public;
grant execute on function public.reserve_coupon_for_order(uuid, text) to service_role;
grant execute on function public.commit_coupon_for_order(uuid) to service_role;
grant execute on function public.release_coupon_for_order(uuid) to service_role;
grant execute on function public.release_expired_coupon_redemptions() to service_role;
