# Couriers shipment notification emails — task report

- Status: done. All 24 new tests pass; typecheck, lint, and boundaries pass.
  `pnpm test` exits 1 only because of one pre-existing failure that is
  identical before and after this change (see counts below).
- Branch: `feature/transactional-email-platform` (unchanged, no commit, no PR).

## Test counts (literal)

- Before: `Test Files 1 failed | 28 passed (29)` /
  `Tests 1 failed | 356 passed (357)`
- After: `Test Files 1 failed | 29 passed (30)` /
  `Tests 1 failed | 380 passed (381)`
- Delta: +24 tests (all in the new
  `packages.notifications.test.ts`), +24 passed, +0 new failures.
- The single failure in both runs is the same pre-existing test:
  `src/modules/tenants/__tests__/tenants.test.ts > the published OpenAPI
  document > matches the snapshot (no undocumented route drift)`
  (OpenAPI snapshot drift about a `tenantId` path parameter on
  `me-warehouses-update`; unrelated to this change, left untouched per scope).

## Verification output (final state, run one at a time)

```text
$ pnpm --filter @876/couriers-api typecheck
$ tsc --noEmit
EXIT:0
```

```text
$ pnpm --filter @876/couriers-api lint
$ eslint src
EXIT:0
```

```text
$ pnpm --filter @876/couriers-api boundaries
$ depcruise src --config .dependency-cruiser.cjs

✔ no dependency violations found (395 modules, 1162 dependencies cruised)

EXIT:0
```

```text
$ pnpm --filter @876/couriers-api test
$ vitest run
 FAIL  src/modules/tenants/__tests__/tenants.test.ts > the published OpenAPI document > matches the snapshot (no undocumented route drift)
  Snapshots  1 failed
 Test Files  1 failed | 29 passed (30)
      Tests  1 failed | 380 passed (381)
[ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL] @876/couriers-api@0.1.0 test: `vitest run`
Exit status 1
EXIT:1
```

## Files changed (one line each)

- `apps/couriers-api/src/lib/services/communications.ts` (new) — lazy
  `@876/communications/service` client reading config, the only file that
  knows Communications exists.
- `apps/couriers-api/src/config/index.ts` — adds `COMMUNICATIONS_API_URL` /
  `COMMUNICATIONS_INTERNAL_KEY` (default empty so boot never crashes).
- `apps/couriers-api/.env.example` — documents both variables as required
  for notifications (neither marked optional).
- `apps/couriers-api/src/modules/packages/packages.notifications.ts`
  (new) — category mapping, idempotency key, flat variable map, and the
  never-throwing `notifyPackageStatusChanged` orchestrator (one
  `deliveries.create` per notification).
- `apps/couriers-api/src/modules/packages/packages.service.ts` —
  `updatePackage` awaits the notifier after the write succeeds.
- `apps/couriers-api/src/platform/idempotency.ts` (new) — sha256 digest
  helper (see "could not reuse" below).
- `apps/communications-api/prisma/migrations/20260915220000_transactional_email_foundation/migration.sql`
  (scope exception) — three system templates: `shipment-received`,
  `shipment-ready`, `shipment-delivered`; currency-neutral, placeholder-only,
  short factual copy.
- `apps/couriers-api/src/modules/packages/__tests__/packages.notifications.test.ts`
  (new) — 24 `it()` cases covering all 14 required items plus ARRIVED,
  sender fallback/absence, render/resolve/list/registry failures, tenant- and
  profile-missing skips, and fallback variable shaping.
- `apps/couriers-api/package.json` — adds `@876/communications: workspace:*`.
- `pnpm-lock.yaml` — 3-line tool-generated importer entry for the above
  (see below).

## What you should know

- Lockfile: the brief forbids editing it, but also mandates the typed
  `@876/communications/service` entrypoint, which is unresolvable without
  the workspace link (couriers-api did not depend on it). I added the
  `package.json` dependency and ran `pnpm install --no-frozen-lockfile`;
  the resulting lockfile delta versus immediately before the install is
  exactly 3 lines (the couriers-api importer entry, no version changes).
  I did not hand-edit the lockfile.
- `idempotencyHash`: no equivalent exists in couriers and no shared helper
  exists in `@876/core` (verified by grep); importing Billing's hasher
  across the service boundary is not permitted, so Couriers owns a minimal
  sha256 digest in `src/platform/idempotency.ts`. Key shape is
  `couriers-<category>:<hex>`, stable per (tenant, package, category), so
  `RECEIVED → IN_TRANSIT → RECEIVED` reuses one key (asserted literally).
- Seed caveat: the templates were appended to the already-numbered
  foundation migration per the brief; they apply on a fresh migrate. If the
  Communications database in any environment already applied that
  migration, the branch owner needs a follow-up migration at merge time.
- Test 12 (missing config) drives the real communications client via
  `vi.importActual` so the genuine `communications/not-configured` closed
  failure is exercised; all other tests use the mocked client boundary.
- Production code contains no `as any`, `@ts-ignore`, `@ts-expect-error`,
  or `eslint-disable`. The test file uses `as string` /
  `as Record<string, unknown>` only on untyped mock values.
- Not done: fixing the pre-existing tenants OpenAPI snapshot failure
  (out of scope; reported, not touched).
