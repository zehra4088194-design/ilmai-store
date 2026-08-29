-- IlmAI Store follow-up migration. Run manually after 001_initial_store_schema.sql.
-- Additive, safe-to-rerun production helpers.

create or replace function public.handle_new_profile()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'avatar_url')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_profile();

create index if not exists idx_products_title_lower on public.products (lower(title));
create index if not exists idx_products_created_at on public.products (created_at desc);
create index if not exists idx_product_media_primary on public.product_media (product_id, is_primary desc, sort_order);
create index if not exists idx_coupons_active_window on public.coupons (code, is_active, starts_at, ends_at);

revoke all on function public.handle_new_profile() from public;
grant execute on function public.handle_new_profile() to postgres;
