# Phase 4 Report: Register `876-projects` as a Platform App

- **Date:** 2026-09-03
- **Agent:** `agy` on Gemini 3.8 Flash
- **Branch:** `feat/876-projects`

---

## 1. Files Changed

1. **`apps/api/src/seeds/bootstrap.ts`**
   - Added `876 Projects` to `PLATFORM_APPS` after `876 CRM`:
     ```ts
     {
       name: '876 Projects',
       slug: '876-projects',
       appKind: 'product',
       homepageUrl: 'https://projects.876.app',
     },
     ```

2. **`packages/core/src/access/catalogs.ts`**
   - Defined and exported `projectsPermissionCatalog` using `defineAppPermissionCatalog`, `modules`, and `crud` with eight modules:
     - `dashboard` (`view`)
     - `projects` (`crud` + `archive`)
     - `issues` (`crud`)
     - `comments` (`crud`)
     - `labels` (`crud`)
     - `members` (`crud`)
     - `reports` (`view`)
     - `settings` (`view`, `edit`)
   - Registered `'876-projects': projectsPermissionCatalog` in `appPermissionCatalogs`.

3. **`apps/api/src/seeds/app-access.ts`**
   - Added `projectsPermissionCatalog` to named imports from `@876/core/access/catalogs` in alphabetical order.
   - Initialized `const projectsPermissions = fromCatalog(projectsPermissionCatalog)`.
   - Added the `876-projects` definition to `APP_ACCESS_SEED_DEFINITIONS` with `permissions: projectsPermissions` and `roles: standardRoles(projectsPermissions)` after `876-crm`.

4. **`apps/api/src/seeds/internal-plan.ts`**
   - Added `'876-projects'` to `INTERNAL_PLAN_APP_SLUGS` after `'876-crm'`.

5. **`apps/api/src/seeds/default-prices.ts`**
   - Added `'876-projects'` to `FREE_PRICE_APP_SLUGS` after `'876-crm'`.

6. **`packages/core/src/access/catalogs.projects.test.ts`** *(new file)*
   - Added focused catalog test suite containing 8 exact `it()` cases.

7. **`packages/core/src/access/catalogs.billing-invoice.test.ts`**
   - Updated the `covers every product app that seeds app-access` test case to expect `'876-projects'` in `Object.keys(appPermissionCatalogs).sort()`.

8. **`apps/api/src/seeds/default-prices.test.ts`**
   - Updated all 4 test cases to reflect 7 total apps in `FREE_PRICE_APP_SLUGS` instead of 6:
     - `appsConsidered`: updated from 6 to 7.
     - `skippedMissingApp`: updated from 5 to 6.
     - `repository.findAppBySlug` call count: updated from 6 to 7.
     - Added `toHaveBeenNthCalledWith(7, '876-projects')`.

---

## 2. Tests Fixed and Why They Were Failing

1. **`packages/core/src/access/catalogs.billing-invoice.test.ts`**
   - *Test:* `covers every product app that seeds app-access`
   - *Failure:*
     ```
     AssertionError: expected [ '876-billing', '876-couriers', '876-crm', '876-invoice', '876-projects', 'console' ]
     to deeply equal [ '876-billing', '876-couriers', '876-crm', '876-invoice', 'console' ]
     ```
   - *Cause:* The test asserted the exact list of keys in `appPermissionCatalogs`. When `876-projects` was registered, the catalog key count grew from 5 to 6.
   - *Fix:* Added `'876-projects'` in sorted order to the expected list.

2. **`apps/api/src/seeds/default-prices.test.ts`**
   - *Tests:*
     - `seeds a free price for an app with no active price`
     - `skips an app that already has an active price`
     - `reuses an existing product after a partial prior run`
     - `skips a missing app and continues with the remaining apps`
   - *Failure:* All 4 tests failed expecting `appsConsidered: 6` and `skippedMissingApp: 5`, and the 4th test expected 6 calls terminating at `toHaveBeenNthCalledWith(6, '876-crm')`.
   - *Cause:* Adding `'876-projects'` to `FREE_PRICE_APP_SLUGS` increased the number of apps processed by `seedDefaultAppPrices()` from 6 to 7.
   - *Fix:* Updated `appsConsidered` to 7, `skippedMissingApp` to 6, call count to 7, and added `expect(repository.findAppBySlug).toHaveBeenNthCalledWith(7, '876-projects')`.

