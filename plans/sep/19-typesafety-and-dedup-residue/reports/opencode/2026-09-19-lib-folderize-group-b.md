# lib folderize — Group B report (2026-09-19, opencode)

Scope: `apps/couriers` (12 files), `apps/876` (6), `apps/invoice` (6),
`apps/enterprise` (5), `apps/crm` (4), `apps/commerce` (1).
Total moved: **34 files → 34 `index.*` files in 31 new folders**
(3 orphan-test folders hold only an `index.test.ts`, by design).

No commit, no branch, no PR — working tree only (`git mv` staged renames).

## Per app

### apps/couriers — 12 files → 9 folders (incl. 1 orphan)
| Before | After |
|---|---|
| `api-envelope-routes.test.ts` | `api-envelope-routes/index.test.ts` (orphan, no `index.ts`) |
| `app-name.ts` | `app-name/index.ts` |
| `couriers-app.ts` | `couriers-app/index.ts` |
| `couriers.ts` | `couriers/index.ts` |
| `features.ts` | `features/index.ts` |
| `features.test.ts` | `features/index.test.ts` |
| `onboarding.ts` | `onboarding/index.ts` |
| `reserved-slugs.ts` | `reserved-slugs/index.ts` |
| `reserved-slugs.test.ts` | `reserved-slugs/index.test.ts` |
| `shipping-address.ts` | `shipping-address/index.ts` |
| `shipping-address.test.ts` | `shipping-address/index.test.ts` |
| `widgets-auth.ts` | `widgets-auth/index.ts` |

Relative imports re-depthed (mechanical `./x` → `../x`):
- `features/index.test.ts`: `from './features'` → `from '../features'`
  (resolves via folder index: `lib/features` → `features/index.ts`)
- `reserved-slugs/index.test.ts`: `from './reserved-slugs'` → `from '../reserved-slugs'`,
  **plus** `new URL('../app', import.meta.url)` → `new URL('../../app', import.meta.url)`
  (this one actually breaks at runtime if missed — the route-tree scan must still reach `src/app`)
- `shipping-address/index.test.ts`: `from './shipping-address'` → `from '../shipping-address'`

### apps/876 — 6 files → 6 folders (incl. 1 orphan)
`api-envelope-routes.test.ts` → `api-envelope-routes/index.test.ts` (orphan);
`consumer-app.ts` → `consumer-app/index.ts`; `features.ts` → `features/index.ts`;
`logger.ts` → `logger/index.ts`; `metadata.ts` → `metadata/index.ts`;
`utils.ts` → `utils/index.ts`.
**No relative imports in any moved file — nothing to re-depth.**

### apps/invoice — 6 files → 5 folders
`features.ts` → `features/index.ts`; `features.test.ts` → `features/index.test.ts`
(`./features` → `../features`); `format.ts` → `format/index.ts`;
`invoice-app.ts` → `invoice-app/index.ts`; `invoice.ts` → `invoice/index.ts`;
`status.ts` → `status/index.ts`. No other relative imports.

### apps/enterprise — 5 files → 4 folders (incl. 1 orphan)
`api-envelope-routes.test.ts` → `api-envelope-routes/index.test.ts` (orphan);
`enterprise-app.ts` → `enterprise-app/index.ts`; `features.ts` → `features/index.ts`;
`reserved-slugs.ts` → `reserved-slugs/index.ts`;
`reserved-slugs.test.ts` → `reserved-slugs/index.test.ts`
(`./reserved-slugs` → `../reserved-slugs`).
Note: this app's reserved-slugs test locates the route tree via
`resolve(process.cwd(), 'src/app')` — depth-independent, untouched.

### apps/crm — 4 files → 3 folders
`crm-api.ts` → `crm-api/index.ts`; `crm-app.ts` → `crm-app/index.ts`;
`features.ts` → `features/index.ts`; `features.test.ts` → `features/index.test.ts`
(`./features` → `../features`). No other relative imports.

### apps/commerce — 1 file → 1 folder
`commerce-app.ts` → `commerce-app/index.ts`. No relative imports.

## Collisions
**None.** Every target basename was checked against existing `lib/` directories
before moving (e.g. `crm-api`/`crm-app` vs existing `crm/`, `invoice` vs `api/`,
`modules/` etc.) — no folder with the same name existed anywhere in scope,
so no stop-and-report was triggered.

## Import-path edits
Zero `@/lib/...` imports touched anywhere. All cross-file consumers use
non-deep `@/lib/<basename>` specifiers, which resolve identically to
`<basename>/index.ts` — verified by the passing typechecks below.

## Final loose-file counts
```
apps/couriers loose: 0
apps/876 loose: 0
apps/invoice loose: 0
apps/enterprise loose: 0
apps/crm loose: 0
apps/commerce loose: 0
```
(`ls <app>/src/lib/*.ts <app>/src/lib/*.tsx | wc -l` → 0 for each app.)

## Verification results (verbatim tails)

All typechecks pass (`$ tsc --noEmit`, clean output).

- `@876/couriers-app` typecheck: PASS (`$ tsc --noEmit`)
- `@876/couriers-app` test: **1 file / 2 tests FAILED, 147 files / 1275 tests passed**
  ```
  ❯ src/lib/api-envelope-routes/index.test.ts (57 tests | 2 failed)
      × src/app/api/manage/items/[id]/route.ts uses a canonical response helper
      × src/app/api/manage/items/route.ts uses a canonical response helper
   Test Files  1 failed | 147 passed (148)
        Tests  2 failed | 1275 passed (1277)
  ```
  Pre-existing, not caused by this move: the two failing assertions scan
  `src/app/api/manage/items/**/route.ts` (untouched files, committed in
  `9ac1601bc`, clean in `git status`), which use route-local helpers
  `itemResultResponse` / `invalidItemRequest` from `./_lib/access` that do not
  match the test's `CANONICAL_HELPERS` regex
  (`apiError|apiJson|apiSuccess|errorResponse|invalidRequest|resultResponse`).
  The moved test reads the route tree via `resolve(process.cwd(), 'src/app/api')`,
  which is depth-independent — relocating the test cannot change its outcome.
  Every moved lib test in this app (features, reserved-slugs, shipping-address)
  passes.
- `@876/app` (apps/876) typecheck: PASS; test: `Test Files 5 passed (5) / Tests 30 passed (30)`
- `@876/invoice-app` typecheck: PASS; test: `Test Files 96 passed (96) / Tests 618 passed (618)`
- `@876/enterprise` typecheck: PASS; test: `Test Files 18 passed (18) / Tests 358 passed (358)`
- `@876/crm-app` typecheck: PASS; test: `Test Files 42 passed (42) / Tests 305 passed (305)`
- `@876/commerce-app` typecheck: PASS; test: `Test Files 5 passed (5) / Tests 25 passed (25)`

Two process notes (both handled, no scope impact):
1. Parallel `git mv` batches collided on `.git/index.lock` (sibling agents
   working on other apps in the same repo). Retried the remaining moves as one
   sequential command — all succeeded. No files outside the 6 in-scope apps
   were touched.
2. The brief's package-name table lists `@876/crm` for `apps/crm`, but that
   name belongs to `packages/crm` (out of scope) — a first `pnpm --filter
   @876/crm test` run exercised the wrong workspace (22 files / 247 tests in
   `packages/crm`, untouched by this task). `apps/crm` is `@876/crm-app`;
   re-ran with the correct filter (42 files / 305 tests, all pass).
