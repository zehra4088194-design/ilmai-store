# CLAUDE_CONTEXT.md — IlmAI Store

This is the single source of truth for the IlmAI Store codebase. Read this file
in full before writing or changing any code. It was written by Claude (the
architecture agent) as a handoff to Codex (the implementation agent).

---

## 1. Product Purpose

**IlmAI Store** (`https://ilmai.store`) is the official, first-party ecommerce
store of the IlmAI education platform (`https://ilmai.study`). Version 1 sells
products **owned and operated by IlmAI only** — there are no third-party
sellers, vendor accounts, or marketplace commissions.

Product categories in scope:
- Digital study material, PDF notes, test series, exam prep, courses, bundles
- Physical products: books, stationery, other IlmAI-branded educational goods

The schema and services are built to support **both digital and physical
fulfillment** from day one, without over-engineering for hypothetical future
marketplace features (those are explicitly out of scope for v1 — see §13).

---

## 2. Technology Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15+ (App Router), React 19+, TypeScript |
| Styling | Tailwind CSS, shadcn/ui-compatible primitives |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Payments | Safepay (via a provider-agnostic `PaymentProvider` abstraction) |
| Object storage | Backblaze B2 (S3-compatible), via a `StorageProvider` abstraction |
| Email | Brevo, via an `EmailService` abstraction |
| Hosting | Oracle Cloud VM + Coolify (Docker) |
| Source control | GitHub |

Deliberately **not** used unless a strong need emerges later: Kubernetes,
microservices, Elasticsearch/Algolia, Redis, RabbitMQ, Kafka, separate backend
servers. This stays a single well-structured Next.js app, matching the
ilmai.study main platform's own architecture (see `/areas/ilm-ai` conventions:
Next.js 15, TS, Tailwind, Supabase, Pakistan-first, feature-based folders).

---

## 3. Architecture Overview

```
Browser (Next.js client components)
        │
        ▼
Next.js Route Handlers (src/app/api/**)  ── thin, validate + call services
        │
        ▼
Services (src/services/**)  ── all business logic lives here
        │
        ├── Supabase (Postgres + Auth + RLS)
        ├── PaymentProvider → SafepayProvider
        ├── StorageProvider → B2Provider
        └── EmailService → BrevoProvider
```

Rules:
- **Route handlers never talk to Supabase/Safepay/B2/Brevo directly.** They
  call a service. This keeps provider swaps (e.g. adding Stripe later)
  localized to one file.
- **Server vs client boundary is strict.** Anything importing a secret env var
  must live in a file that is never imported by a `"use client"` component.
  See `SECURITY.md`.
- **Domain types vs database types are separate.** `src/types/db.ts` mirrors
  the Supabase schema; `src/types/domain/*.ts` are the shapes services and UI
  actually use. Mapping happens once, inside services.

---

## 4. Folder Structure

```
src/
├── app/                     # routes, layouts, API route handlers
│   └── api/
│       ├── products/
│       ├── cart/
│       ├── checkout/
│       ├── orders/
│       ├── payments/
│       ├── webhooks/safepay/
│       ├── promotions/
│       └── admin/
├── components/              # shared, mostly presentational UI (shadcn-style)
├── config/                  # env parsing, site config, feature flags
├── constants/                # enums / string constants, no magic strings
├── hooks/                    # shared React hooks (client-side)
├── lib/                      # low-level clients: supabase, safepay, b2, brevo
├── services/                 # business logic (Product/Cart/Order/... Service)
├── types/                    # shared TS types (db + domain)
├── validators/                # Zod schemas
└── features/                 # feature-scoped UI + logic that isn't shared
    ├── products/
    ├── cart/
    ├── checkout/
    ├── orders/
    ├── payments/
    ├── customers/
    ├── reviews/
    ├── promotions/
    └── admin/
```

`lib/` holds thin SDK wrappers (the only place `@supabase/supabase-js`,
Safepay's SDK, the B2/S3 client, and Brevo's API are called). `services/`
is where business rules live and is what the rest of the app calls.

