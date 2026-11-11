# Purpose: Production image for CRAFT on Fly.io.
# Inputs: repo source; SKIP_ENV_VALIDATION during build so secrets are not required.
# Outputs: Next.js standalone server that migrates Postgres on boot, then serves :8080.
FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ENV SKIP_ENV_VALIDATION=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8080
ENV HOSTNAME=0.0.0.0

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/* \
  && groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

# Standalone Next server (includes its own node_modules subset).
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Migrations need drizzle-orm + postgres (not bundled into server.js).
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/scripts/migrate.mjs ./scripts/migrate.mjs
COPY --from=builder /app/package.json ./package.json
RUN npm install --omit=dev --no-save drizzle-orm@0.44.7 postgres@3.4.7 \
  && mkdir -p /app/.data/vault \
  && chown -R nextjs:nodejs /app/.data /app/node_modules /app/package.json

USER nextjs
EXPOSE 8080

CMD ["sh", "-c", "node scripts/migrate.mjs && node server.js"]
