-- Secure, expiring access for guest orders. The raw token is only issued to
-- the browser once; the database stores its SHA-256 digest.

create table if not exists public.order_access_tokens (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders (id) on delete cascade,
  token_hash text not null unique check (length(token_hash) = 64),
  expires_at timestamptz not null default (now() + interval '30 days'),
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_order_access_tokens_expiry
  on public.order_access_tokens (expires_at)
  where revoked_at is null;

-- Guest digital purchases are secured by the order access token instead of a
-- Supabase user id. Authenticated purchases continue to use user_id.
alter table public.digital_entitlements
  alter column user_id drop not null;

alter table public.order_access_tokens enable row level security;
create policy "order_access_tokens_admin_only" on public.order_access_tokens
  for select using (public.is_admin());
revoke all on public.order_access_tokens from anon, authenticated;
grant all on public.order_access_tokens to service_role;
