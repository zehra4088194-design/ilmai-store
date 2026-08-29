-- ============================================================================
-- IlmAI Store — Development Seed Data
-- Run after 001_initial_store_schema.sql. Safe to re-run in dev (uses
-- deterministic slugs/codes with ON CONFLICT DO NOTHING where sensible).
-- Do NOT run against production.
-- ============================================================================

-- Categories -----------------------------------------------------------------
insert into categories (slug, name, description, sort_order) values
  ('notes', 'Study Notes', 'Chapter-wise notes for Classes 9-12', 1),
  ('test-series', 'Test Series', 'Practice and mock exam series', 2),
  ('books', 'Books', 'Physical educational books', 3),
  ('stationery', 'Stationery', 'Physical stationery items', 4)
on conflict (slug) do nothing;

-- Sample digital product ------------------------------------------------------
insert into products (slug, title, description, product_type, status, base_price_minor, currency, is_featured)
values (
  'physics-class-11-notes',
  'Physics Class 11 — Complete Notes',
  'Chapter-wise Physics notes for Class 11, IlmAI branded PDF.',
  'notes',
  'published',
  50000, -- PKR 500.00 in paisa
  'PKR',
  true
)
on conflict (slug) do nothing;

insert into product_variants (product_id, sku, name, price_minor, currency, is_default, requires_shipping)
select id, 'PHY-11-NOTES-PDF', 'Digital PDF', 50000, 'PKR', true, false
from products where slug = 'physics-class-11-notes'
on conflict (sku) do nothing;

-- Sample physical product ------------------------------------------------------
insert into products (slug, title, description, product_type, status, base_price_minor, currency)
values (
  'chemistry-class-10-book',
  'Chemistry Class 10 — IlmAI Study Guide (Paperback)',
  'Printed study guide covering the full Class 10 Chemistry syllabus.',
  'book',
  'published',
  120000 -- PKR 1200.00
) on conflict (slug) do nothing;

insert into product_variants (product_id, sku, name, price_minor, currency, is_default, requires_shipping, weight_grams)
select id, 'CHEM-10-BOOK-PB', 'Paperback', 120000, 'PKR', true, true, 400
from products where slug = 'chemistry-class-10-book'
on conflict (sku) do nothing;

insert into inventory_items (variant_id, quantity_available)
select v.id, 100 from product_variants v
where v.sku = 'CHEM-10-BOOK-PB'
on conflict (variant_id) do nothing;

-- Link products to categories --------------------------------------------------
insert into product_categories (product_id, category_id)
select p.id, c.id from products p, categories c
where p.slug = 'physics-class-11-notes' and c.slug = 'notes'
on conflict do nothing;

insert into product_categories (product_id, category_id)
select p.id, c.id from products p, categories c
where p.slug = 'chemistry-class-10-book' and c.slug = 'books'
on conflict do nothing;

-- Sample coupon -----------------------------------------------------------------
insert into coupons (code, discount_type, discount_value, min_order_minor, is_active)
values ('WELCOME10', 'percentage', 10, 0, true)
on conflict (code) do nothing;
