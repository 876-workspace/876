# Implementation Plan: Finance Requests Surface

- Run ID: `2026-09-13-finance-requests-surface`
- Branch: `feat/finance-requests-surface`
- Base: `main` @ `65d3f77500061fd3efeb40a175c13ae5fe9e0af6`
- Status: `IN_PROGRESS`

## Overview

Promote CRM Requests from a customer-only finance-app capability into a first-class surface in 876 Billing and 876 Invoice. Requests remains CRM-owned, while each finance app receives its own commercial module projection and app-scoped feature rollout. The same underlying CRM request records must be reachable from the global Requests workspace and from the existing customer record context.

## Objectives

1. Add an organization-wide `/requests` workspace to Billing and Invoice.
2. Reuse the richer Console request queue presentation through `@876/crm-ui` instead of copying it.
3. Reuse Console's pathname-derived contextual sidebar mechanism without changing Billing's existing Sales/Subscriptions/Purchases dropdown semantics.
4. Add canonical `requests` module identity to both finance module registries and materialize it commercially for both apps.
5. Add `billing-requests` and `invoice-requests` rollout flags, globally enabled at introduction and ANDed with plan entitlement + permission.
6. Include Requests on every Billing/Invoice plan that exists when the new application module is first created, without re-granting it on later seed runs.
7. Gate the primary Requests nav, contextual nav, customer Requests tab, and direct request routes consistently.
8. Keep core Request CRUD independent of 876 Work; Work-backed tasks/reminders/events degrade independently when Work capability is absent.

## Architectural scope

### Core/platform

- `packages/core/src/modules.ts` and tests: shared canonical Requests identity projected into Billing/Invoice registries and commercial module sets.
- `apps/api/src/seeds/features.ts` and tests: app-scoped rollout flags.
- `apps/api/src/seeds/plans.ts`, `plans.repository.ts`, and tests: feature-bound application modules plus first-materialization grants to currently existing app plans.

### Shared UI

- `packages/ui`: generic contextual-sidebar resolution mechanics shared across Console, Billing, and Invoice. Context activation is explicit; `NavEntry.children` alone does not imply sidebar replacement.
- `packages/crm-ui`: request queue/list presentation and pure request-row mapping shared by Console, Billing, and Invoice. No auth, routing authority, or data fetching belongs here.

### Hosts

- `apps/console`: consume the shared contextual-sidebar resolver and shared request queue without changing current Requests/Projects behavior.
- `apps/billing`: feature resolution, route guards, customer-tab gating, Requests context, organization-wide queue/detail/create routes.
- `apps/invoice`: feature resolution, route guards, customer-tab gating, Requests context, organization-wide queue/detail/create routes.

## Binding decisions

1. **CRM owns Requests.** No Billing/Invoice request tables or duplicate business implementation.
2. **Requests is not a Work-service entitlement.** Core request list/detail/create remains available without Work. Work-backed Tasks/Reminders/Schedule capabilities are separately conditional.
3. **Module and feature are different controls.** Effective availability is `feature rollout AND plan-module entitlement AND permission`.
4. **New Requests flags start globally enabled.** Plan-module entitlement is the commercial gate; a globally disabled seed would make current-plan grants ineffective.
5. **Current-plan inclusion is one-time.** Existing plans are attached as `initialGrants` only when the Requests application module is first materialized. Later seed runs must preserve an operator's deliberate grant removal.
6. **Contextual sidebar is explicit.** Billing already uses `children` for dropdown navigation, so the shared primitive may not reinterpret all nested navigation as drill-down contexts.
7. **Two route contexts are intentional.** `/requests/[requestId]` keeps the Requests workspace active; `/customers/[customerId]/requests/[requestId]` keeps the customer detail context active. Both render the same CRM record components.
8. **Follow established feature-route semantics.** Billing feature denial follows its existing `requireBillingFeature` behavior; permission denial follows the existing permission guard. Do not invent a 404 policy for disabled modules.
9. **Missing CRM workspace is an empty state.** Reads do not eagerly provision CRM merely because the plan gains Requests. Creation may use the existing lazy workspace path.
10. **Status filtering remains service-side.** `/requests?status=...` passes the validated status to CRM `requests.list`; no client-side filtering of an organization-wide paginated queue.
11. **Global detail reuses host adapters.** Record mutations, Tasks, and Activity use the same app-level clients/API routes as customer-scoped Requests; route-local duplicates are removed.
12. **Record close target is independent from tab base.** Shared request record UI accepts an explicit close target so global records close to `/requests` while customer-scoped records close to the customer's Requests list.

## Phases

