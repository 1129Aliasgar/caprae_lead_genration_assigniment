# Backend image.
#
# Multi-stage so the runtime layer carries no TypeScript toolchain. `tsc` emits
# `dist/`, and the production image runs the compiled JavaScript.

# ---- build ----
FROM node:22-alpine AS build

WORKDIR /app

# Copy manifests first so `npm ci` is cached until dependencies actually change.
COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src

# `tsc --noEmit` first: a type error should fail the build rather than produce
# an image that crashes at runtime.
RUN npm run build

# Reinstall without dev dependencies for the runtime stage.
RUN npm ci --omit=dev

# ---- runtime ----
FROM node:22-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production
# Bind to all interfaces — inside a container, localhost is unreachable from the
# host, so a server bound to 127.0.0.1 is invisible to published ports.
ENV HOST=0.0.0.0

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json

# Never run as root: a container process that is compromised should not own the
# host user.
USER node

EXPOSE 5000

# `node dist/server.js` directly rather than `npm start` — one fewer process,
# so SIGTERM from `docker stop` reaches the server instead of npm.
CMD ["node", "dist/server.js"]
