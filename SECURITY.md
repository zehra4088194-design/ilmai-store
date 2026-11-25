# Security

- Every admin page and admin API calls `requireAdmin()`, which checks the signed-in user against `admin_users`.
- Merchant QR generation derives the user from the server-verified Supabase session. The client cannot submit an owner ID or receiving identifier.
- Only server-side code uses the Supabase service-role key. It must never appear in a client component or `NEXT_PUBLIC_*` variable.
- The database's shopkeepers RLS policy restricts client reads to the owner or an admin; there is no client write policy.
- Merchant access must be active and the JazzCash-issued receiving identifier must be verified before QR generation.
- QR generation validates a positive whole-rupee amount, applies database rate limiting and sends `Cache-Control: no-store`.
- Public signup UI and routes are removed. Disable public signups in Supabase Auth settings as well; administrators use the Auth invitation API to provision merchant identities.
- A QR being generated or scanned is not payment confirmation. Do not mark transactions paid without an official provider status check or verified webhook.
- Never log passwords, access tokens, merchant receiving identifiers or raw payment payloads.
