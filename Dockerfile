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
# Build-time public env vars (non-secret) can be passed via --build-arg /
# Coolify build variables if ever needed. Secrets are runtime-only (below).
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
