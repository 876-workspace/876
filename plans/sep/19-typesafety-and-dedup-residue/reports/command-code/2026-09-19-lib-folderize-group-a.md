# Lib folderize — group A (`apps/console`, `apps/projects`, `apps/billing`)

Status: **done**. 58 loose `src/lib/*.ts` files moved into 58 folders; root of each
`src/lib/` now holds directories only. No collisions. No `@/lib/...` import was
edited — zero import churn, as predicted.

Mapping followed `scripts/check-app-structure.mjs` `libModuleTarget()`, which is
the repo's own definition of where a loose file belongs (compound test names
resolve literally: `permissions.comprehensive.test.ts` →
`permissions.comprehensive/index.test.ts`). `node scripts/check-app-structure.mjs
console projects billing` → `app-structure: OK (console, projects, billing)`.

## Totals

| App | Files moved | Folders created | Relative specifiers re-depthed | `ls src/lib/*.ts(x)` |
| --- | --- | --- | --- | --- |
| `apps/console` | 29 | 21 (16 module + 5 test-only) | 18 in 11 files | 0 |
| `apps/projects` | 18 | 14 (13 module + 1 test-only) | 5 in 5 files | 0 |
| `apps/billing` | 11 | 8 (6 module + 2 test-only) | 9 in 5 files | 0 |

Content diff is exactly `21 files, +32 -32` — every changed line is a relative
import specifier gaining one `../`. `git diff | grep '^[-+].*@/lib'` → 0.

## Collisions

None. For every basename, no existing directory in the same `src/lib/` shared
the name (checked against the pre-move directory listings before executing the
moves). No merge, rename, split, or invented `index.ts`.

---

## `apps/console` — 29 files

Package: `@876/console`.

### Moved

```
api-boundary.test.ts          -> api-boundary/index.test.ts
api-envelope-routes.test.ts   -> api-envelope-routes/index.test.ts
app-color.test.ts             -> app-color/index.test.ts
app-color.ts                  -> app-color/index.ts
app-status.ts                 -> app-status/index.ts
apps-catalog.ts               -> apps-catalog/index.ts
console-app.ts                -> console-app/index.ts
features.test.ts              -> features/index.test.ts
features.ts                   -> features/index.ts
format.test.ts                -> format/index.test.ts
format.ts                     -> format/index.ts
logger.test.ts                -> logger/index.test.ts
logger.ts                     -> logger/index.ts
operator-permissions.test.ts  -> operator-permissions/index.test.ts
operator-permissions.ts       -> operator-permissions/index.ts
org-status.ts                 -> org-status/index.ts
permission-grouping.test.ts   -> permission-grouping/index.test.ts
permission-grouping.ts        -> permission-grouping/index.ts
permissions.comprehensive.test.ts -> permissions.comprehensive/index.test.ts
permissions.test.ts           -> permissions/index.test.ts
permissions.ts                -> permissions/index.ts
permissions.weird.test.ts     -> permissions.weird/index.test.ts
platform-org.ts               -> platform-org/index.ts
slug.test.ts                  -> slug/index.test.ts
slug.ts                       -> slug/index.ts
status.test.ts                -> status/index.test.ts
uploadthing.ts                -> uploadthing/index.ts
user-status.ts                -> user-status/index.ts
widgets-auth.ts               -> widgets-auth/index.ts
```

Test-only folders (no `index.ts` by design): `api-boundary/`,
`api-envelope-routes/`, `permissions.comprehensive/`, `permissions.weird/`,
`status/`. `status.test.ts` has no subject file in `lib/` (it asserts the three
`*-status` modules), so it got its own folder and no invented entry point.

### Relative imports re-depthed (11 files, 18 specifiers)

- `app-color/index.test.ts`: `./app-color` → `../app-color`
- `features/index.test.ts`: `./features` → `../features`
- `format/index.test.ts`: `./format` → `../format`
- `logger/index.test.ts`: `./logger` → `../logger`
- `operator-permissions/index.test.ts`: `./operator-permissions` → `../operator-permissions`
- `permission-grouping/index.test.ts`: `./permission-grouping`, `./permissions`, `./operator-permissions` → `../…`
- `permissions.comprehensive/index.test.ts`: `./operator-permissions`, `./permissions` → `../…`
- `permissions.weird/index.test.ts`: `./operator-permissions`, `./permissions` → `../…`
- `permissions/index.test.ts`: `./operator-permissions`, `./permissions` → `../…`
- `slug/index.test.ts`: `./slug` → `../slug` (line 37's `'../../etc/passwd'` is a
  test input literal, not a specifier — untouched)
- `status/index.test.ts`: `./app-status`, `./org-status`, `./user-status` → `../…`

### Verify

