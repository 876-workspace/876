# Unit R1 — rename `src/lib/services/` to `src/lib/clients/` in every workspace

## Why

`src/lib/services/` holds **configured clients for other bounded 876 services**
(`platform`, `workspace`, `crm`, `billing`, `storage`, `couriers`, `widgets`,
`work`). They are clients, so they are called clients. The old name differed by
one letter from `src/lib/service/`, which means the opposite thing, and in
Billing alone that was 72 imports of one against 90 of the other.

This is a **pure path rename**. No identifier changes, no behaviour changes, no
compatibility alias. The old path must not resolve afterwards.

## Scope — exact, measured 2026-09-19

Rename the directory in each workspace that has one, and rewrite every import.

| Workspace | importing files |
| --- | --- |
| `apps/console` | 307 |
| `apps/projects` | 219 |
| `apps/couriers` | 105 |
| `apps/invoice` | 102 |
| `apps/billing` | 72 |
| `apps/crm` | 53 |
| `apps/enterprise` | 28 |
| `apps/commerce` | 4 |
| `apps/876` | 2 |
| `apps/billing-api` | 1 |
| `apps/couriers-api` | 1 |
| **total** | **894 files, 979 import lines** |

## The only pattern present

Every import in the repo is this one form — verified, there are **zero** bare
`from '@/lib/services'` imports:

```
from '@/lib/services/<module>'
```

So the rewrite is:

```
'@/lib/services/   →   '@/lib/clients/
```

Anchor on the trailing slash. `@/lib/service/` (singular) is a **different
directory that must not change** — replacing the longer string `@/lib/services/`
cannot match it, which is why the trailing slash is mandatory in your pattern.

## Steps

1. For each of the 11 workspaces above:
   `git mv apps/<app>/src/lib/services apps/<app>/src/lib/clients`
2. Rewrite every `'@/lib/services/` to `'@/lib/clients/` across `apps/*/src`.
3. Check for non-alias references that the alias rewrite misses — relative
   imports such as `from '../services/platform'` or `from './services/crm'`, and
   any `services/` path inside `vitest.config.ts`, `tsconfig.json`,
   `next.config.ts`, or a test mock (`vi.mock('@/lib/services/...')`). Grep for
   `lib/services` and `/services/` across each app and fix what you find.
4. Do **not** rename any exported symbol. The modules still export `platform`,
   `workspace`, `crm`, `billing`, etc.

## Hard prohibitions

- Do **not** touch `src/lib/service/` (singular) in any app. A different task
  owns it.
- Do **not** create an alias, re-export, `index.ts` shim, or tsconfig path that
  keeps `@/lib/services` resolving. It must break.
- Do **not** change behaviour, signatures, return values, or types.
- Do **not** add `eslint-disable`, `@ts-ignore`, `@ts-expect-error`, `as any`, or
  `as unknown as`.
- Do **not** edit `plans/`, `.claude/rules/`, `.agents/rules/`, `docs/`, or
  `scripts/` — the orchestrator already updated those.
- Do **not** `git commit`, branch, or open a PR.

## Verify before you report

One command at a time. The host has ~3 GB free and parallel runs get OOM-killed.

```
pnpm --filter @876/console typecheck
pnpm --filter @876/projects typecheck
pnpm --filter @876/couriers-app typecheck
pnpm --filter @876/invoice-app typecheck
pnpm --filter @876/billing-app typecheck
pnpm --filter @876/crm typecheck
pnpm --filter @876/enterprise typecheck
```

Then paste these greps into your report:

```
grep -rn "@/lib/services" apps | grep -v node_modules | wc -l   # expect 0
grep -rln "lib/services" apps | grep -v node_modules            # expect no output
grep -rn "@/lib/service'" apps/billing/src | wc -l              # expect 90, UNCHANGED
ls apps/console/src/lib/clients | head -3                        # expect the client modules
```

The third one is the safety check: Billing's singular `service/` must be
untouched at exactly 90 importers.

## Report

Write `plans/sep/19-lib-structure-consolidation/reports/command-code/2026-09-19-unit-r1.md`:
files changed per workspace; the four grep results verbatim; every typecheck
result; anything found in step 3 beyond the alias imports; anything you could
not verify. A truthful "not verified" beats a confident claim.
