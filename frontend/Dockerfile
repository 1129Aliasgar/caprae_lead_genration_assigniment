# Frontend image.
#
# Three stages. The dependency install is its own stage so it caches
# independently of source changes, and the runtime image carries only the
# standalone Next.js output — no node_modules, no build toolchain.

# ---- deps ----
FROM node:22-alpine AS deps

WORKDIR /app

COPY package*.json ./
RUN npm ci

# ---- build ----
FROM node:22-alpine AS build

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# `NEXT_PUBLIC_*` values are inlined into the bundle at build time, so this has
# to be a build arg rather than a runtime env var. docker-compose passes it; a
# plain `docker build` falls back to localhost.
ARG NEXT_PUBLIC_API_URL=http://localhost:5000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build

# ---- runtime ----
FROM node:22-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
# Next's standalone server binds to all interfaces by default.
ENV HOSTNAME=0.0.0.0

# `output: "standalone"` emits a self-contained server plus only the modules it
# actually imports, so the runtime image needs neither node_modules nor the
# full build context.
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

USER node

EXPOSE 3000

CMD ["node", "server.js"]
