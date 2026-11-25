# Environment

Only these environment variables are required for the merchant-only app.

| Variable | Exposure | Purpose |
|---|---|---|
| NEXT_PUBLIC_APP_URL | public | Canonical app URL, https://ilmai.store |
| NEXT_PUBLIC_SUPABASE_URL | public | Supabase project URL |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | public | Supabase anon/publishable key |
| SUPABASE_SERVICE_ROLE_ID_KEY | server only | Privileged server-side account and merchant operations; never expose to the browser |

Set the same values in local development and Coolify. Never commit real credentials.

Supabase Auth must allow the callback URL `https://ilmai.store/auth/callback`. Disable public user registration in Supabase Auth settings; new merchant accounts are created only through the administrator's invitation flow.
