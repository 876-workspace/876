# Container image for @876/billing-api (Express). The build context is the
# repository root because pnpm owns one workspace lockfile.

FROM node:22-slim AS build

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /repo
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc* ./
COPY apps/billing-api/package.json apps/billing-api/
COPY packages/core/package.json packages/core/

RUN pnpm install --frozen-lockfile --ignore-scripts --filter @876/billing-api...

COPY packages/core/src packages/core/src

WORKDIR /repo/apps/billing-api
COPY apps/billing-api/prisma ./prisma
COPY apps/billing-api/prisma.config.ts apps/billing-api/tsconfig.json apps/billing-api/tsup.config.ts ./
COPY apps/billing-api/src ./src

RUN BILLING_DATABASE_URL='prisma://127.0.0.1:1/?api_key=ci-placeholder' \
  pnpm run db:generate \
  && pnpm run build

WORKDIR /repo
RUN rm -rf node_modules apps/billing-api/node_modules \
  && pnpm install --frozen-lockfile --prod --ignore-scripts --filter @876/billing-api...

FROM node:22-slim AS runtime

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /repo/apps/billing-api
ENV NODE_ENV=production
ENV PORT=4004

COPY --from=build /repo/node_modules /repo/node_modules
COPY --from=build /repo/apps/billing-api/node_modules ./node_modules
COPY --from=build /repo/apps/billing-api/dist ./dist
COPY --from=build /repo/apps/billing-api/prisma ./prisma
COPY --from=build /repo/apps/billing-api/package.json ./package.json

USER node
EXPOSE 4004
CMD ["node", "dist/server.js"]
