# Implementation Plan: Product Navigation Registries

- **Run ID:** `2026-09-02-product-navigation-registries`
- **Branch:** `feature/product-navigation-registries` (cut from `origin/main` @ `d655a060`)
- **Status:** IN_PROGRESS

## Overview

Two things, both prerequisites for rendering real Billing/Invoice product UI inside
Console's operator workspace:

1. **Billing is the last app with a hand-rolled navigation resolver.** It keeps its
   own `getVisibleNav`, and its registry stores `icon: IconComponent` — a React
   component in a structure that crosses the RSC boundary, which
   `.claude/rules/access-control.md` prohibits outright. Invoice, CRM and Console
   already declare navigation with `defineNavigation` and resolve it with
   `resolveNavigation` from `@876/core/access`. Billing joins them.

2. **Console's workspace registry has drifted from its routes.** `APP_WORKSPACES`
   declares `billing/items`, `invoice/items` and `crm/forms`; none of the three has
   a route directory, so all three nav links 404. Add the missing routes and a
   binding test so a declared section that has no route is a test failure rather
   than a dead link.

## Architectural scope

| Area                                                    | Change                                                              |
| ------------------------------------------------------- | ------------------------------------------------------------------- |
| `apps/billing/src/components/shell/nav-config.ts`       | Rewritten as a `defineNavigation` registry; `getVisibleNav` deleted |
| `apps/billing/src/components/shell/sidebar.tsx`         | Consumes `NavGroupDefinition[]`, resolves string icon keys locally  |
| `apps/billing/src/components/shell/nav-dropdown.tsx`    | Takes a `NavEntry`                                                  |
| `apps/billing/src/app/(app)/layout.tsx`                 | Builds an `AccessContext`, calls `resolveBillingNavigation`         |
| `apps/billing/src/lib/features.ts`                      | Exposes `featureKeys: string[]` alongside the existing booleans     |
| `apps/console/src/app/(app)/orgs/[slug]/workspace/**`   | Three missing placeholder routes                                    |
| `apps/console/src/features/orgs/app-workspaces.test.ts` | New section↔route binding test                                      |

Out of scope for this run, deliberately: `@876/billing-ui`, the operator permission
projection, and wiring real data into the Console workspace pages. A shared UI
package with no extracted screen in it is ceremony, and an operator permission
projection has nothing to gate until a real product screen renders in Console.
Both belong to the next run.

## Key design decisions

**Billing keeps its colon-style permission keys.** Billing's runtime permissions
come from `billing-api`'s own `Member`/`Role` rows (`billing:access`,
`customers:read`, …), resolved in `apps/billing/src/lib/auth/billing-context.ts`.
The canonical `billingPermissionCatalog` in `@876/core/access` uses dot-style keys
(`customers.view`) because Billing has not yet moved onto the platform app-access
plane — `apps/billing/src/types/permission-values.ts` says so in a comment. A
permission key is a durable persisted identifier (`.claude/rules/naming.md`), so
this run does **not** rename them. This is a registry _shape_ change, not a
permission migration.

**Feature requirements become canonical kebab slugs.** The registry stops going
through Billing's local `ProductFeatures` booleans and requires the canonical slug
(`billing-sales-quotes`) directly, matching `feature-flags.md`. The parent/child
AND that `getFeatures` currently computes in TypeScript is preserved _structurally_
instead: the `Sales` parent requires `billing-sales`, so when the master is off the
parent fails its own requirement and `resolveNavigation` drops it and every child
with it. The booleans stay for the rest of the app; only navigation stops using them.

**Parent-href re-pointing is preserved explicitly.** `getVisibleNav` re-points a
parent's href to its first _visible_ child when the parent's declared href matches
a _declared_ child's href — that is why `Sales` (declared `/quotes`) lands on
`/invoices` when quotes are off, while `Subscriptions` (declared `/subscriptions`,
no child at that path) keeps its own href. `resolveNavigation` does not do this, so
Billing keeps it as a named post-pass over the resolved tree.

**Console's workspace sections stay a hand-declared subset.** An operator view is
legitimately narrower than the product's own sidebar, so `APP_WORKSPACES` remains
the declaration. What was missing is not derivation but a _binding test_: the
registry and the route tree must agree.

## Dispatched briefs

| Phase | Tool                                                 | Brief                                                                                                                                                    |
| ----- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 + 2 | Codex `gpt-5.6-terra`, `model_reasoning_effort=high` | [briefs/codex/2026-09-02-billing-nav-registry-and-console-route-binding.md](./briefs/codex/2026-09-02-billing-nav-registry-and-console-route-binding.md) |

## Execution reports

| Phase | Tool  | Report    |
| ----- | ----- | --------- |
| 1 + 2 | codex | _pending_ |

## Checklist

- [ ] Phase 1 — Billing navigation registry on `defineNavigation`
- [ ] Phase 1 — `getVisibleNav` deleted, no remaining callers
- [ ] Phase 1 — `nav-config.test.ts` rewritten against `resolveBillingNavigation`
- [ ] Phase 2 — `billing/items`, `invoice/items`, `crm/forms` routes added
- [ ] Phase 2 — section↔route binding test added and passing
- [ ] Verification green (below)
- [ ] Committed per `.claude/rules/git.md` granularity

## Verification commands

```bash
pnpm --filter @876/billing-app typecheck
pnpm --filter @876/billing-app lint
pnpm --filter @876/billing-app test
pnpm --filter @876/console typecheck
pnpm --filter @876/console lint
pnpm --filter @876/console test
node scripts/check-app-structure.mjs
pnpm check:transpile
grep -rn "eslint-disable\|as any" <touched paths>   # must return nothing
```

All verification runs in the FOREGROUND (`.claude/rules/cli.md`).

## Handoff state

Nothing merged yet. Branch cut from `origin/main` at `d655a060`; working tree was
clean at cut.
