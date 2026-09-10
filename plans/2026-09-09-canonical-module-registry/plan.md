# Implementation Plan: Canonical Application Module Registry

**Run ID:** `2026-09-09-canonical-module-registry`  
**Branch:** `feat/canonical-module-registry`  
**Base:** `feat/work-widget-phase-3`  
**Status:** IN_PROGRESS

## Overview

Remove duplicated Billing/Invoice module identity across settings catalogs, app-access permission catalogs, and Core commercial `application_modules` while preserving each plane's separate responsibility.

The target architecture is **one code-owned canonical module identity registry with concern-specific projections**:

- canonical registry owns durable module key, label, description, and application membership;
- Core `application_modules` materializes those identities for commercial entitlements;
- `plan_modules` remains operator-controlled plan composition;
- `@876/settings` remains the settings/preference projection and app-local module state remains app-owned;
- permission catalogs retain their own actions and durable permission keys while reusing canonical module identity where semantics match;
- feature flags remain rollout/kill switches and never create entitlement.

The immediate product defect is that 876 Invoice is a sellable product app and has an app-local finance module catalog, but its canonical commercial `application_modules` are not seeded, so Console plan creation can render an empty module picker.

## Architectural Scope

### Primary packages/apps

- `packages/core` — canonical registry and app-access identity reuse.
- `packages/settings` — projection helper only if required; no product catalog ownership.
- `packages/billing` — finance settings projection derived from canonical identity.
- `apps/api` — registry materialization into `application_modules`, Invoice initial grants, and plan/module validation preservation.
- `apps/console` — registry-managed first-party module UX if the API contract can expose the distinction without schema churn.

### Documentation

- `docs/architecture/016-canonical-application-module-registry.md`
- update ADR-006 only with a superseding/reference note if needed.
- update `.claude/rules/module-settings.md` and `.agents/rules/module-settings.md` byte-identically if the implementation changes the standing module-catalog ownership rule.

## Invariants

1. Define module identity once; reference it elsewhere.
2. Do not collapse entitlement, org module state, preferences, permissions, provisioning, and feature flags into one datastore or one god-manifest.
3. Module keys are durable kebab-case 876 contracts.
4. Permission keys are not renamed in this run.
5. Existing finance-role colon permissions remain untouched except safe metadata reuse.
6. Plans may only grant active modules belonging to the same product app.
7. Seeds remain explicit CLI operations; API startup must not run seeds.
8. Re-running registry materialization must not silently restore plan grants an operator intentionally removed.
9. Invoice is migrated first. Billing legacy aggregate commercial modules (`sales`, `documents`) are not destructively removed until their entitlement/feature dependencies are proven and explicitly migrated.
10. Product app settings/module state remains app-local per `module-settings.md`.
11. Work-widget Phase 3 files are treated as base work and must not be rewritten unless required for compatibility.

## Design Decisions

### D1 — Canonical owner

Use `@876/core` as the neutral code owner for first-party application module identity. `apps/api` may consume it without depending on `@876/billing`, and product/settings/access projections can consume the same registry.

### D2 — Registry contents

The registry contains only stable identity metadata:

```ts
type AppModuleDefinition = {
  key: string
  label: string
  description: string
}
```

Application membership is expressed by the app registry that contains the definition. Settings defaults/preferences, permission actions, feature flags, routes, pricing, and plan composition remain separate projections.

### D3 — Finance module set

Invoice canonical modules initially follow the existing shared finance settings vocabulary:

- `customers`
- `items`
- `invoices`
- `quotes`
- `payments`
- `expenses`
- `sales-receipts`
- `time-tracking`

`crm` is intentionally excluded from commercial materialization until the CRM-as-finance-module product contract is complete.

Billing reuses those identities and adds its current Billing-only settings identities:

- `subscriptions`
- `banking`
- `credit-notes`
- `purchases`
- `payroll`
- `price-lists`
- `discounts`

### D4 — Invoice default plan

Materialize all canonical Invoice modules, but seed only an explicit initial subset to `876-invoice-free`:

- `customers`
- `items`
- `invoices`
- `quotes`
- `payments`

The remaining Invoice modules become available to Console plan composition without being implicitly granted.

### D5 — Billing legacy safety

Do not rename or delete `sales` or `documents` in this run unless exhaustive repository inspection proves their feature and entitlement dependencies can be migrated safely. Prefer additive canonical Billing materialization and a documented follow-up mapping over a semantic one-to-many rename hidden inside this refactor.

### D6 — Console authority

Console remains authoritative for plan composition. Code owns first-party module identity. If the current API cannot expose registry-management metadata without a schema/API expansion, defer the Console read-only identity UX and protect identity drift first through seed synchronization plus tests/documentation.

