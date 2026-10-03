# IlmAI Store

First-party ecommerce store for the [IlmAI](https://ilmai.study) education
platform. Live at `https://ilmai.store`.

## Stack

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS · Supabase
(Postgres + Auth) · Safepay · Backblaze B2 · Brevo · Oracle Cloud + Coolify.

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
`028_shopkeeper_jazzcash_qr.sql`, which creates tenant-scoped shopkeeper
account records. The feature is provisioned by an administrator for an
existing Store account; it is not a catalog product. An admin must verify
the exact JazzCash-issued receiving identifier; it is never derived from a
mobile number.

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
settings), a cross-app SSO handoff (`/auth/handoff`), and the hierarchical
IlmAI Study Notes catalog are also implemented. The Study Notes catalog mirrors
printable `library_resources` metadata from ilmai.study without copying the
educational file contents; products are materialized lazily from the existing
`ProductService.syncNotesProduct` flow and are added through the normal cart
and checkout path.

### Shopkeeper Dynamic JazzCash QR

An administrator provisions shopkeeper access in Admin → Shopkeepers by
looking up the shopkeeper's existing Store account email and recording their
JazzCash number. This does not create an auth account, Store product, or
order. The admin separately enters and verifies the exact merchant receiving
identifier issued by JazzCash for that account; the app does not derive an
identifier from a phone number. Shopkeepers do not edit their own payment
identity in `/shopkeeper`.

`POST /api/shopkeeper/qr` takes only an amount. It derives the user from the
authenticated session and uses that user's active, verified record. The QR reuses
`src/lib/payments/paymentQr.ts`: JazzCash merchant identity is the value in
payload tag `04`, amount is tag `05`, expiry is tag `07` in `Asia/Karachi`,
and CRC is recalculated. The printed/copied mobile number is informational;
it is not encoded into the QR. Shopkeeper account rows have owner/admin
read-only RLS and no client write policy; provisioning and updates require
admin authorization, and QR generation is scoped to the session user.
Suspended, pending, or unverified accounts cannot generate QRs.

Shopkeeper customer collections are separate from IlmAI Store orders:
generating a QR creates no Store order, payment, webhook, inventory
movement, referral, or digital entitlement. The normal customer checkout QR
continues to use the default merchant identity and existing payment-review
flow.
