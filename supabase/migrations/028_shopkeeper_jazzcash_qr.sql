create table public.shopkeepers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  jazzcash_number text not null check (length(jazzcash_number) between 7 and 24),
  receiving_identifier text,
  receiving_identifier_verified boolean not null default false,
  status text not null default 'pending_verification'
    check (status in ('pending_verification', 'active', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (not receiving_identifier_verified or receiving_identifier is not null),
  check (status <> 'active' or (receiving_identifier_verified and receiving_identifier is not null))
);

create index idx_shopkeepers_status on public.shopkeepers(status);
create trigger trg_shopkeepers_updated_at before update on public.shopkeepers
  for each row execute function set_updated_at();
alter table public.shopkeepers enable row level security;
create policy shopkeepers_owner_select on public.shopkeepers for select
  using (auth.uid() = user_id or is_admin());
create policy shopkeepers_admin_update on public.shopkeepers for update
  using (is_admin()) with check (is_admin());
revoke all on public.shopkeepers from anon, authenticated;
grant select on public.shopkeepers to authenticated;

-- Email lookup follows the existing seller-provisioning pattern and stays
-- service-role-only; it never creates an auth user or exposes user enumeration.
