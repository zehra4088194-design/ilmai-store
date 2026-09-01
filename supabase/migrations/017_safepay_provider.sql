-- Swap the card-checkout provider from Paddle to Safepay. No 'paddle' rows
-- exist in payments/payment_events at the time of this migration (checked
-- live before writing it), so this is a clean rename, not an additive value.

alter table public.payments
  drop constraint if exists payments_provider_check,
  add constraint payments_provider_check check (provider in ('safepay', 'jazzcash'));
alter table public.payments alter column provider set default 'safepay';

alter table public.payment_events
  drop constraint if exists payment_events_provider_check,
  add constraint payment_events_provider_check check (provider in ('safepay', 'jazzcash'));
