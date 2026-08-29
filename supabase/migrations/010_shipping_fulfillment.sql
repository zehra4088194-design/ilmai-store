-- Operational fields for physical-order fulfillment. A courier integration
-- can be added later without changing the order state model.

alter table public.orders
  add column if not exists shipping_carrier text,
  add column if not exists tracking_number text,
  add column if not exists shipped_at timestamptz,
  add column if not exists delivered_at timestamptz;

create index if not exists idx_orders_tracking_number
  on public.orders (tracking_number)
  where tracking_number is not null;
