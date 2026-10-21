-- ============================================================================
-- IlmAI Store — Add App Download Link Support
-- Adds download_link column to products table for app-type products
-- ============================================================================

-- Add download_link column to products table
alter table products
  add column if not exists download_link text;

-- Update the product_type CHECK constraint to include 'app'
alter table products drop constraint if exists products_product_type_check;
alter table products
  add constraint products_product_type_check
  check (
    product_type in (
      'digital', 'physical', 'course', 'book', 'notes', 'test_series',
      'bundle', 'service', 'app'
    )
  );

-- Add index on download_link for efficient queries
create index if not exists idx_products_download_link
  on products (download_link)
  where download_link is not null;
