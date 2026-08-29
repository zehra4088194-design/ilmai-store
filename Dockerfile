# Multi-stage build for Next.js 15 (App Router) standalone output.
# Deployed via Coolify on an Oracle Cloud VM. Keep this generic —
# provider-specific logic belongs in Coolify's config, not this file.

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_APP_URL=https://ilmai.store
ARG NEXT_PUBLIC_STORE_URL=https://ilmai.store
ARG NEXT_PUBLIC_ILMAI_STUDY_URL=https://ilmai.study
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_PADDLE_CLIENT_TOKEN
ARG NEXT_PUBLIC_PADDLE_ENVIRONMENT=production
ARG NEXT_PUBLIC_DEFAULT_CURRENCY=PKR
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
  NEXT_PUBLIC_STORE_URL=$NEXT_PUBLIC_STORE_URL \
  NEXT_PUBLIC_ILMAI_STUDY_URL=$NEXT_PUBLIC_ILMAI_STUDY_URL \
  NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
  NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
  NEXT_PUBLIC_PADDLE_CLIENT_TOKEN=$NEXT_PUBLIC_PADDLE_CLIENT_TOKEN \
  NEXT_PUBLIC_PADDLE_ENVIRONMENT=$NEXT_PUBLIC_PADDLE_ENVIRONMENT \
  NEXT_PUBLIC_DEFAULT_CURRENCY=$NEXT_PUBLIC_DEFAULT_CURRENCY
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# All runtime secrets (Supabase, Paddle, B2, Resend) are injected by Coolify
# as environment variables at container start — never baked into the image.
CMD ["node", "server.js"]
