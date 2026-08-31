-- Every checkout now collects a phone number regardless of product type
-- (previously it was only asked for physical/book orders, as part of the
-- shipping address). Stored on the order itself rather than folded into
-- order_addresses, since a digital-only order has no real address to store
-- but should still carry a contact number for support/order updates.
alter table public.orders add column if not exists customer_phone text;
