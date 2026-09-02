-- Per-product delivery fee (seller/admin choose free or a set price at
-- listing time) and an optional "compare at" price shown struck through
-- next to the real price. Both are set once when the product is created
-- and are purely additive — existing rows default to free delivery and no
-- discount strike-through, so nothing already live changes behaviour.
alter table public.products
  add column if not exists delivery_fee_minor integer not null default 0
    constraint products_delivery_fee_minor_check check (delivery_fee_minor >= 0),
  add column if not exists compare_at_price_minor integer
    constraint products_compare_at_price_minor_check check (compare_at_price_minor is null or compare_at_price_minor >= 0);

comment on column public.products.delivery_fee_minor is 'Flat delivery/shipping fee in minor currency units for this product; 0 = free delivery. Only meaningful for physical/book product types.';
comment on column public.products.compare_at_price_minor is 'Optional "was" price shown struck through next to the real price to indicate a discount. Null/unset = no strike-through shown.';