---

## 5. Database Architecture

See `supabase/migrations/001_initial_store_schema.sql` for the full schema.
Summary of tables:

- **Identity**: `profiles`, `addresses`
- **Catalog**: `categories`, `products`, `product_variants`, `product_media`,
  `product_categories` (join table)
- **Inventory**: `inventory_items` (per-variant stock, physical only)
- **Commerce**: `carts`, `cart_items`
- **Orders**: `orders`, `order_items`, `order_addresses` (snapshotted),
  `payments`
- **Digital fulfillment**: `digital_entitlements`
- **Marketing**: `promotions`, `coupons`, `banners`, `featured_products`
- **Reviews**: `reviews`
- **Admin**: `admin_users`

Key principles baked into the schema:
- `order_items` **snapshots** product name/price/variant/type at time of
  purchase (via `product_name_snapshot`, `unit_price_snapshot`, etc.) so
  editing/deleting a product later never corrupts historical orders.
- `product_type` is a free-form `text` column with a `CHECK` constraint listing
  the current known values (`digital`, `physical`, `course`, `book`, `notes`,
  `test_series`, `bundle`, `service`) — adding a new type later is a one-line
  migration, not a schema redesign.
- All money columns are integer **minor units** (e.g. paisa/cents), never
  floats.
- RLS is enabled on every table. Public catalog tables (`products`,
  `categories`, `product_media`) allow public `SELECT` of published rows only.
  Everything else is locked to the owning user or to `admin_users`. See
  `SECURITY.md` and the migration file's RLS section.

---

## 6. Authentication

- Supabase Auth is the source of truth for identity (email/password + any
  OAuth providers IlmAI already uses on ilmai.study, reusable via a shared
  Supabase project or a separate Store project — **decision needed from
  Codex/product owner**, see §14).
