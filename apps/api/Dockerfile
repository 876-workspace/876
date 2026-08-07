# Container image for @876/api (Express).
#
# **The build context is the repository root**, not `apps/api` — see
# `image_build_context` in wrangler.jsonc. It has to be: pnpm keeps one
# lockfile at the root of the workspace, and `--frozen-lockfile` needs it. A
# context of `apps/api` finds no lockfile and the install fails outright, which
# is exactly how the first Node image was written and why this comment exists.
#
# Two stages because the runtime needs `node_modules` for Prisma: `tsup` bundles
# the application but deliberately leaves `@prisma/client` external, since its
# platform-specific engines and WASM query compiler resolve from disk rather
# than inlining.

# --- build -------------------------------------------------------------------
FROM node:22-slim AS build

# `openssl` is required by Prisma's engine detection; without it `generate`
# picks the wrong binary target and the runtime cannot open a connection.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /repo

RUN corepack enable

# Workspace manifests first, so a source-only change reuses the install layer.
# `pnpm-workspace.yaml` is required for the filter below to resolve.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc* ./
COPY apps/api/package.json apps/api/

# Only this package's dependency graph is installed. Without the filter the
# image pulls every app in the monorepo, including four Next.js builds.
RUN pnpm install --frozen-lockfile --ignore-scripts --filter @876/api...

WORKDIR /repo/apps/api

COPY apps/api/prisma ./prisma
COPY apps/api/scripts ./scripts
COPY apps/api/prisma.config.ts apps/api/tsconfig.json apps/api/tsup.config.ts ./
COPY apps/api/src ./src

# `build` runs `prebuild`, which generates the Prisma client — the generated
# directory is gitignored, so it is absent here exactly as it is in a fresh
# clone. `scripts/prisma-generate.mjs` supplies the placeholder `DATABASE_URL`
# that `prisma.config.ts` demands; nothing here opens a connection.
#
# Generation happens after `src` is copied, because the client is generated
# *into* `src/db/generated/`.
RUN pnpm run build

# No prune step, deliberately. `pnpm prune --prod` re-links against the *whole*
# workspace manifest, so after a `--filter` install it empties this package's
# node_modules and the image starts with `ERR_MODULE_NOT_FOUND`. `pnpm deploy`
# is the tool built for this, but it also re-resolves the root manifest and
# fails on the workspace dependencies that the filtered context does not carry.
# Carrying the dev dependencies is the cost of a correct image.

# --- runtime -----------------------------------------------------------------
FROM node:22-slim AS runtime

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# The workspace layout is preserved exactly, not flattened into /app. pnpm
# symlinks each package's node_modules into a virtual store at the workspace
# root using **relative** paths — `express` here is
# `../../../node_modules/.pnpm/express@5.2.1/node_modules/express` — so moving
# `apps/api/node_modules` up to /app repoints every one of them at a directory
# that does not exist, and the process dies on its first import.
WORKDIR /repo/apps/api

ENV NODE_ENV=production
ENV PORT=4000

COPY --from=build /repo/node_modules /repo/node_modules
COPY --from=build /repo/apps/api/node_modules ./node_modules
COPY --from=build /repo/apps/api/dist ./dist
COPY --from=build /repo/apps/api/prisma ./prisma
COPY --from=build /repo/apps/api/package.json ./package.json

# Run unprivileged. Nothing here writes to the filesystem, so no directory
# needs to be chowned.
USER node

EXPOSE 4000

# Migrations are applied by CI, never from the container's boot path
# (`.claude/rules/express-api.md`): a container that migrates on start races
# every other replica and turns a rollout into a schema change. The service
# likewise runs no seeds at boot — those are `pnpm seed`, run deliberately.
CMD ["node", "dist/server.js"]
