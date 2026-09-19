# Unit R2 — rename `src/lib/service/` to `src/lib/records/` in Console and Widgets API

## Why

`src/lib/service/` is this app's **own** Prisma-backed data layer — the only
code permitted to touch `prisma`. It is being renamed `records/` because the old
name differed by one letter from `src/lib/services/`, which held clients for
*other* 876 services and has already been renamed to `src/lib/clients/`.

```ts
import { platform } from '@/lib/clients/platform'   // reaches outward
import { records } from '@/lib/records'             // ours
```

Pure rename. No behaviour change, no compatibility alias. The old path must not
resolve afterwards.

## Scope — two apps only

| From | To |
| --- | --- |
| `apps/console/src/lib/service/` | `apps/console/src/lib/records/` |
| `apps/widgets-api/src/lib/service/` | `apps/widgets-api/src/lib/records/` |
| exported const `service` in each `index.ts` | `records` |
| `from '@/lib/service'` | `from '@/lib/records'` |
| `from '@/lib/service/<x>'` | `from '@/lib/records/<x>'` |
| identifier `service.` at those call sites | `records.` |

Counts: console 12 files import `{ service }` from `'@/lib/service'` and 2 from
`'@/lib/service/<x>'`; widgets-api 7 and 6.

## Two traps

1. **`@/lib/clients` must not be touched.** By the time you run, the plural
   directory is already named `clients/`, so there is no homograph left — but do
   not edit any `@/lib/clients` import.
2. **`apps/billing/src/lib/service/` must not be touched.** Billing's singular
   `service/` is an `any`-typed facade scheduled for deletion, not renaming, and
   a different task owns it. Editing any file under `apps/billing/` rejects this
   work.

## Steps

1. `git mv apps/console/src/lib/service apps/console/src/lib/records`
2. `git mv apps/widgets-api/src/lib/service apps/widgets-api/src/lib/records`
3. In each moved `index.ts`, rename `export const service = {` to
   `export const records = {`. Relative imports inside each directory are
   unaffected.
4. Rewrite the importing files: the path always, the identifier where
   `{ service }` was imported.
5. Check for references the alias rewrite misses: relative imports
   (`from '../service'`), `vi.mock('@/lib/service')` in tests, and any
   `lib/service` string in `vitest.config.ts` / `tsconfig.json`.
6. If any file already binds a name `records`, stop and report it rather than
   guessing. (Seven `const records` bindings exist repo-wide; a *local* one
   inside a function that also calls the module is the case to watch for.)

## Hard prohibitions

- Do not touch `apps/billing/`.
- Do not touch `@/lib/clients` imports.
- Do not create an alias, re-export, or tsconfig path keeping `@/lib/service`
  resolving. It must break.
- Do not add `eslint-disable`, `@ts-ignore`, `@ts-expect-error`, `as any`, or
  `as unknown as`.
- Do not edit `plans/`, `.claude/rules/`, `.agents/rules/`, `docs/`, `scripts/`.
- Do not `git commit`, branch, or open a PR.

## Verify before you report

One at a time; the host has ~3 GB free.

```
pnpm --filter @876/console typecheck
pnpm --filter @876/console lint
pnpm --filter @876/console test
pnpm --filter @876/widgets-api typecheck
pnpm --filter @876/widgets-api test
node scripts/check-app-structure.mjs
```

Paste these greps into the report:

```
grep -rn "@/lib/service'" apps/console/src apps/widgets-api/src | wc -l  # 0
grep -rn "@/lib/service/" apps/console/src apps/widgets-api/src | wc -l  # 0
git status --short -- apps/billing | wc -l                               # 0
```

## Report

`plans/sep/19-lib-structure-consolidation/reports/opencode/2026-09-19-unit-r2.md`
— files per app, the three greps, verification output, anything unverified.
