# IlmAI Store

First-party ecommerce store for the [IlmAI](https://ilmai.study) education
platform. Live at `https://ilmai.store`.

## Stack

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS · Supabase
(Postgres + Auth) · Safepay · Backblaze B2 · Resend · Oracle Cloud + Coolify.

## Getting Started

```bash
cp .env.example .env.local
npm install
npm run dev
```

See `ENVIRONMENT.md` for configuration, `SECURITY.md` for the threat model,
and `ARCHITECTURE.md` for request/data flow.

## Deployment

Coolify should deploy this repo with Docker Compose using `docker-compose.yml`.
The compose file builds the local `Dockerfile`, exposes container port `3000`,
and intentionally does not bind a host port so it can run beside `ilmai.study`
on the same server.

## Database

Supabase migrations are applied manually to the target project, in numeric
order from `supabase/migrations/`. Shopkeeper Dynamic JazzCash QR adds
`028_shopkeeper_jazzcash_qr.sql`; it creates a draft, zero-price service
listing and the tenant-scoped shopkeeper account table. Before publishing
that product, set its commercial price in Admin → Products. Each buyer also
needs a JazzCash-issued merchant receiving identifier verified in Admin →
Shopkeepers; a mobile number is not used to derive that identifier.

The daily exchange-rate workflow calls `/api/cron/usd-pkr-rate` at 20:00 UTC
(01:00 Pakistan time). The inventory cleanup workflow calls
`/api/cron/release-inventory` every 15 minutes. Both use `APP_URL` and
`CRON_SECRET` repository secrets.

Safepay's Order API doesn't use catalog price IDs — every checkout is
created from the server-side order snapshot directly. Configure Safepay's
webhook at `/api/webhooks/safepay`.

## Implemented

The core storefront, cart, guest checkout, Safepay checkout, JazzCash manual
review, payment proof upload, digital delivery, ad attribution callback,
inventory reservations, coupon reservations, shipping tracking fields, and
admin operations are implemented. Run all migrations and configure secrets
before deployment.

Customer auth (`/login`, `/signup`, `/account`, `/orders/[id]`), the full
admin panel (products + variants + media, categories, promotions/banners/
coupons, reviews moderation, order fulfillment/mark-paid/reject, inventory,
settings), and a cross-app SSO handoff (`/auth/handoff`) are also
implemented. The handoff route expects a matching token-minting endpoint on
the ilmai.study side (referenced in code comments as
`/api/store-handoff`) — that does **not exist yet** in the main app. Until
it's added there, `/auth/handoff` safely falls through to a normal
logged-out visit; nothing is broken by its absence, it's just inert.

### Shopkeeper Dynamic JazzCash QR

The JazzCash QR service is a normal `service` catalog product, not a free QR
utility. Its draft catalog listing must be priced and published by an admin.
After an authenticated buyer's Store order is marked paid through the
existing payment verification/manual review flow, the order completion
service creates or updates that user's shopkeeper access record. The
shopkeeper submits their business name, displayed JazzCash number, and
account name at `/shopkeeper`; an admin configures and verifies the exact
merchant receiving identifier issued for that JazzCash account before
activating QR use. The app does not derive a merchant ID from a phone number.

`POST /api/shopkeeper/qr` takes only an amount. It derives the user from the
authenticated session, checks the linked Store order is still paid, and
uses that user's active, verified record. The QR reuses
`src/lib/payments/paymentQr.ts`: JazzCash merchant identity is the value in
payload tag `04`, amount is tag `05`, expiry is tag `07` in `Asia/Karachi`,
and CRC is recalculated. The printed/copied mobile number is informational;
it is not encoded into the QR. Shopkeeper account rows have owner/admin
read-only RLS and no client write policy; profile edits and QR generation
are server-scoped to the session user. Suspended, revoked, refunded, or
unverified accounts cannot generate QRs.

Shopkeeper customer collections are separate from IlmAI Store orders:
generating a QR creates no Store order, payment, webhook, inventory
movement, referral, or digital entitlement. The normal customer checkout QR
continues to use the default merchant identity and existing payment-review
flow.
