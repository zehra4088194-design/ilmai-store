-- Merchant accounts are now provisioned directly by an IlmAI administrator.
-- They are no longer created by purchasing the old JazzCash QR service product,
-- so a service order is not required for a valid merchant account.
--
-- Keep the column and any existing foreign-key/index history intact: older
-- merchants may still be linked to a service order. New admin-created
-- merchants can leave service_order_id NULL.

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'shopkeepers'
      and column_name = 'service_order_id'
  ) then
    alter table public.shopkeepers
      alter column service_order_id drop not null;
  end if;
end
$$;
