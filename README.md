# IlmAI Store

First-party ecommerce store for the [IlmAI](https://ilmai.study) education
platform. Live at `https://ilmai.store`.

## Stack

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS · Supabase
(Postgres + Auth) · Paddle · Backblaze B2 · Resend · Oracle Cloud + Coolify.

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

Supabase is intentionally not modified by the application agent. Run these
migrations manually in order in the target project:

1. `001_initial_store_schema.sql`
2. `002_production_helpers.sql`
3. `003_fulfillment_integrity.sql`
4. `004_platform_settings.sql`
5. `005_manual_wallet_payments.sql`
6. `006_payment_operations.sql`
7. `007_guest_order_access.sql`
8. `008_inventory_reservations.sql`
9. `009_rate_limits.sql`
10. `010_shipping_fulfillment.sql`
11. `011_coupon_redemptions.sql`

The daily exchange-rate workflow calls `/api/cron/usd-pkr-rate` at 20:00 UTC
(01:00 Pakistan time). The inventory cleanup workflow calls
`/api/cron/release-inventory` every 15 minutes. Both use `APP_URL` and
`CRON_SECRET` repository secrets.

For Paddle, store a `paddle_price_id` in a product variant's `metadata` when
using catalog prices. If it is absent, the server creates a non-catalog
one-time item from the server-side order snapshot. Configure Paddle's webhook
at `/api/webhooks/paddle`.

## Implemented

The core storefront, cart, guest checkout, Paddle checkout, JazzCash manual
review, payment proof upload, digital delivery, ad attribution callback,
inventory reservations, coupon reservations, shipping tracking fields, and
admin operations are implemented. Run all migrations and configure secrets
before deployment.
