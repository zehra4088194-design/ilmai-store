-- Payment operations, checkout idempotency, manual-payment review, and an
-- append-only order event trail. Apply after 005_manual_wallet_payments.sql.

alter table public.orders
  add column if not exists checkout_idempotency_key text,
  add column if not exists checkout_provider_id text,
  add column if not exists checkout_url text;

create unique index if not exists uq_orders_checkout_idempotency_key
  on public.orders (checkout_idempotency_key)
  where checkout_idempotency_key is not null;

alter table public.order_items
  add column if not exists provider_price_id text;

create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('paddle', 'jazzcash')),
  provider_event_id text not null,
  event_type text not null,
  order_id uuid references public.orders (id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'processing'
    check (status in ('processing', 'processed', 'failed')),
  error_message text,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (provider, provider_event_id)
);

create index if not exists idx_payment_events_order_id
  on public.payment_events (order_id);

create table if not exists public.manual_payment_claims (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders (id) on delete cascade,
  provider text not null default 'jazzcash'
    check (provider = 'jazzcash'),
  status text not null default 'awaiting_proof'
    check (status in ('awaiting_proof', 'submitted', 'approved', 'rejected')),
  transaction_reference text,
  proof_storage_key text,
  customer_note text,
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  reviewer_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_manual_payment_claims_updated_at
before update on public.manual_payment_claims
for each row execute function public.set_updated_at();

create index if not exists idx_manual_payment_claims_status
  on public.manual_payment_claims (status, created_at);

create table if not exists public.order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  event_type text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (order_id, event_type)
);

alter table public.payment_events enable row level security;
alter table public.manual_payment_claims enable row level security;
alter table public.order_events enable row level security;

create policy "payment_events_admin_only" on public.payment_events
  for select using (public.is_admin());
create policy "manual_payment_claims_admin_only" on public.manual_payment_claims
  for select using (public.is_admin());
create policy "order_events_admin_only" on public.order_events
  for select using (public.is_admin());

revoke all on public.payment_events from anon, authenticated;
revoke all on public.manual_payment_claims from anon, authenticated;
revoke all on public.order_events from anon, authenticated;
grant all on public.payment_events to service_role;
grant all on public.manual_payment_claims to service_role;
grant all on public.order_events to service_role;