## Dispatched Briefs

None. This run is being implemented directly through the GitHub connector.

## Execution Reports

- Final report: `./reports/gpt-web/2026-09-09-canonical-module-registry.md` (to be written at completion)

## Phase Checklist

### Phase 0 — Baseline and rules

- [x] Read `CLAUDE.md` on the base branch.
- [x] Read `.agents/rules/gpt-web-operating-rules.md`.
- [x] Read required reuse, naming, types, code-style, testing, error-handling, module-settings, access-control, API-backend, feature-flags, git, execution-autonomy, and tracker rules.
- [ ] Inventory exact current owners and tests on `feat/canonical-module-registry`.

### Phase 1 — Canonical registry

- [ ] Add reusable registry contract/helpers under `@876/core`.
- [ ] Add shared Finance identity definitions.
- [ ] Add Invoice and Billing app registries.
- [ ] Add registry invariants/tests.

### Phase 2 — Settings projection

- [ ] Refactor `packages/billing/src/settings-catalog.ts` to derive identity from the canonical registry.
- [ ] Preserve existing exported settings catalog contracts.
- [ ] Update anti-drift tests so labels/descriptions cannot diverge.

### Phase 3 — Access projection

- [ ] Reuse canonical identity metadata in Billing/Invoice app-access permission catalogs where module semantics match exactly.
- [ ] Leave system/permission-only groups explicit.
- [ ] Preserve all durable permission keys.
- [ ] Update access catalog tests.

### Phase 4 — Core commercial materialization

- [ ] Replace duplicated Billing-only module identity seed declarations with registry-driven application-module definitions where safe.
- [ ] Materialize Invoice commercial modules.
- [ ] Keep default plan composition as a separate key-based map.
- [ ] Preserve operator-removed plan grants on later seed runs.
- [ ] Add/update seed tests.

### Phase 5 — Invoice plan entitlement fix

- [ ] Ensure `876-invoice-free` can receive its explicit initial module grants.
- [ ] Ensure all Invoice modules are returned by Console's existing module-list path after seed materialization.
- [ ] Preserve product same-app active-module validation.

### Phase 6 — Registry ownership enforcement

- [ ] Determine whether first-party registry-managed identity can be safely enforced in the existing API/Console contract without schema churn.
- [ ] Implement safe enforcement if possible; otherwise document the deferred UI/API distinction and retain anti-drift protections.

### Phase 7 — Billing legacy audit

- [ ] Inventory `sales` and `documents` commercial-module consumers.
- [ ] Add canonical Billing identities without destructive legacy rewrites where safe.
- [ ] Document exact follow-up migration if one-to-many semantics prevent safe completion now.

### Phase 8 — Documentation and rule update

- [ ] Add ADR-016.
- [ ] Update ADR-006 with a short superseding/reference note if necessary.
- [ ] Update mirrored `module-settings.md` rule only if needed, byte-identically.

### Phase 9 — Final review and handoff

- [ ] Review changed code for duplicate registries, compatibility residue, swallowed errors, unsafe casts, and scope creep.
- [ ] Re-read branch state to anticipate integration changes from Work Phase 3.
- [ ] Write final GPT-web report with exact test counts and unverified items.
- [ ] Mark this plan COMPLETED or record any genuine external blocker.

## Verification Commands

Not executable from GPT Web; orchestrator must run after pulling the branch:

```bash
pnpm --filter @876/core typecheck
pnpm --filter @876/core test
pnpm --filter @876/billing typecheck
pnpm --filter @876/billing test
pnpm --filter @876/api typecheck
pnpm --filter @876/api lint
pnpm --filter @876/api boundaries
pnpm --filter @876/api test
pnpm --filter @876/api build
pnpm --filter @876/console typecheck
pnpm --filter @876/console test
node scripts/check-app-structure.mjs
```

After database access is available, run the explicit seed workflow against a disposable/staging database and verify:

- Invoice `application_modules` materialize once;
- `876-invoice-free` receives only the configured default module grants on first materialization;
- removing a plan grant in Console and rerunning seeds does not restore it;
- a new Invoice plan can select any active Invoice application module;
- cross-app module assignment remains rejected.

## Multi-Session Continuity / Handoff

The branch is intentionally based on `feat/work-widget-phase-3`, which the user expects to merge to `main` after local fixes. Before final integration, compare this branch against the then-current `main` and reconcile any Phase 3 changes, especially changes touching shared finance/module/access code. Do not assume the current base will be byte-identical to the eventual merged result.

## PR Preparation Summary

Not ready. Implementation is in progress. Tests/typecheck/build are not executed; verification is the orchestrator's.