- `profiles` table mirrors `auth.users` 1:1 via trigger (not included yet —
  TODO for Codex, pattern is identical to the one already used on
  ilmai.study's auth system).
- Admin authorization is **not** a Supabase Auth role. It's the `admin_users`
  table (`user_id` → `auth.users.id`, `role text`). `requireAdmin()` in
  `src/lib/auth/admin.ts` is the single choke point every admin route must
  call.

---

## 7. Payment Architecture

`src/services/payment/PaymentProvider.ts` defines a provider-agnostic
interface (`createCheckout`, `getTransaction`, `verifyWebhookSignature`,
`parseWebhookEvent`). `src/services/payment/SafepayProvider.ts` implements it.
`PaymentService` (src/services/PaymentService.ts) is what the rest of the app
calls — it never imports Safepay's SDK directly.

**Non-negotiable rule:** the frontend receiving a "checkout succeeded" event
from Safepay.js is *never* sufficient to mark an order as paid. Only a
signature-verified webhook hitting `POST /api/webhooks/safepay`, processed by
`SafepayProvider.verifyWebhookSignature` + `PaymentService.handleWebhookEvent`,
is allowed to transition `orders.payment_status` to `paid`. This is enforced
in code (see `src/app/api/webhooks/safepay/route.ts` stub) and documented in
`SECURITY.md`.

Order state machine (`order_status`): `pending` → `processing` → `fulfilled` →
`completed`, with `cancelled` and `refunded` as terminal side-branches.
`payment_status`: `pending` → `paid` / `failed`, with `refunded` after `paid`.
These are separate columns on purpose — a paid order can still be
unfulfilled, and a fulfilled digital order is fulfilled the instant it's paid.

---

## 8. Storage Architecture (Backblaze B2)

`src/services/storage/StorageProvider.ts` interface: `upload`, `delete`,
`getMetadata`, `getSignedUrl`. `src/services/storage/B2Provider.ts`
implements it using the S3-compatible API (`@aws-sdk/client-s3` +
`@aws-sdk/s3-request-presigner` against B2's S3 endpoint).

**What goes in B2:** product images, product media, digital product files
(PDFs, course assets), private downloadable assets.
**What must never go in B2:** database records, secrets/env values,
application source code.

**Digital delivery is never a permanent public URL.** Digital files live in a
private bucket/prefix. Access is only ever through a short-lived signed URL
minted by `StorageService.getDownloadUrl(entitlementId)`, which first checks
the requesting user owns a `digital_entitlements` row for that
product/order, matching this flow:

```
Safepay → verified webhook → order.payment_status = 'paid'
     → digital_entitlements row created (order_id, user_id, product_id)
     → user requests download → entitlement checked → signed B2 URL (short TTL) issued
```

---

## 9. Email Architecture (Brevo)

`src/services/EmailService.ts` is the single call site for all transactional
email. It never gets imported into a page/component — only into other
services (`OrderService`, `PaymentService`, `PromotionService` for admin
notifications). Templates are plain functions returning `{ subject, html }`
under `src/services/email/templates/` (not yet built — stub only). Planned
templates: order confirmation, payment confirmation, digital delivery/access,
password/account email, admin new-order notification, refund/cancellation.

---

## 10. Security Rules

Full detail in `SECURITY.md`. Highlights:
- `SUPABASE_SERVICE_ROLE_ID_KEY`, Safepay private/webhook secrets,
  `B2_SECRET_ACCESS_KEY`, `BREVO_API_KEY` are **server-only** — never
  prefixed `NEXT_PUBLIC_`, never imported by client components, never logged.
- All external input (API bodies, query params, webhook payloads) is validated
  with Zod (`src/validators/**`) before touching a service.
- RLS is enabled on every table; the service-role key (which bypasses RLS) is
  only used inside `src/lib/supabase/server-admin.ts`, which is only imported
  by admin-authorized service code.
- Safepay webhooks are signature-verified before any state change.
- Digital downloads are always short-lived signed URLs, never public object
  URLs.

---

## 11. Naming & Coding Conventions

- Files: `kebab-case.ts`, React components `PascalCase.tsx`.
- Services: `PascalCaseService` class or object with static methods, one per
  file, named `src/services/<Name>Service.ts`.
- Types: domain types are singular nouns (`Product`, not `Products`).
  Database row types live in `src/types/db.ts` and are suffixed `Row`
  (`ProductRow`) to avoid collisions with domain types.
- Constants: `SCREAMING_SNAKE_CASE` values, grouped in `src/constants/*.ts`,
  exported as `as const` objects/arrays — never inline magic strings for
  status/type fields.
- Zod schemas: `src/validators/<thing>.ts`, exported as `<thing>Schema`.
- API routes: thin. Parse/validate → call one service method → shape
  response. No business logic in `route.ts` files.

---

## 12. Current Implementation Status

**Done in this pass (by Claude):**
- Full folder structure
- `CLAUDE_CONTEXT.md`, `ARCHITECTURE.md`, `README.md`, `SECURITY.md`,
  `ENVIRONMENT.md`
- `.env.example`, `.gitignore`, `Dockerfile`, `.dockerignore`
- Full initial SQL schema + RLS policies (`supabase/migrations/001_initial_store_schema.sql`)
- Seed file skeleton (`supabase/seed/seed.sql`)
- Domain types (`src/types/*.ts`)
- Constants (`src/constants/*.ts`)
- Zod validators for core entities (`src/validators/*.ts`)
- Service interfaces + Safepay/B2/Brevo provider stubs
  (`src/services/**`, `src/lib/**`)
- Error model (`src/lib/errors.ts`)
- Logging abstraction (`src/lib/logger.ts`)
- API route stubs with documented responsibilities (no full business logic)
- `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`

**Explicitly NOT done (left for Codex, see next section).**

---

## 13. What Codex Should Implement Next

1. Install deps, wire up an actual Next.js 15 app if not already scaffolded
   from `create-next-app`, and confirm the stubs here compile.
2. Implement the actual `ProductService`, `CartService`, `OrderService`,
   `PaymentService`, `PromotionService`, `ReviewService`, `CustomerService`
   business logic bodies (interfaces/signatures are already defined).
3. Implement `SafepayProvider` against Safepay's actual current SDK/API
   (checkout creation, transaction retrieval, webhook signature verification)
   — the interface is fixed, the implementation is a TODO.
4. Implement `B2Provider` with `@aws-sdk/client-s3` against B2's S3 endpoint.
5. Implement `BrevoProvider` + real HTML email templates matching IlmAI's
   brand (teal/gold accents, per `/areas/ilm-ai` conventions).
6. Build the actual storefront UI: homepage, category/product listing,
   product detail, cart, checkout, order history, digital download page. This
   is the **original visual identity** work — do not reuse a generic
   Tailwind ecommerce template. See §15 design direction below.
7. Build the admin UI (products, categories, inventory, orders, promotions,
   banners, reviews, customers, settings) on top of the already-defined
   `requireAdmin()` guard and admin API route stubs.
8. Add the `profiles` auto-provisioning trigger/function mirroring
   `auth.users` (pattern already exists in the ilmai.study auth system —
   reuse it).
9. Decide and implement: shared Supabase project with ilmai.study vs. a
   separate Store Supabase project (flagged as an open decision in §14).
10. Wire real rate limiting (an interface hook exists in
    `src/lib/rate-limit.ts`, no implementation).
11. Write actual test coverage — none is included in this pass.
12. Docker/Coolify: confirm the provided `Dockerfile` builds on Oracle Cloud
    and wire real Coolify deployment config/secrets.

**Do NOT change without a strong reason:**
- The service/provider abstraction boundaries in §3.
- The order-snapshot pattern in `order_items` (§5) — required for financial
  integrity.
- The rule that only a verified Safepay webhook can set `payment_status =
  'paid'` (§7).
- The signed-URL-only digital delivery pattern (§8).
- Money-as-integer-minor-units convention.

---

## 14. Open Decisions for Product Owner / Codex

- Shared vs. separate Supabase project between ilmai.study and ilmai.store.
  This scaffold assumes a **separate** project (cleaner RLS boundary between
  a study platform and a store), but cross-linking accounts is easy either
  way via `profiles.ilmai_study_user_id` (nullable column already present).
- Whether Store accounts require full signup or support guest checkout for
  physical goods (schema supports both — `carts.user_id` is nullable).
- Final currency set (schema defaults to PKR with a `currency` column per
  order, not hard-coded).

---

## 15. Design Direction (for Codex's UI pass)

The final Store must **not** look like a Shopify default theme, a generic
Tailwind ecommerce template, Amazon/Daraz, or a generic SaaS dashboard.
Target feel: modern, premium, educational, trustworthy, technology-driven,
clean, distinctive. Reuse IlmAI's existing teal/gold accent identity and
typography choices from the ilmai.study platform for brand continuity, but
this is Codex's design pass to own — nothing in this scaffold hard-codes a
visual system beyond Tailwind config tokens left intentionally minimal.

## 16. Implementation update

The implementation pass has completed the core checkout and operations:
Safepay Billing transaction creation, verified/idempotent webhooks, JazzCash
manual claims and proof uploads, shared paid-order fulfillment, ad conversion
reporting for both payment paths, guest order access, private digital delivery,
inventory reservations, coupon reservations, rate limiting, shipping tracking
fields, product media upload, and admin category/review/settings pages. Apply
migrations 005 through 011 after the initial schema before deploying.
\n\n## 2026-08-30 UI refresh\nThe Storefront, StoreHeader, StoreFooter, product detail, cart shell, checkout shell, and global CSS were refreshed into a distinctive IlmAI-first visual system. The intent is premium educational commerce, not a generic marketplace template. Preserve this visual direction when extending the UI.\n