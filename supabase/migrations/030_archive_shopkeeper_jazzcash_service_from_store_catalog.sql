-- The Shopkeeper Dynamic JazzCash QR service is separate from the IlmAI Store catalog.
-- Keep its dedicated service routes/tables available, but never expose it as a Store product.
update public.products
set status = 'archived',
    is_featured = false,
    updated_at = now()
where slug = 'jazzcash-dynamic-qr-for-shopkeepers';

update public.featured_products
set ends_at = now()
where product_id = (
  select id
  from public.products
  where slug = 'jazzcash-dynamic-qr-for-shopkeepers'
);
