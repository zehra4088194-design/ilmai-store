-- Admin-managed application settings, including the USD/PKR exchange rate.
-- The table is intentionally not exposed to anon/authenticated clients;
-- server-side admin code reads and writes it with the service-role client.
create table if not exists public.platform_settings (
  key text primary key,
  value jsonb not null,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.platform_settings enable row level security;
revoke all on table public.platform_settings from anon, authenticated;
grant all on table public.platform_settings to service_role;

insert into public.platform_settings (key, value)
values (
  'store_settings',
  '{"exchangeRate":{"usdToPkr":280,"base":"USD","target":"PKR","lastUpdated":null,"fetchedAt":null,"mode":"auto","fetchedRate":null}}'::jsonb
)
on conflict (key) do nothing;
