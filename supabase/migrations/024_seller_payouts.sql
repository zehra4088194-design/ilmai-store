-- Sellers had product management but no commission rate and no payout
-- tracking at all — no way to know how much a seller has earned or what's
-- been paid out to them. This adds a per-seller commission rate and a
-- payout ledger; actual money movement still happens outside this system
-- (bank transfer/JazzCash, same as every other manual-payment flow here) —
-- adminRecordPayout just records that it happened, the way manual JazzCash
-- proof review works for customer payments.

alter table public.sellers add column if not exists commission_rate_bps int not null default 2000
  check (commission_rate_bps >= 0 and commission_rate_bps <= 10000);
comment on column public.sellers.commission_rate_bps is 'Platform commission in basis points (2000 = 20%) withheld from this seller''s sales before payout.';

create table if not exists public.seller_payouts (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.sellers(id) on delete cascade,
  amount_minor int not null check (amount_minor > 0),
  currency text not null,
  note text,
  recorded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
-- Read/written only via the service-role key (admin-only feature, and a
-- seller's own dashboard reads their summary through a server action, not
-- a direct client query) — no public RLS policy, matching inventory_items.
alter table public.seller_payouts enable row level security;
create index if not exists idx_seller_payouts_seller on public.seller_payouts (seller_id, created_at desc);
