# Codex brief: 876 Commerce base setup (app + service skeleton + SDK shell)

**Repo:** `/root/projects/876`, a **shared checkout**. Another Codex run is
editing `apps/billing`, `apps/billing-api`, `packages/billing*` and
`plans/2026-09-13-billing-commercial-engine-expansion/` at the same time.
**Model:** `gpt-5.6-terra`, medium effort

## Why

ADR `docs/architecture/025-finance-and-commerce-product-lineup.md` and rule
`.claude/rules/product-lineup.md` add **876 Commerce**: a merchant's own online
store. This run creates only the base the future storefront/cart/checkout work
builds on. **No commerce features.**

Read first: those two files, then `.claude/rules/new-app-guide.md` (your
checklist), `app-structure.md`, `app-layout.md`, `product-org-signup.md`,
`express-api.md`, `api-backend.md`, `sdk-conventions.md`, `access-control.md`,
`platform-services.md`, `env-configuration.md`, `naming.md`, `testing.md`,
`ai-code-quality.md`.

## Reference implementation: copy it, do not invent

**876 Projects** is the newest app/service/SDK trio. Mirror it file for file,
renaming `projects` → `commerce`:

- `apps/projects` (Next.js org-workspace app: auth bridge, callback, guards,
  shell, onboarding, no-access, unavailable, `vercel.json`, `next.config.ts`
  using `sharedTranspilePackages`)
- `apps/projects-api` (Express 5 service)
- `packages/projects` (bounded SDK)

Where Projects and CRM differ on org sign-up/onboarding, follow
`product-org-signup.md`.

## Deliverables

### 1. `apps/commerce`: `@876/commerce-app`, port **3009**

- Embedded enterprise-realm auth: `api/auth/[...path]`, `callback` (same realm
  header), `login`, `register`/onboarding for org-less accounts, `no-access`,
  `unavailable`. The session-cookie re-export follows new-app-guide §3d.
- Guards in `src/lib/auth/guards.ts`: session plus the `876-commerce`
  entitlement. Admins of an org without the entitlement go to get-started, not
  `/no-access`.
- Shell (`components/shell/`) with the app name **876 Commerce** and one nav
  entry, **Home**.
- `(app)/page.tsx` Home: the standard page container with a `876-page-title`
  heading "Home" and a short empty state ("Your store is not set up yet.").
  No fake metrics or placeholder features.
- `src/lib/commerce-app.ts` identity constants, `.env.example` with every
  variable read (optional ones marked), `vercel.json`, `next.config.ts`
  (`reactCompiler: true`).
- **Do not** add `proxy.ts`/`middleware.ts`, server actions, a `db/` directory,
  or a `service/` layer.
- Tests: guard behaviour (signed out, no org, admin without entitlement,
  member without entitlement, entitled), plus the nav registry → route
  permission binding. **≥ 8 `it()` cases.**

### 2. `apps/commerce-api`: `@876/commerce-api`

- Copy the Projects API assembly (`src/server.ts`, `src/application.ts`/app
  assembly, `http/` middleware, config, errors, OpenAPI, pino,
  `.dependency-cruiser.cjs`, `vitest.config.ts`, `tsconfig`, `vercel.json`,
  `.env.example`).
- Routes: **`GET /health` and `GET /ready` only.** Ready must not claim a
  database it does not have.
- **No Prisma and no database yet.** Do not add `prisma/`, `db/`, a
  `DATABASE_URL`, or migrations. Note that in the README: persistence arrives
  with the first real model. Remove the Prisma pieces the Projects copy would
  bring rather than leaving them empty. If a shared script
  (`scripts/check-database-env.mjs`, `dev:*` scripts) assumes every API has a
  database, **do not** list commerce-api there.
- Scripts: `dev`, `build`, `typecheck`, `lint`, `boundaries`, `test`, with a
  dev port that doesn't collide (check the other `*-api` configs, e.g. 4010).
- Supertest tests: health and ready envelopes, unknown path 404, request id
  propagation. **≥ 5 `it()` cases.**

### 3. `packages/commerce`: `@876/commerce`

