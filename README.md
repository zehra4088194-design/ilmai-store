# IlmAI Pay

Merchant-only dynamic JazzCash QR portal at https://ilmai.store.

The application has just two roles:
- **Admin:** invites merchant accounts, records the shopkeeper's JazzCash number and exact provider-issued receiving identifier, verifies it, and activates or suspends access.
- **Merchant:** signs in to /shopkeeper, enters an amount, and receives a server-generated dynamic QR for the merchant's verified receiving identifier.

There is no public registration, storefront, catalog, cart, checkout, customer orders, seller marketplace, or subscription billing in this app.

## Development

```bash
cp .env.example .env.local
npm install
npm run dev
```

Required environment variables:
- NEXT_PUBLIC_APP_URL
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_ID_KEY

## Admin provisioning

1. Sign in with an account present in the Supabase `admin_users` table.
2. Open /admin/shopkeepers and add the merchant's email and JazzCash mobile number.
3. If the email is not already a Supabase Auth user, the server sends an invitation email through Supabase Auth.
4. Enter the exact merchant receiving identifier issued by JazzCash and mark it verified only after checking it with the provider.
5. Only an active merchant with a verified receiving identifier can generate QRs.

Configure Supabase Auth email templates and add `https://ilmai.store/auth/callback` to the project's allowed redirect URLs. Disable public email sign-ups in Supabase Auth settings; merchants must be invited by an administrator.

## Payment QR

The existing server-side QR builder is retained at `src/lib/payments/paymentQr.ts`. The QR endpoint derives the signed-in user from the Supabase session, looks up that user's merchant record, validates active/verified status, validates whole-PKR amount, rate-limits requests and generates the QR without trusting a client-supplied merchant ID.

A generated QR is **not proof of a completed payment**. Do not display payment success unless a future provider-backed transaction-status or webhook integration independently confirms it.

## Database

Historical migrations are intentionally retained so an already-deployed Supabase project keeps a valid migration history and existing data is not destroyed. The shopkeeper table and access controls are defined in `028_shopkeeper_jazzcash_qr.sql`; apply the repository's required migration history in order on a fresh project.
