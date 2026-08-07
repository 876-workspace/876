# Container image for @876/api (Express).
#
# Replaces the FastAPI image at cutover. Kept as a separate file until the
# switch so the running service keeps building from `Dockerfile` while this one
# is validated; the cutover renames this over it.
#
# The build is two-stage because the runtime needs `node_modules` for Prisma's
# engine binaries — `tsup` bundles the application but deliberately leaves
# `@prisma/client` external, since its platform-specific engines and WASM query
# compiler must be resolved from disk rather than inlined.

# --- build -------------------------------------------------------------------
FROM node:22-slim AS build

# `openssl` is required by Prisma's engine detection; without it `generate`
# picks the wrong binary target and the runtime fails to open a connection.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN corepack enable

# Dependency manifests first, so a source-only change reuses the install layer.
COPY package.json pnpm-lock.yaml* .npmrc* ./
RUN pnpm install --frozen-lockfile --ignore-scripts

# The schema is needed before `prisma generate`, and it is a directory: Prisma 7
# multi-file schemas break silently when pointed at a single file.
COPY prisma ./prisma
RUN pnpm exec prisma generate

COPY tsconfig.json tsup.config.ts ./
COPY src ./src
RUN pnpm run node:build

# Drop dev dependencies from the layer the runtime copies.
RUN pnpm prune --prod

# --- runtime -----------------------------------------------------------------
FROM node:22-slim AS runtime

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./package.json

# Run unprivileged. The base image ships a `node` user; nothing here writes to
# the filesystem, so no directory needs to be chowned.
USER node

EXPOSE 4000

# Migrations are applied by CI, never from the container's boot path
# (`.claude/rules/express-api.md`): a container that migrates on start races
# every other replica and turns a rollout into a schema change.
CMD ["node", "dist/server.js"]
