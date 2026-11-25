# IlmAI Pay architecture

## Runtime

- Next.js App Router, Node.js standalone Docker image.
- Supabase Auth for admin and merchant sign-in.
- Supabase Postgres for `admin_users`, `shopkeepers`, and existing rate-limit infrastructure.
- Server-side QR creation through `src/lib/payments/paymentQr.ts`.

## Roles and routes

- `/login`: sign-in only; no public signup.
- `/shopkeeper`: authenticated merchant portal.
- `/admin/shopkeepers`: administrator-only merchant provisioning and status management.
- `POST /api/shopkeeper/qr`: derives merchant from the authenticated session; accepts amount only.
- `POST /api/admin/shopkeepers`: admin-only add/invite action.
- `PATCH|DELETE /api/admin/shopkeepers/:id`: admin-only verification, activation, suspension and access removal.
- `POST /auth/logout`: clears the current Supabase session.
- `/api/health`: container health check.

## Merchant provisioning

The admin service looks up an existing Auth account by email. If it does not exist, it uses Supabase's server-side `inviteUserByEmail` API and redirects the invite through `/auth/callback` to `/shopkeeper`. It then creates a `shopkeepers` row. The exact JazzCash receiving identifier is stored separately from the display mobile number and must be verified by an administrator before the status can become active.

The service-role Supabase client is used only inside server-only services and after `requireAdmin` or a verified Auth session. It is never imported into browser code.

## QR request flow

1. Merchant enters a whole-PKR amount.
2. Browser calls `POST /api/shopkeeper/qr` with the amount only.
3. API verifies the session, applies rate limiting and loads the current user's merchant record.
4. API rejects pending, suspended or unverified accounts.
5. QR builder encodes the provider-issued receiving identifier and amount, generates Pakistan-time expiry and recalculates CRC.
6. Browser displays the returned QR.

QR creation does not confirm that a customer has paid. A future transaction ledger must be backed by an official provider status API or signed webhook.

## Database history

Old ecommerce migrations are retained as historical database migrations. The application routes, services and UI for those features are removed, but this refactor does not drop old database tables or delete production records.
