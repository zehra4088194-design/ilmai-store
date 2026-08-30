# ENVIRONMENT.md — IlmAI Store

Every variable in `.env.example`, what it's for, and its exposure level.
`public` = safe to ship to the browser (`NEXT_PUBLIC_*`). `server` = must
never reach the browser (see `SECURITY.md` §1).

## Application

| Var | Exposure | Purpose |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | public | Canonical URL of this app (`https://ilmai.store`) |
| `NEXT_PUBLIC_STORE_URL` | public | Same as above, explicit alias used by cross-links from ilmai.study |
| `NEXT_PUBLIC_ILMAI_STUDY_URL` | public | URL of the main platform, for cross-linking/promotions |
| `NODE_ENV` | server | Standard Node environment flag |
| `ILMAI_STUDY_AD_CONVERSION_URL` | server | HTTPS endpoint on ilmai.study that receives paid attributed-order events |
| `ILMAI_STUDY_AD_CONVERSION_SECRET` | server | Optional bearer token for the conversion endpoint; never expose client-side |
| `EXCHANGE_RATE_API_KEY` | server | ExchangeRate-API v6 key used by the daily USD/PKR refresh |
| `CRON_SECRET` | server | Bearer secret required by the scheduled exchange-rate endpoint |

## Supabase

| Var | Exposure | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | public | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | Anon key, RLS-restricted, safe client-side |
| `SUPABASE_SERVICE_ROLE_KEY` | server | Bypasses RLS — admin/service use only, never client |

## Resend

| Var | Exposure | Purpose |
|---|---|---|
| `RESEND_API_KEY` | server | Sending transactional email |
| `RESEND_FROM_EMAIL` | server | Default from-address, e.g. `store@ilmai.study` |

## Backblaze B2 (S3-compatible)

| Var | Exposure | Purpose |
|---|---|---|
| `B2_ENDPOINT` | server | S3-compatible endpoint URL |
| `B2_REGION` | server | Region string required by the S3 SDK |
| `B2_BUCKET_NAME` | server | Bucket holding product media + digital files |
| `B2_ACCESS_KEY_ID` | server | Application key ID |
| `B2_SECRET_ACCESS_KEY` | server | Application key secret |
| `B2_PUBLIC_MEDIA_PREFIX` | server | Prefix for public product images (served via signed/public read as appropriate) |
| `B2_PRIVATE_DOWNLOADS_PREFIX` | server | Prefix for private digital files, signed-URL only |

## Paddle

| Var | Exposure | Purpose |
|---|---|---|
| `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` | public | Paddle.js client-side token for rendering checkout |
| `NEXT_PUBLIC_PADDLE_ENVIRONMENT` | public | `sandbox` or `production` |
| `PADDLE_API_KEY` | server | Server-side API key for creating transactions/checkouts |
| `PADDLE_WEBHOOK_SECRET` | server | Used to verify incoming webhook signatures |

Paddle client/public config is limited strictly to what's needed to render
Paddle's hosted/overlay checkout widget. All transaction creation, status
checks, and webhook handling happen server-side with `PADDLE_API_KEY` /
`PADDLE_WEBHOOK_SECRET`, which are never exposed to the browser.

## Admin / Misc

| Var | Exposure | Purpose |
|---|---|---|
| `ADMIN_NOTIFICATION_EMAIL` | server | Where new-order/admin alerts get sent |
| `NEXT_PUBLIC_DEFAULT_CURRENCY` | public | Default storefront currency, e.g. `PKR` |

## ilmai.study account handoff

| Var | Exposure | Purpose |
|---|---|---|
| `STORE_HANDOFF_SECRET` | server | HMAC secret verifying the short-lived token `/auth/handoff` receives from ilmai.study's `/api/store-handoff` — must be the exact same value on both deployments. See `src/lib/auth/handoff.ts`. |

## Rules

- Never commit `.env` or `.env.local` — only `.env.example` with placeholders.
- Never write a real-looking fake secret in `.env.example` — use empty values
  or obvious placeholders like `sk_live_...`.
- Any new env var must be added to `.env.example` **and** this file in the
  same change.
