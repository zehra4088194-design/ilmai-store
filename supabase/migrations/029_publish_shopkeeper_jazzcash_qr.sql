-- Launch the Shopkeeper Dynamic JazzCash QR service as a paid Store service.
-- Initial one-time launch price: PKR 499. Admin can change it later via Products.

update public.product_variants
set price_minor = 49900,
    currency = 'PKR',
    is_default = true,
    requires_shipping = false
where sku = 'ILMAI-JC-QR-SERVICE'
  and product_id = (select id from public.products where slug = 'jazzcash-dynamic-qr-for-shopkeepers');

update public.products
set base_price_minor = 49900,
    currency = 'PKR',
    status = 'published'
where slug = 'jazzcash-dynamic-qr-for-shopkeepers';
