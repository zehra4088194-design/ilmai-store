-- inventory_admin_only (see 001_initial_store_schema.sql) is FOR ALL, roles {public} — meaning
-- SELECT was locked to admins too, not just writes. That's wrong for a storefront: the product
-- detail page and cart both need to show real stock/"out of stock" to an anonymous or logged-in
-- customer using the anon-key client, not the service-role one. Every physical/shippable product
-- was silently showing 0 stock ("Out of stock") to every customer regardless of the real number,
-- because ProductService.mapProduct's embedded inventory_items join came back empty under RLS.
--
-- Purely additive: Postgres combines multiple permissive policies with OR, so this only ever
-- widens access (adds public SELECT) — it can't narrow what inventory_admin_only already allows
-- admins to do (insert/update/delete stay exactly as locked down as before).
create policy "inventory_public_read" on public.inventory_items
  for select
  using (true);
