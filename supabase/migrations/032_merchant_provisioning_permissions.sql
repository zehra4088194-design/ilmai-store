-- Ensure the trusted server-side provisioning service can manage merchant rows.
-- The service-role client is used only behind the admin/session authorization checks.
grant usage on schema public to service_role;
grant select, insert, update, delete on table public.shopkeepers to service_role;

-- Keep the same explicit privilege for future tables created by the postgres migration role.
alter default privileges for role postgres in schema public
  grant all on tables to service_role;