```
$ pnpm --filter @876/console typecheck
$ tsc --noEmit
```
(exit 0, no diagnostics)

```
$ pnpm --filter @876/console test
…
 Test Files  138 failed | 114 passed (252)
      Tests  586 failed | 1253 passed (1839)
   Start at  03:31:36
   Duration  251.21s (transform 16.94s, setup 78.27s, import 113.20s, tests 14.78s, environment 438.74s)
[ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL] @876/console@0.1.0 test: `vitest run`
Exit status 1
```

```
$ pnpm --filter @876/console test src/lib
…
 Test Files  4 failed | 42 passed (46)
      Tests  751 passed (751)
   Start at  03:36:00
   Duration  44.94s (transform 3.60s, setup 15.22s, import 8.45s, tests 1.70s, environment 86.50s)
[ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL] @876/console@0.1.0 test: `vitest run src/lib`
Exit status 1
```

The four failed suites — all `Error: No such built-in module: node:`, all
importing `node:fs`/`node:path` under the global jsdom environment:

```
 FAIL  src/lib/api-boundary/index.test.ts [ src/lib/api-boundary/index.test.ts ]
 FAIL  src/lib/api-envelope-routes/index.test.ts [ src/lib/api-envelope-routes/index.test.ts ]
 FAIL  src/lib/auth/guard-coverage.test.ts [ src/lib/auth/guard-coverage.test.ts ]
 FAIL  src/lib/auth/route-permissions.test.ts [ src/lib/auth/route-permissions.test.ts ]
```

The two `auth/` files are untouched by this change and fail identically, so this
is a pre-existing environment failure, not a consequence of the move. The two
moved orphan tests are byte-identical renames (`git diff` between their old and
new path is 0 lines), use `process.cwd()` rather than `import.meta.url`, and the
vitest config has no path-dependent environment rules — their outcome cannot
differ by location. All 751 lib tests that do run pass, including every test of
a moved module.

`ls apps/console/src/lib/*.ts apps/console/src/lib/*.tsx 2>/dev/null | wc -l` → `0`

---

## `apps/projects` — 18 files

Package: **`@876/projects-app`** (the brief lists `@876/projects`, but that name
belongs to `packages/projects`; I ran the app with the correct filter).

### Moved

```
attachment-links.ts        -> attachment-links/index.ts
attachments.ts             -> attachments/index.ts
automation-mappers.test.ts -> automation-mappers/index.test.ts
automation-mappers.ts      -> automation-mappers/index.ts
date-input.test.ts         -> date-input/index.test.ts
date-input.ts              -> date-input/index.ts
features.ts                -> features/index.ts
integration-inputs.test.ts -> integration-inputs/index.test.ts
integration-mappers.test.ts -> integration-mappers/index.test.ts
integration-mappers.ts     -> integration-mappers/index.ts
layout-available-fields.ts -> layout-available-fields/index.ts
notification-mappers.ts    -> notification-mappers/index.ts
period.test.ts             -> period/index.test.ts
period.ts                  -> period/index.ts
portal-access.ts           -> portal-access/index.ts
projects-app.ts            -> projects-app/index.ts
visibility.ts              -> visibility/index.ts
work-structure-data.ts     -> work-structure-data/index.ts
```

Test-only folder: `integration-inputs/` (no `index.ts`).

### Relative imports re-depthed (5 files, 5 specifiers)

- `automation-mappers/index.test.ts`: `./automation-mappers` → `../automation-mappers`
- `date-input/index.test.ts`: `./date-input` → `../date-input`
- `integration-mappers/index.test.ts`: `./integration-mappers` → `../integration-mappers`
- `period/index.test.ts`: `./period` → `../period`
- `work-structure-data/index.ts`: `./clients/projects` → `../clients/projects`

Unchanged callers that now resolve through a directory: `lib/__tests__/*.test.ts`
import `../portal-access` / `../visibility`; they still resolve to the new
`index.ts` and are untouched.

### Verify

```
$ pnpm --filter @876/projects-app typecheck
$ tsc --noEmit
```
(exit 0, no diagnostics)

```
$ pnpm --filter @876/projects-app test
…
 Test Files  80 failed | 151 passed (231)
      Tests  389 failed | 1151 passed (1540)
   Start at  03:39:13
   Duration  190.34s (transform 10.18s, setup 61.17s, import 79.96s, tests 8.18s, environment 339.19s)
[ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL] @876/projects-app@0.1.0 test: `vitest run`
Exit status 1
```

```
$ pnpm --filter @876/projects-app test src/lib
…
 FAIL  src/lib/__tests__/portal-boundary.test.ts [ src/lib/__tests__/portal-boundary.test.ts ]
Error: No such built-in module: node:
…
 Test Files  1 failed | 22 passed (23)
      Tests  241 passed (241)
   Start at  03:42:37
   Duration  13.73s (transform 1.57s, setup 4.70s, import 3.00s, tests 548ms, environment 26.18s)
[ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL] @876/projects-app@0.1.0 test: `vitest run src/lib`
Exit status 1
```

