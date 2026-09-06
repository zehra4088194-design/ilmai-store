-- Store search only ever did a plain ILIKE substring match — a typo
-- ("chemestry") or a near-miss simply returned nothing. pg_trgm's
-- trigram similarity lets a close-but-not-exact term still surface
-- matches, layered on top of (not replacing) the existing substring match.
create extension if not exists pg_trgm;

create index if not exists idx_products_title_trgm on public.products using gin (title gin_trgm_ops);
create index if not exists idx_products_description_trgm on public.products using gin (description gin_trgm_ops);

-- Returns candidate product ids for a search term: substring match (as
-- before) OR trigram-similar enough to tolerate a typo. The caller
-- (ProductService.list) intersects this with its own status/category/etc.
-- filters via `.in("id", ...)`, so this function doesn't need to know
-- about publish status itself — and since it runs as the caller's own
-- role (security invoker, the default), the products RLS policy already
-- restricts what it can see the same way any other query would.
create or replace function public.search_product_ids(search_term text, similarity_threshold real default 0.2)
returns table(id uuid)
language sql
stable
set search_path = public
as $$
  select p.id
  from products p
  where p.title ilike '%' || search_term || '%'
     or p.description ilike '%' || search_term || '%'
     or similarity(p.title, search_term) > similarity_threshold
     or similarity(coalesce(p.description, ''), search_term) > similarity_threshold;
$$;

revoke execute on function public.search_product_ids(text, real) from public;
grant execute on function public.search_product_ids(text, real) to anon, authenticated;