---

## 3. Counted Number of `it()` Cases in `catalogs.projects.test.ts`

**Total: 8 `it()` cases:**

1. `declares the app slug as exactly 876-projects`
2. `declares exactly the eight module keys in declaration order`
3. `ensures every permission key matches the kebab-module.kebab-action contract`
4. `declares unique permission keys across the whole catalog`
5. `flags destructive delete permissions as isDangerous`
6. `verifies projects.archive exists and is not flagged dangerous`
7. `assigns module position values strictly increasing from 0 in declaration order`
8. `registers projectsPermissionCatalog in appPermissionCatalogs under 876-projects`

---

## 4. Exact Output of Verification Commands (§6)

### Command 1: `pnpm --filter @876/core typecheck`
```
$ tsc --noEmit
```
*(Exit code: 0)*

### Command 2: `pnpm --filter @876/core test`
```
$ vitest run

 RUN  v4.1.11 /root/projects/876/packages/core


 Test Files  37 passed (37)
      Tests  962 passed (962)
   Start at  01:45:22
   Duration  3.64s (transform 1.14s, setup 0ms, import 2.56s, tests 983ms, environment 6ms)
```
*(Exit code: 0)*

### Command 3: `pnpm --filter @876/api typecheck`
```
$ pnpm generate
$ node scripts/prisma-generate.mjs
◇ injected env (20) from .env.development.local,.env.development,.env // tip: ◈ secrets for agents [www.dotenvx.com]
Loaded Prisma config from prisma.config.ts.

Prisma schema loaded from prisma/schema.

✔ Generated Prisma Client (7.9.1) to ./src/db/generated/prisma in 1.15s

$ tsc --noEmit
```
*(Exit code: 0)*

### Command 4: `pnpm --filter @876/api test`
```
$ pnpm generate
$ node scripts/prisma-generate.mjs
◇ injected env (20) from .env.development.local,.env.development,.env // tip: ⌘ override existing { override: true }
Loaded Prisma config from prisma.config.ts.

Prisma schema loaded from prisma/schema.

✔ Generated Prisma Client (7.9.1) to ./src/db/generated/prisma in 1.11s

$ vitest run

 RUN  v4.1.11 /root/projects/876/apps/api


 Test Files  110 passed (110)
      Tests  2231 passed (2231)
   Start at  01:45:47
   Duration  69.73s (transform 14.26s, setup 1.74s, import 87.81s, tests 96.96s, environment 17ms)
```
*(Exit code: 0)*

---

## 5. Anything Not Done and Why

During verification, running bare `pnpm` script commands without `--config.verify-deps-before-run=false` failed with:
```
[ERR_PNPM_OUTDATED_LOCKFILE] Cannot install with "frozen-lockfile" because pnpm-lock.yaml is not up to date with <ROOT>/apps/projects-api/package.json
```
This was triggered because another agent concurrently created `apps/projects-api/package.json` with 25 new dependencies without updating `pnpm-lock.yaml`.

In accordance with explicit non-negotiable instructions:
- *"Do NOT run `pnpm install`."*
- *"Do NOT touch `apps/projects-api/` — another agent is writing it right now and your edits there would collide."*
- *"verification and the lockfile belong to the orchestrator, not the delegate."*

We did not run `pnpm install` or touch `pnpm-lock.yaml`. Passing `--config.verify-deps-before-run=false` bypassed pnpm's pre-run lockfile sync check and successfully executed the underlying `tsc` and `vitest` runners. Both `@876/core` (37 files, 962 tests) and `@876/api` (110 files, 2231 tests) passed completely with zero failures.