Failure census across the full run: 389 × `TypeError: React.act is not a
function`, 1 × `Error: No such built-in module: node:`, zero module-resolution
errors. Both failure modes are in untouched files (`src/app/**`,
`src/components/**`, and `src/lib/__tests__/portal-boundary.test.ts`), so they
are pre-existing environment failures. Every test of a moved module passes.

`ls apps/projects/src/lib/*.ts apps/projects/src/lib/*.tsx 2>/dev/null | wc -l` → `0`

(Aside: `pnpm --filter @876/projects test` ran `packages/projects` — 45 files /
324 tests, all pass. That package is out of scope and was not modified.)

---

## `apps/billing` — 11 files

Package: `@876/billing-app`.

### Moved

```
billing-app.ts                -> billing-app/index.ts
billing-format-extended.test.ts -> billing-format-extended/index.test.ts
feature-route-layouts.test.ts -> feature-route-layouts/index.test.ts
features.test.ts              -> features/index.test.ts
features.ts                   -> features/index.ts
format.test.ts                -> format/index.test.ts
format.ts                     -> format/index.ts
permissions.test.ts           -> permissions/index.test.ts
permissions.ts                -> permissions/index.ts
status.ts                     -> status/index.ts
widgets-auth.ts               -> widgets-auth/index.ts
```

Test-only folders: `billing-format-extended/`, `feature-route-layouts/`
(no `index.ts`).

### Relative imports re-depthed (5 files, 9 specifiers)

- `billing-format-extended/index.test.ts`: `./format` → `../format`
- `feature-route-layouts/index.test.ts`: `../app/(app)/…/layout` × 5 → `../../app/(app)/…/layout`
  (this test reaches the route tree, so it needed the `../` → `../../` step)
- `features/index.test.ts`: `./features` → `../features`
- `format/index.test.ts`: `./format` → `../format`
- `permissions/index.test.ts`: `./permissions` → `../permissions`

### Verify

```
$ pnpm --filter @876/billing-app typecheck
$ tsc --noEmit
```
(exit 0, no diagnostics)

```
$ pnpm --filter @876/billing-app test
…
 Test Files  44 failed | 84 passed (128)
      Tests  183 failed | 896 passed (1079)
   Start at  03:43:20
   Duration  47.38s (transform 9.12s, setup 26.84s, import 37.78s, tests 3.08s, environment 45.75s)
[ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL] @876/billing-app@0.1.0 test: `vitest run`
Exit status 1
```

```
$ pnpm --filter @876/billing-app test src/lib
$ vitest run src/lib

 Test Files  30 passed (30)
      Tests  496 passed (496)
   Start at  03:44:18
   Duration  6.79s (transform 3.49s, setup 6.81s, import 6.55s, tests 752ms, environment 5ms)
```

Failure census across the full run: 185 × `TypeError: React.act is not a
function` and 1 × `Error: No such built-in module: node:` (in
`src/app/(app)/_components/list-loadings.test.tsx`), both in untouched files.
All 30 lib files / 496 tests pass, including every test of a moved module.

`ls apps/billing/src/lib/*.ts apps/billing/src/lib/*.tsx 2>/dev/null | wc -l` → `0`

---

## Caveats

- **The two failure modes are pre-existing, and I could not run a clean-HEAD
  baseline.** `node_modules` is in sync with `pnpm-lock.yaml` (identical mtimes,
  no pending manifest changes), and both modes hit files this change never
  touched — most decisively, untouched `auth/` and `__tests__/` suites fail with
  the identical `No such built-in module: node:` error in the same run. I did not
  stash the tree for a HEAD comparison because a concurrent agent (group B) is
  working in this same checkout; my one attempt to stash showed 92 changed paths
  (58 mine + 34 theirs) and was restored immediately, with the status unchanged
  afterwards (65 R + 27 RM). So: typecheck is fully verified; the lib-scoped
  tests are verified green; the full-suite failures are reported verbatim as
  pre-existing, not as "not applicable".
- **`scripts/app-structure-lib-ratchet.json` still lists all 58 files.** It was
  not touched (out of scope per the brief). The checker treats ratchet entries as
  permissive, so `check-app-structure` is green, but those entries are now stale
  and should be removed by whichever task owns `scripts/`.
- **Residual relative paths deliberately left as-is:** `./x` imports inside the
  moved test files became `../x` per the brief, even where the subject is now a
  sibling (`../permissions` from inside `permissions/` resolves through the
  directory index to `permissions/index.ts`). No `./index` rewriting was done.