- Mirror `packages/projects`' runtime/client factory/request/error shaping and
  its authority entrypoints (`session`, `service`, `operator`), exporting only
  what exists.
- **No resource namespaces yet**, and no health resource unless Projects' SDK
  exposes one for the same purpose. Add tests for the client factory and error
  shaping. **≥ 4 `it()` cases.**

### 4. Platform registration

- `apps/api/src/seeds/bootstrap.ts`: add
  `{ name: '876 Commerce', slug: '876-commerce', appKind: 'product', homepageUrl: 'https://commerce.876.app' }`.
- `packages/core/src/access/catalogs.ts`: add a `commercePermissionCatalog`
  (`app: '876-commerce'`) with **only** `{ key: 'settings', label: 'Settings', actions: ['view', 'edit'] }`
  (the Home page needs no permission). Register it wherever `'876-crm'` /
  `'876-projects'` catalogs are registered, and add a catalog test mirroring
  `catalogs.projects.test.ts`.
- `apps/api/src/seeds/app-access.ts`: add `876-commerce` with
  `standardRoles(...)`, exactly like Projects.
- `default-prices.ts` / `internal-plan.ts`: add `876-commerce` wherever
  `876-projects` is listed. Update any tests that assert those lists.
- Provisioning profile/policy (`packages/core/src/types/provisioning-policy.ts`,
  ADR 021): add Commerce only if Projects has an entry. It has **no** finance
  dependency yet.

### 5. Workspace wiring and docs

- Root `package.json`: `dev:commerce` (api + commerce-api + commerce-app) and
  `dev:commerce:api`, following `dev:projects`. Do not edit other `dev:*`
  scripts.
- `pnpm install` to link the workspace packages. The lockfile change is
  expected. Nothing else in it should change.
- `.claude/rules/new-app-guide.md` §2 port table **and**
  `.agents/rules/new-app-guide.md`, kept byte-identical: add Commerce 3009, and
  make "next app" 3010. Verify with `cmp`.
- `CLAUDE.md` "Current Architecture" table: add `@876/commerce-app` and
  `@876/commerce-api` rows. **Only** those rows. The line already referencing
  `product-lineup.md` must stay intact.
- `README.md` in each new package/app: a few lines each.

## Verification (run all, foreground; report pass/fail with counts)

```bash
pnpm install
pnpm --filter @876/commerce typecheck && pnpm --filter @876/commerce test
pnpm --filter @876/commerce-api typecheck && pnpm --filter @876/commerce-api lint && pnpm --filter @876/commerce-api boundaries && pnpm --filter @876/commerce-api test && pnpm --filter @876/commerce-api build
pnpm --filter @876/commerce-app typecheck && pnpm --filter @876/commerce-app lint && pnpm --filter @876/commerce-app test
pnpm --filter @876/core typecheck && pnpm --filter @876/core test
pnpm --filter @876/api typecheck && pnpm --filter @876/api test -- src/seeds
node scripts/check-app-structure.mjs
pnpm check:transpile
```

## Hard rules

- **Shared tree:** never run `git checkout`, `git stash`, `git reset`,
  `git clean`, `git commit` or `git push`. Do not touch `apps/billing*`,
  `packages/billing*`, `apps/invoice`, or `plans/2026-09-13-billing-*`.
- No `eslint-disable`, `@ts-ignore`, `@ts-expect-error` or `as any`.
- No commerce domain features, tables, placeholder pages, or speculative SDK
  resources.
- Do not deploy, create Vercel projects, set secrets, or run seeds against a
  database (dev and prod share one).
- Write no run logs. Format only the files you touch.

## Report

Write `plans/2026-09-13-finance-product-split/reports/codex/2026-09-13-commerce-base-setup.md`
with:

- the model used;
- every file added or changed;
- decisions not settled here;
- counted `it()` cases per package;
- full verification results;
- manual follow-ups the orchestrator or user must do (Vercel projects, env vars,
  WorkOS callback, `CORS_ALLOWED_ORIGINS`, API key issuance, running seeds);
- anything not done.
