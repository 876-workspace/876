# Container image for @876/couriers-api (Express).
#
# The build context is the repository root, not apps/couriers-api: pnpm keeps
# one lockfile for the workspace, and --frozen-lockfile needs it there.

# --- build -------------------------------------------------------------------
FROM node:22-slim AS build

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /repo

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc* ./
COPY apps/couriers-api/package.json apps/couriers-api/
COPY packages/core/package.json packages/core/
COPY packages/settings/package.json packages/settings/
COPY packages/billing/package.json packages/billing/
COPY packages/server/package.json packages/server/

RUN pnpm install --frozen-lockfile --ignore-scripts --filter @876/couriers-api...

# @876/core, @876/settings, @876/billing and @876/server ship raw TypeScript, so their
# source has to be present for the bundle step — a workspace link alone gives
# esbuild nothing to resolve.
COPY packages/core/src packages/core/src
COPY packages/settings/src packages/settings/src
COPY packages/billing/src packages/billing/src
COPY packages/server/src packages/server/src

WORKDIR /repo/apps/couriers-api

COPY apps/couriers-api/prisma ./prisma
COPY apps/couriers-api/prisma.config.ts apps/couriers-api/tsconfig.json apps/couriers-api/tsup.config.ts ./
COPY apps/couriers-api/src ./src

# The generated client is excluded from the root Docker context. Generation is
# offline, so it uses a placeholder runtime URL and does not need direct DB access.
RUN DATABASE_URL='prisma://127.0.0.1:1/?api_key=ci-placeholder' pnpm run db:generate \
  && pnpm run build

WORKDIR /repo
RUN rm -rf node_modules apps/couriers-api/node_modules \
  && pnpm install --frozen-lockfile --prod --ignore-scripts --filter @876/couriers-api...

# --- runtime -----------------------------------------------------------------
FROM node:22-slim AS runtime

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /repo/apps/couriers-api

ENV NODE_ENV=production
ENV PORT=4001

COPY --from=build /repo/node_modules /repo/node_modules
COPY --from=build /repo/apps/couriers-api/node_modules ./node_modules
COPY --from=build /repo/apps/couriers-api/dist ./dist
COPY --from=build /repo/apps/couriers-api/prisma ./prisma
COPY --from=build /repo/apps/couriers-api/package.json ./package.json

USER node

EXPOSE 4001

CMD ["node", "dist/server.js"]
