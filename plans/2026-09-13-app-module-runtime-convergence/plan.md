# Implementation Plan: Application Module Runtime Convergence

- Run ID: `2026-09-13-app-module-runtime-convergence`
- Branch: `feature/app-module-runtime-convergence`
- Base: `main` @ `65d3f77500061fd3efeb40a175c13ae5fe9e0af6`
- Status: `IN_PROGRESS`

## Overview

Converge application modules, app permissions, feature flags, plan entitlements, organization module state, and request-scoped access into one platform contract. The immediate product targets are 876 Projects and 876 Commerce; the shared changes must preserve Billing, Invoice, Couriers, CRM, and existing commercial semantics.

## Objectives

1. Register Projects and Commerce in the canonical `@876/core/modules` registry.
2. Keep module identity separate from permission namespaces, navigation groups, and feature flags.
3. Materialize only modules with real commercial entitlement semantics into Core `application_modules`.
4. Make Projects' existing module vocabulary reuse canonical identity instead of owning a parallel taxonomy.
5. Establish Commerce's Shopify-class capability taxonomy before product implementation expands.
6. Extend shared request access context with effective module availability and declarative navigation requirements.
7. Bring Projects and Commerce onto the same request-scoped app-access model without duplicating platform authorization logic.
8. Keep Console plan/module administration driven by materialized commercial modules, not every code-declared capability.

## Architectural invariants

- Code owns stable first-party module identity: app, key, label, description.
- Core `application_modules` is the materialized commercial projection, not the source of product architecture.
- Product app datastores own organization module enable/disable state and preferences.
- Permissions answer whether the acting user may perform an action; modules answer whether the organization may use a capability.
- Feature flags are rollout/kill switches and may only subtract access.
- Experiments never authorize.
- A permission namespace or navigation group becomes a module only when the semantics are genuinely the same.
- A canonical module is not automatically commercially sellable.
- Billing and Invoice's existing commercial keys and transitional Billing `sales`/`documents` behavior remain intact.
- Commerce continues to use the shared financial plane for customers/catalog/orders/payments/subscriptions; Commerce owns storefront/cart/checkout-session presentation state only.

## Product module decisions

### 876 Projects

Canonical modules:

- `projects`
- `issues`
- `reports`

Permission-only/navigation domains remain `dashboard`, `comments`, `labels`, `members`, and `settings`.

Initial commercial projection: `projects`, `issues`, `reports` where existing runtime/product behavior can honor them. Do not infer user permission from module entitlement.

### 876 Commerce

Canonical capability registry:

- `catalog`
- `orders`
- `customers`
- `inventory`
- `storefront`
- `checkout`
- `payments`
- `discounts`
- `shipping`
- `fulfillment`
- `returns`
- `markets`
- `marketing`
- `analytics`
- `pos`
- `b2b`
- `subscriptions`
- `channels`
- `automation`

Commerce currently has no implemented commerce domain persistence, so registry declaration must not silently create commercial plan grants. Commercial projection starts empty unless a capability already has a real runtime entitlement path during this run.

## Runtime contract

Target request-scoped access shape:

```ts
interface AccessContext {
  subject: { userId: string; accountType?: string | null }
  modules: readonly string[]
  permissions: readonly string[]
  features: readonly string[]
  experiments: Readonly<Record<string, string>>
}
```

Navigation requirements may declare `module`, `permission`, `feature`, and existing `anyPermission`. All declared requirements are ANDed except `anyPermission`, which succeeds when at least one named permission is held.

Navigation hiding remains UX only. Route and API authorization remain independent required enforcement layers.

## Scope

Primary expected files:

- `packages/core/src/modules.ts`
- `packages/core/src/modules.test.ts`
- `packages/core/src/access/context.ts`
- shared navigation/access resolver and tests under `packages/core/src/access/`
- `packages/core/src/access/catalogs.ts` and focused Projects/Commerce tests
- `apps/api/src/seeds/plans.ts` and seed tests
- `apps/projects/src/lib/modules/catalog.ts`
- Projects access/navigation files and tests
- Commerce access/navigation files and tests
- Console module behavior only if current implementation requires adjustment after registry registration
- architecture docs/rules only where the existing contract needs clarification

## Phases

- [x] Phase 0 — read binding rules, inspect current module/access ownership, create branch.
- [ ] Phase 1 — add canonical Projects and Commerce registries plus registry tests.
- [ ] Phase 2 — align Projects/Commerce permission catalogs with canonical identity without forcing 1:1 module-permission equivalence.
- [ ] Phase 3 — generalize commercial-module seeding and materialize Projects only where runtime semantics exist; keep Commerce commercial projection intentionally empty.
- [ ] Phase 4 — extend shared `AccessContext` and navigation requirement primitives with effective modules plus tests.
- [ ] Phase 5 — migrate Projects module catalog/access/navigation to canonical modules and shared runtime semantics.
- [ ] Phase 6 — bring Commerce app-access resolution/navigation onto the shared permission/module model without building commerce domain features.
- [ ] Phase 7 — review Console registry/materialization behavior and add safeguards/tests only if needed.
- [ ] Phase 8 — adversarial diff review for duplicate catalogs, authorization widening, commercial over-materialization, compatibility residue, and swallowed errors.
- [ ] Phase 9 — write final GPT-Web report, update tracker/handoff, and record verification commands as not executed.

## Verification commands for orchestrator

GPT Web cannot execute these. The orchestrator should run, at minimum:

```bash
pnpm --filter @876/core typecheck
pnpm --filter @876/core test
pnpm --filter @876/api typecheck
pnpm --filter @876/api lint
pnpm --filter @876/api boundaries
pnpm --filter @876/api test -- src/seeds
pnpm --filter @876/projects typecheck
pnpm --filter @876/projects lint
pnpm --filter @876/projects test
pnpm --filter @876/commerce-app typecheck
pnpm --filter @876/commerce-app lint
pnpm --filter @876/commerce-app test
node scripts/check-app-structure.mjs
```

Run focused Prettier over touched paths before final integration.

## Reports

| Tool | Report | Status |
| --- | --- | --- |
| GPT Web | `reports/gpt-web/2026-09-13-app-module-runtime-convergence.md` | Pending |

## Handoff state

The branch is cut from the current `main`. Current verified premise: Billing and Invoice are the only canonical module registries; Projects has a local module catalog plus a rich permission catalog; Commerce has app entitlement/bootstrap but only settings permissions and no commerce-domain persistence. Implementation should continue from Phase 1 without re-deriving those facts.

## PR preparation

No PR is opened by this run. Final report must list commits, changed files, test-case counts added, known gaps, and exact local verification commands.