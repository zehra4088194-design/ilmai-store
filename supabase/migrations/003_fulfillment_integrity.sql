-- Required for idempotent digital fulfillment on repeated Paddle webhooks.
-- Run manually after 002_production_helpers.sql.
create unique index if not exists uq_digital_entitlements_order_item
  on public.digital_entitlements (order_item_id);
