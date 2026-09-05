-- Marks whether the abandoned-cart reminder email has already gone out for
-- a cart, so the cron job that sends it never double-sends.
alter table public.carts add column if not exists abandoned_email_sent_at timestamptz;
comment on column public.carts.abandoned_email_sent_at is 'When the abandoned-cart reminder email was sent for this cart, if ever. Null = not sent yet; the reminder cron only ever sends once per cart.';
