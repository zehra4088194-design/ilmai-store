# IlmAI Pay architecture

## Runtime

- Next.js App Router, Node.js standalone Docker image.
- Supabase Auth for admin and generated merchant sign-in accounts.
- Supabase Postgres for `admin_users`, `shopkeepers`, and rate-limit infrastructure.
- Server-side QR generation through `src/lib/payments/paymentQr.ts`.

## Roles and routes

- `/login`: sign-in for admins and merchants; there is no public registration.
- `/shopkeeper`: authenticated merchant portal, account setup, QR generation and password change.
- `/admin/shopkeepers`: administrator-only merchant creation, receiving-detail verification and access management.
- `POST /api/shopkeeper/account`: saves the signed-in merchant's own JazzCash number and receiving identifier, resets verification and returns the account to pending status.
- `POST /api/shopkeeper/qr`: derives merchant from the authenticated session and only creates a QR for active, verified receiving details.
- `POST /api/admin/shopkeepers`: admin-only shop-name creation; generates a merchant Auth login and returns a one-time temporary password.
- `PATCH|DELETE /api/admin/shopkeepers/:id`: admin-only profile, verification, activation, suspension and access management.

## Provisioning and security

The admin creates a merchant with a shop name only. A server-generated email-shaped Merchant Login ID and random temporary password are returned to the admin once. The merchant receives no public sign-up path. The shop name is stored in Auth `app_metadata`, which is only writable by trusted server code and is used only as a display label.

The merchant supplies their own JazzCash mobile number and exact provider-issued receiving identifier after signing in. These values are submitted through a server route scoped to the authenticated user's `user_id`. The receiving identifier remains unverified and QR generation remains disabled until an administrator independently checks it and activates the account.

The service-role client is imported only in server-only services and is used after a verified user/admin check. The client cannot choose another merchant's user ID or receiving identifier for QR generation.

## QR flow

1. Merchant enters a whole-PKR amount.
2. Browser sends only that amount to `POST /api/shopkeeper/qr`.
3. API checks the Supabase session, rate limit and this user's merchant row.
4. API rejects pending, suspended or unverified accounts.
5. QR builder encodes the merchant's verified receiving identifier and amount, sets the Pakistan-time expiry and recalculates CRC.
6. The merchant's shop name is displayed immediately beneath the QR.

QR creation is not payment confirmation. A future transaction ledger must use an official provider status API or verified webhook.
