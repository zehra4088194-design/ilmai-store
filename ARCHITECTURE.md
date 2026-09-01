# ARCHITECTURE.md — IlmAI Store

Companion to `CLAUDE_CONTEXT.md`. This file goes deeper on the technical
shape of the system; `CLAUDE_CONTEXT.md` is the higher-level narrative.

## Request Flow

```
Client (React Server/Client Components)
   │
   │  fetch / server action
   ▼
Route Handler  src/app/api/<resource>/route.ts
   │  1. parse + Zod-validate input
   │  2. auth check (session / admin) if required
   │  3. call exactly one Service method
   │  4. map result/error to HTTP response
   ▼
Service  src/services/<Resource>Service.ts
   │  business rules, orchestration across providers
   ▼
lib/ clients ── Supabase / Safepay / B2 / Resend
```

## Provider Abstraction Pattern

Every external system is wrapped the same way:

```
src/services/<domain>/<Domain>Provider.ts   // interface
src/services/<domain>/<Vendor>Provider.ts   // concrete implementation
src/services/<Domain>Service.ts             // what the app actually calls
```

Example — payments:

```ts
// PaymentProvider.ts
export interface PaymentProvider {
  createCheckout(input: CreateCheckoutInput): Promise<CheckoutSession>;
  getTransaction(providerTransactionId: string): Promise<ProviderTransaction>;
  verifyWebhookSignature(rawBody: string, signature: string): boolean;
  parseWebhookEvent(rawBody: string): PaymentWebhookEvent;
}

// SafepayProvider.ts
export class SafepayProvider implements PaymentProvider { /* ... */ }

// PaymentService.ts — the only thing route handlers import
const provider: PaymentProvider = new SafepayProvider();
```

Swapping or adding a payment provider later means writing a new
`<Vendor>Provider` and changing one line where `PaymentService` picks its
provider — no route handler or UI code changes.

## Data Flow — Checkout to Fulfillment

```
1. User adds items → CartService (carts/cart_items rows)
2. User checks out → CheckoutService validates cart, computes totals,
   calls PaymentService.createCheckout() → SafepayProvider → Safepay
   → returns a checkout session/URL to the client
3. User completes payment on Safepay's hosted checkout
4. Safepay sends a webhook → POST /api/webhooks/safepay
5. Route handler verifies signature (SafepayProvider.verifyWebhookSignature)
6. PaymentService.handleWebhookEvent():
     - creates/updates `payments` row
     - transitions `orders.payment_status` → 'paid'
     - for each digital order_item → creates `digital_entitlements` row
     - calls EmailService for order + payment confirmation
     - for physical items → order_status stays 'processing' until admin
       marks shipped/fulfilled
7. User visits order/download page → StorageService.getDownloadUrl()
   checks digital_entitlements ownership → returns short-lived signed B2 URL
```

The frontend is never trusted to declare a payment successful; only step 5–6
can move `payment_status` to `paid`.

## Error Model

`src/lib/errors.ts` defines a small hierarchy (`AppError` base +
`ValidationError`, `AuthenticationError`, `AuthorizationError`,
`NotFoundError`, `PaymentError`, `StorageError`, `WebhookError`,
`ConflictError`). Route handlers catch `AppError` and map `.statusCode` /
`.publicMessage` to the HTTP response; anything else is logged and returned
as a generic 500 with no internal detail leaked to the client.

## Search

No Elasticsearch/Algolia. `ProductService.search()` uses Postgres
`ILIKE`/`tsvector` full-text search plus filter columns (category, status,
price range) and standard `ORDER BY`. This is documented as an intentional v1
constraint — indexable later with a Postgres GIN index migration if catalog
size grows.

## Admin Authorization

```
requireAdmin(request) in src/lib/auth/admin.ts:
  1. resolve Supabase session from request
  2. look up admin_users by user_id
  3. throw AuthorizationError if absent
  4. return { userId, role } to the caller
```

Every `src/app/api/admin/**` route handler calls this first, before touching
any service.

## Deployment Shape

```
GitHub repo
   │  push
   ▼
Coolify (on Oracle Cloud VM)
   │  builds Dockerfile
   ▼
Next.js container (standalone output)
   │
   ├── Supabase (managed, external)
   ├── Safepay (external)
   ├── Backblaze B2 (external)
   └── Resend (external)
```

No app-level state is kept in the container beyond process memory — it can be
restarted/scaled without data loss, matching the "no unnecessary
infrastructure" requirement.
