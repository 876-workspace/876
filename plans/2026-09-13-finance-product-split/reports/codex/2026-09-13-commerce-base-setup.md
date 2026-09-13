# Commerce base setup

Model: `gpt-5.6-terra` (medium effort).

## Delivered

- Added `@876/commerce-app` at port 3009 with enterprise-realm auth bridge and
  callback, signed-session and organization-entitlement routing, onboarding,
  no-access/unavailable states, and a one-item Commerce shell.
- Added `@876/commerce-api` at port 4010. It has only `GET /health` and
  `GET /ready`; readiness deliberately reports no database dependency.
- Added `@876/commerce`, with empty resource surface and session/service/operator
  authority factories.
- Registered `876-commerce` in platform bootstrap, app access, default-price,
  internal-plan, and permission catalogs. Commerce has only `settings.view` and
  `settings.edit` permissions.

## Files added or changed

Added:

- `apps/commerce-api/.dependency-cruiser.cjs`
- `apps/commerce-api/.env.example`
- `apps/commerce-api/README.md`
- `apps/commerce-api/eslint.config.mjs`
- `apps/commerce-api/package.json`
- `apps/commerce-api/src/application.test.ts`
- `apps/commerce-api/src/application.ts`
- `apps/commerce-api/src/config/index.ts`
- `apps/commerce-api/src/http/error-handler.ts`
- `apps/commerce-api/src/http/middleware/request-context.ts`
- `apps/commerce-api/src/index.ts`
- `apps/commerce-api/src/platform/logger.ts`
- `apps/commerce-api/src/server.ts`
- `apps/commerce-api/tsconfig.json`
- `apps/commerce-api/tsup.config.ts`
- `apps/commerce-api/vercel.json`
- `apps/commerce-api/vitest.config.ts`
- `apps/commerce/.env.example`
- `apps/commerce/README.md`
- `apps/commerce/eslint.config.mjs`
- `apps/commerce/next-env.d.ts`
- `apps/commerce/next.config.ts`
- `apps/commerce/package.json`
- `apps/commerce/postcss.config.mjs`
- `apps/commerce/src/app/(app)/layout.tsx`
- `apps/commerce/src/app/(app)/page.tsx`
- `apps/commerce/src/app/api/auth/[...path]/route.ts`
- `apps/commerce/src/app/callback/route.ts`
- `apps/commerce/src/app/globals.css`
- `apps/commerce/src/app/layout.tsx`
- `apps/commerce/src/app/login/page.tsx`
- `apps/commerce/src/app/no-access/page.tsx`
- `apps/commerce/src/app/onboarding/page.tsx`
- `apps/commerce/src/app/register/page.tsx`
- `apps/commerce/src/app/unavailable/page.tsx`
- `apps/commerce/src/components/shell/nav-config.test.ts`
- `apps/commerce/src/components/shell/nav-config.ts`
- `apps/commerce/src/components/shell/shell.tsx`
- `apps/commerce/src/lib/auth/context.ts`
- `apps/commerce/src/lib/auth/guards.test.ts`
- `apps/commerce/src/lib/auth/guards.ts`
- `apps/commerce/src/lib/auth/session-cookie.ts`
- `apps/commerce/src/lib/auth/session.ts`
- `apps/commerce/src/lib/commerce-app.ts`
- `apps/commerce/src/lib/services/platform.ts`
- `apps/commerce/src/test/server-only.ts`
- `apps/commerce/tsconfig.json`
- `apps/commerce/vercel.json`
- `apps/commerce/vitest.config.ts`
- `packages/commerce/README.md`
- `packages/commerce/eslint.config.mjs`
- `packages/commerce/package.json`
- `packages/commerce/src/client.test.ts`
- `packages/commerce/src/client.ts`
- `packages/commerce/src/index.ts`
- `packages/commerce/src/operator.ts`
- `packages/commerce/src/request.ts`
- `packages/commerce/src/runtime.ts`
- `packages/commerce/src/service.ts`
- `packages/commerce/src/session.ts`
- `packages/commerce/src/test/server-only.ts`
- `packages/commerce/src/types.ts`
- `packages/commerce/tsconfig.json`
- `packages/commerce/vitest.config.ts`
- `packages/core/src/access/catalogs.commerce.test.ts`
- `plans/2026-09-13-finance-product-split/reports/codex/2026-09-13-commerce-base-setup.md`

Changed:

- `.agents/rules/new-app-guide.md`
- `.claude/rules/new-app-guide.md`
- `CLAUDE.md`
- `apps/api/src/seeds/app-access.ts`
- `apps/api/src/seeds/bootstrap.ts`
- `apps/api/src/seeds/default-prices.test.ts`
- `apps/api/src/seeds/default-prices.ts`
- `apps/api/src/seeds/internal-plan.ts`
- `package.json`
- `packages/core/src/access/catalogs.billing-invoice.test.ts`
- `packages/core/src/access/catalogs.ts`
- `pnpm-lock.yaml`

## Test counts

- `@876/commerce`: 4 `it()` cases.
- `@876/commerce-api`: 5 `it()` cases.
- `@876/commerce-app`: 8 `it()` cases (five guard cases and three navigation cases).
- `@876/core`: 4 Commerce catalog cases; package total 1,104 tests.
- `@876/api` seed suite: 2,304 tests.

## Verification

| Command | Result |
| --- | --- |
| `pnpm install` | Pass — already up to date. |
| `pnpm --filter @876/commerce typecheck && pnpm --filter @876/commerce test` | Pass — 4 tests. |
| Commerce API typecheck, lint, boundaries, test, build | Pass — 5 tests; boundaries cruised 16 modules with no violations. ESLint emitted the inherited Next pages-directory warning but exited 0. |
| Commerce app typecheck, lint, test | Pass — 8 tests. |
| `pnpm --filter @876/core typecheck && pnpm --filter @876/core test` | Pass — 1,104 tests. |
| `pnpm --filter @876/api typecheck && pnpm --filter @876/api test -- src/seeds` | Pass — 2,304 tests. |
| `node scripts/check-app-structure.mjs` | Pass. The script's static default list does not yet include Commerce. |
| `pnpm check:transpile` | Failed on an existing unrelated Couriers issue: `apps/couriers` lacks the required `@source` for `@876/billing-ui` in `globals.css`. Shared UI transpile itself passed. |
| `cmp .claude/rules/new-app-guide.md .agents/rules/new-app-guide.md` | Pass. |

## Decisions and follow-ups

- Commerce owns no persistence yet. Storefronts, domains, themes, collections,
  carts, checkout sessions, and the financial-plane handoff remain future design
  work; no Commerce financial dependency was added.
- No OpenAPI endpoint was exposed because this base is explicitly limited to
  `/health` and `/ready`; add its contract route with the first real API
  capability.
- Create Commerce app and service Vercel projects, set their deployment env
  variables, and issue the `876-commerce` platform API key.
- Register `https://commerce.876.app/callback` with WorkOS and add
  `https://commerce.876.app` to `CORS_ALLOWED_ORIGINS`.
- Set `SESSION_COOKIE_SECRET` byte-identically to `apps/api`; set `API_URL`,
  `COMMERCE_API_876_KEY`, and Commerce API `PORT`/`ENVIRONMENT`/`LOG_LEVEL`.
- After deployment, run the platform seeds deliberately (not against the shared
  development/production database by this run) and provision the app API key.
- Resolve the unrelated Couriers Tailwind source violation before relying on
  repository-wide `check:transpile` as green.
