# IlmAI Pay

Merchant-only dynamic JazzCash QR portal at https://ilmai.store.

The app has two roles:
- **Admin:** adds merchants by shop name only, receives a generated Merchant Login ID and temporary password, verifies their JazzCash receiving details, and activates or suspends access.
- **Merchant:** signs in using those credentials, adds their own JazzCash number and provider-issued receiving identifier, waits for admin verification, then creates dynamic payment QRs with the shop name printed beneath the QR.

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

## Merchant provisioning

1. An admin signs in using an account in the Supabase `admin_users` table.
2. At `/admin/shopkeepers`, the admin enters only the shop name.
3. The server creates a dedicated Supabase Auth account and a one-time Merchant Login ID/password. The admin copies these credentials and shares them privately with the shopkeeper.
4. The merchant signs in at `/login` and submits their own JazzCash mobile number and the exact provider-issued receiving identifier from `/shopkeeper`.
5. The merchant remains pending until an admin checks the receiving ID and marks the account active.
6. Only active, verified merchants can generate QRs.

Public sign-up is removed from the UI. Keep Supabase Auth public sign-ups disabled in the project settings.

## QR and payment security

The QR endpoint derives the merchant from the authenticated session and uses only that merchant's verified receiving identifier. It validates whole-rupee amounts, rate-limits requests and sends `Cache-Control: no-store`.

A generated or scanned QR is not proof of payment. Do not show a transaction as paid unless a provider-backed status API or verified webhook confirms it.
