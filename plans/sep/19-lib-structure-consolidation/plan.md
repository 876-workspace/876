# Implementation Plan: `src/lib/` Structure & Duplication Consolidation

- **Run ID:** `19-lib-structure-consolidation`
- **Branch:** `refactor/lib-structure-consolidation`
- **Status:** IN_PROGRESS
- **Started:** 2026-09-19

## Overview

`src/lib/` in every Next.js app is an undifferentiated pile of loose `.ts` files
outside the declared `app-structure.md` spine. The disorder is not cosmetic: it
is the direct cause of measurable cross-app duplication, because nobody can scan
a flat directory before adding to it.

Two outcomes: consolidate the duplication the pile produced, and close the root
so it cannot regrow.

## Measured evidence (2026-09-19, `main` @ d636b102a)

| Symptom | Measurement |
| --- | --- |
| loose `src/lib/*.ts` | console 31 (16 src + 15 tests), projects 19, couriers 14, billing 11 |
| `features.ts` copies | **8** — 876, billing, console, couriers, crm, enterprise, invoice, projects |
| `formatMoney` implementations | **3**, two of them in the *same* console `lib/` dir with different signatures |
| `apps-directory.ts` copies | **3** — couriers, crm, projects, each with a drifted app list |
| `@/lib/service` vs `@/lib/services` importers | billing 90 vs 72, console 14 vs 307, widgets-api 13 vs 0 |
| files with `eslint-disable no-explicit-any` | **1** — the Billing facade |
| `any` occurrences in non-test source | **857** (billing-api 251, api 199, projects-api 149) |

The experiment block inside `features.ts` was diffed across apps and is
**byte-identical except the function name and the app-slug constant** — exactly
the `ai-code-quality.md` prohibition on "copied implementations with one changed
literal".

## Naming decision (user, 2026-09-19)

`service/` vs `services/` differed by one letter and meant opposite things. Both
are renamed for what they hold:

| Was | Is | Holds |
| --- | --- | --- |
| `src/lib/services/` | **`src/lib/clients/`** | configured clients for *other* bounded 876 services — they reach outward |
| `src/lib/service/` | **`src/lib/records/`** | this app's *own* rows; the only code permitted to touch `prisma` |

```ts
import { platform } from '@/lib/clients/platform'
import { records } from '@/lib/records'
```

Rejected: `datastore/` (mechanical), `domain/` (21 existing bindings),
`repository/` (23), `data/` (shadows the universal `{ data, error }` envelope).

## No compatibility, ever (user, 2026-09-19)

> *"if something is being deprecated, it must be removed and all references
> updated. no backwards compatibility"* — the platform is pre-launch.

No aliases, no dual paths, no re-exports of an old name. A renamed path must not
resolve afterwards.

## Work units

| Unit | Scope | Delegate | Status |
| --- | --- | --- | --- |
| E | closed-set rule + `check-app-structure.mjs` check 8 + ratchet | orchestrator | [x] done, gate verified |
| R1 | `src/lib/services/` → `src/lib/clients/` — all 9 Next apps | Command Code | [ ] |
| R2 | `src/lib/service/` → `src/lib/records/` — console + widgets-api | opencode | [ ] |
| A | `features.ts` experiment block → `@876/core/platform` (8 apps) | opencode | [ ] half-applied, needs finishing |
| B | `formatMoney` → `@876/core/money` (console, billing, core) | Cline | [ ] |
| C | `apps-directory.ts` → one shared module (couriers, crm, projects) | Cline | [ ] |

R1 and R2 both touch console, so they run **sequentially**, R1 first.

## Separate tracks, not in this run

### Delete the Billing `any` facade

`apps/billing/src/lib/service/index.ts` is an `any`-typed HTTP facade introduced
by `a01a4a018` (PR #269, 2026-08-14) when Billing's Prisma datastore was
removed. It replaced a typed per-resource layer with one `LegacyBillingRecord`
index-signature type under a file-level `eslint-disable`. 90 files import it.

It must be **deleted**, not renamed. Blocking work, measured 2026-09-19: the
facade exposes 34 namespaces and `@876/billing` covers 23. These 11 have no
typed equivalent and must be built first — `addons`, `plans`, `prices`,
`priceLists`, `products`, `refunds`, `vendors`, `tenants`, `dashboard`,
`financeConnections`, `stats` — plus 6 calls against `/internal/projections/*`.

Billing therefore keeps `src/lib/service/` until that work lands. R1 still
renames Billing's `services/` → `clients/`, so `clients/` vs `service/` are not
confusable in the meantime.

### Ban `any`, then burn down 857

Lint rule at `error` plus a per-service ratchet, same mechanism as the `lib/`
gate. New `any` fails; the existing count can only fall. None of the sampled
occurrences in `billing-api`/`api` are `as any` casts — they are annotations,
which makes this tractable service by service.

### Billing notepad authorization gap

`apps/billing/src/lib/widgets-auth.ts` checks only for a signed session and
comments that "the feature gate is enforced by the shell". `access-control.md`:
"Hiding a link never replaces a guard." Console and Couriers both check the
notepad widget feature; Billing does not. Security-adjacent, so per `cli.md` it
is not delegated.

## Verification (foreground, always)

```
pnpm --filter @876/console typecheck && pnpm --filter @876/console test
pnpm --filter @876/billing-app typecheck && pnpm --filter @876/billing-app test
pnpm --filter @876/crm typecheck && pnpm --filter @876/projects typecheck
pnpm --filter @876/core test
node scripts/check-app-structure.mjs
pnpm check:rsc-boundaries
grep -rn "eslint-disable\|as any" <paths each delegate touched>
```