- [x] P0 — Cut branch from current `main`; read `CLAUDE.md`, GPT-Web rules, and relevant architecture/rule files.
- [x] P1 — Record corrected plan and invariants.
- [x] P2 — Add canonical Requests module identity, commercial projections, rollout flags, and first-materialization current-plan grants with tests.
- [x] P3 — Add Billing/Invoice feature resolution and feature-aware route guards; gate existing customer Requests tabs/routes.
- [x] P4 — Extract generic contextual-sidebar mechanics and refactor Console onto them without changing behavior.
- [x] P5 — Declare Billing/Invoice Requests sidebar contexts while preserving existing dropdown navigation.
- [x] P6 — Promote the rich request queue presentation and pure row mapping into `@876/crm-ui`; migrate Console to the shared list.
- [ ] P7 — Complete Billing Requests workspace.
  - [x] `/requests` organization queue with validated, service-side status filtering.
  - [x] `/requests/[requestId]` global record context.
  - [x] `/requests/[requestId]/tasks` and `/activity` reuse shared Billing CRM host adapters.
  - [x] Reuse shared request record UI and separate close target from tab base.
  - [ ] `/requests/new` with explicit customer selection and reuse of the existing customer create endpoint/composer.
  - [ ] `/requests/customers` contextual index.
  - [ ] `/requests/forms` contextual index.
  - [ ] Enforce `billing-requests` on request mutation API routes, not just pages/navigation.
- [ ] P8 — Complete Invoice Requests workspace.
  - [x] `/requests` organization queue with validated, service-side status filtering.
  - [x] `/requests/[requestId]` global record context.
  - [x] `/requests/[requestId]/tasks` and `/activity` reuse shared Invoice CRM host adapters.
  - [x] Reuse shared request record UI and separate close target from tab base.
  - [ ] `/requests/new` with explicit customer selection and reuse of the existing customer create endpoint/composer.
  - [ ] `/requests/customers` contextual index.
  - [ ] `/requests/forms` contextual index.
  - [ ] Enforce `invoice-requests` on request mutation API routes, not just pages/navigation.
- [ ] P9 — Work-off degradation and mobile navigation parity.
  - [x] Core Requests list/detail/create remains independent from Work entitlements.
  - [ ] Gate/hide Work-backed request subresources when Work capability is unavailable instead of coupling core Requests to Work.
  - [ ] Apply the Requests contextual navigation behavior to the current mobile navigation path without changing unrelated app navigation.
- [ ] P10 — Add/finish tests and review the complete branch diff for duplicated behavior, stale compatibility code, navigation regressions, access-control drift, invalid imports, and swallowed errors.
- [ ] P11 — Write GPT-Web final report, complete handoff/verification notes, and mark plan complete.

## Current implementation state

The branch is currently 70 commits ahead of the base commit. Implemented code includes:

- canonical `FINANCE_MODULES.requests` identity and Billing/Invoice registry/commercial projections;
- first-materialization Requests grants for plans already present when the module is created;
- `billing-requests` and `invoice-requests` feature seed/catalog support;
- Billing/Invoice feature resolution, customer-tab gating, and customer request-route feature guards;
- shared `@876/ui/sidebar-context` resolver with explicit `sectionKeys` so Billing Sales/Subscriptions/Purchases remain dropdowns;
- Console migration to the shared context resolver;
- Requests navigation/context in Billing and Invoice;
- shared rich `@876/crm-ui/request-list`, request status definitions, and request-list row mapping;
- Console migration to the shared queue;
- Billing and Invoice organization-wide Requests queues;
- Billing and Invoice global request record/task/activity routes;
- shared request-record close-target support;
- relocation of Billing/Invoice CRM record/task/activity client adapters to app-level feature directories so both route contexts reuse them.

No shell verification has been run by GPT-Web, and no passing test/typecheck/lint claim is made.

## Verification commands for the local orchestrator

GPT-Web has no shell/test runner. These commands are required after the branch is pulled locally; results must not be claimed here until executed by the orchestrator.

```bash
pnpm --filter @876/core test
pnpm --filter @876/core typecheck
pnpm --filter @876/api typecheck
pnpm --filter @876/api lint
pnpm --filter @876/api boundaries
pnpm --filter @876/api test
pnpm --filter @876/ui typecheck
pnpm --filter @876/ui test
pnpm --filter @876/crm-ui typecheck
pnpm --filter @876/crm-ui test
pnpm --filter @876/console typecheck
pnpm --filter @876/console lint
pnpm --filter @876/console test
pnpm --filter @876/billing-app typecheck
pnpm --filter @876/billing-app lint
pnpm --filter @876/billing-app test
pnpm --filter @876/invoice-app typecheck
pnpm --filter @876/invoice-app lint
pnpm --filter @876/invoice-app test
node scripts/check-app-structure.mjs
pnpm check:transpile
```

Also run the repository's configured formatting checks over only the changed files and the required AI/code-review gates from the local orchestrator.

## Dispatched briefs

None. This run is being implemented directly through GPT-Web's GitHub connector.

## Execution reports

- Pending: `reports/gpt-web/2026-09-13-finance-requests-surface.md`

## Handoff state

Implementation is active. Resume at the unchecked P7/P8 creation and contextual index items, then P9 mobile/Work degradation, API feature enforcement, tests, full branch review, and the final report. Do not re-derive Requests-vs-Work ownership, explicit contextual-sidebar activation, or one-time plan-grant semantics; those decisions are fixed above.

## PR preparation summary

Pending completion. No PR is authorized or planned from GPT-Web.