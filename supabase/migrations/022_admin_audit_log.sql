-- Admin audit log: records who did what to which record for every
-- sensitive admin mutation (price/status changes, deletes, refunds, order
-- cancels, coupon/category deletes, seller status changes). Nothing reads
-- or writes this except the service-role client from AuditLogService, so
-- (like inventory_items / stock_notifications) it needs no public RLS
-- policy — RLS is still enabled defensively, matching every other
-- service-role-only table in this schema.
create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  actor_role text not null,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.admin_audit_log enable row level security;
create index if not exists idx_admin_audit_log_entity on public.admin_audit_log (entity_type, entity_id);
create index if not exists idx_admin_audit_log_created_at on public.admin_audit_log (created_at desc);
