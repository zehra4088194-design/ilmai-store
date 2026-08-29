-- The JazzCash wallet checkout path was building an order-less flow: a buyer
-- would see the QR and be told to WhatsApp a screenshot, but nothing was ever
-- recorded server-side, so there was no order for an admin to find and mark
-- paid after verifying the payment. This migration lets a 'jazzcash' payment
-- row exist (the app now creates a `pending` order + a `pending` 'jazzcash'
-- payment row up front, same as Paddle does mid-checkout, just without a
-- webhook to flip it to 'paid' automatically — an admin does that manually,
-- see OrderService.markPaid()).
alter table public.payments
  drop constraint if exists payments_provider_check,
  add constraint payments_provider_check check (provider in ('paddle', 'jazzcash'));
