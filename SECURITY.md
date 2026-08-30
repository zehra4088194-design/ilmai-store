# IlmAI Store security rules

## Secrets

`SUPABASE_SERVICE_ROLE_ID_KEY`, Paddle private/webhook keys, B2 secret keys, and
`RESEND_API_KEY` are server-only. They must never be prefixed `NEXT_PUBLIC_`,
imported by client components, returned in an API response, or logged.

## Row-level security

RLS is enabled on every application table. Public catalog reads are limited to
published products; user data is owner-scoped; payment, inventory, payment
event, manual claim, order event, token, and coupon-redemption tables are
service/admin-only. Guest order access uses a 30-day SHA-256 token digest and
an HttpOnly cookie.

## Payment integrity

The browser can only show payment UX. A verified Paddle webhook or an
authenticated admin verification of a JazzCash claim calls the shared
`OrderCompletionService`; only that server-side flow marks payments paid.

Paddle signatures are checked against the raw request body and rejected when
the timestamp is outside the configured tolerance. Webhook event IDs and
provider transaction IDs are unique, so retries are idempotent. Amount and
currency are compared with the server-side order snapshot for Paddle.

## Digital delivery

Digital files live under the private B2 prefix. Every download re-checks the
authenticated user or guest order token, order ID, entitlement ID, expiry, and
download limit before minting a signed URL. Signed URLs are limited to ten
minutes.

## Input and uploads

Routes validate JSON with Zod before services receive it. Product media and
payment proofs validate MIME type and size in `src/constants/upload.ts` before
being sent to B2. Payment proofs remain private and are only opened through an
admin-authorized signed redirect.

## Rate limiting

Cart writes, checkout creation, JazzCash checkout, and review submission use
the Postgres-backed limiter in `src/lib/rate-limit.ts`. Run migration 009
before enabling these routes in production.

## Logging and operations

Use `src/lib/logger.ts`. Never log secrets, tokens, raw provider payloads, or
full customer addresses/phone numbers. Scheduled jobs require an exact
`Authorization: Bearer <CRON_SECRET>` header. Every admin mutation calls
`requireAdmin()` before using a service-role client.
