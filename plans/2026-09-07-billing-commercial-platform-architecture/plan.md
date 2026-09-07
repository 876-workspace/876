# Implementation Plan: Billing Commercial Platform Architecture

**Run ID:** `2026-09-07-billing-commercial-platform-architecture`  
**Branch:** `feature/billing-commercial-platform-architecture`  
**Base:** `main` at `90c986688ddd4add71fd665592b15722029ebc42`  
**Status:** `IN_PROGRESS`

## Overview

Refactor 876 Billing into a deeper financial + commercial platform architecture while preserving all current Billing and Invoice product behavior and deliberately **not** implementing speculative commerce features.

The target is a modular commercial data plane where existing Quote/Invoice workflows and future Order/POS/Restaurant/Store workflows can consume the same Catalog, Pricing, Inventory, Tax, Customer, Payment, Ledger, calculation, idempotency, event, and media primitives.

Invoices become one workflow over shared commercial domains rather than the architectural center of stock, catalog, and pricing behavior.

## Explicit non-goals

Do not create persisted resources, routes, SDK namespaces, or UI for:

- orders or carts;
- warehouses or stock locations;
- inventory items/levels/reservations/transfers;
- purchase orders or new supplier workflows;
- fulfillment or shipments;
- sales channels;
- restaurant menus, kitchen tickets/stations, tables/seats;
- modifiers, bundles, or combos;
- marketplace listings/offers;
- returns as a new commerce domain.

Future ownership may be documented only.

## Binding invariants

1. 876 Billing is the canonical financial + commercial data plane.
2. Canonical Items/Variants never belong to Invoice, Store, Restaurant, POS, or Marketplace apps.
3. Future apps may own projections such as menus/listings but reference Billing sellables by opaque IDs.
4. Catalog owns sellable identity; Pricing owns unit-price resolution; Inventory owns stock/availability; Documents own document lifecycle and snapshots.
5. Repositories never coordinate another bounded domain directly.
6. Cross-module access goes through the owning module public API.
7. Financial/inventory side effects use append/reverse/compensate semantics rather than destructive historical edits.
8. Existing public v1 API and `@876/billing` contracts remain compatible unless a coordinated migration is explicitly required.
9. Storage owns bytes/object identity; Billing stores opaque `fileId` references and owns Item/Variant media relationships.
10. No speculative commerce tables or empty future module implementations.

## Rules read / required

- [x] root `CLAUDE.md`
- [x] `.agents/rules/gpt-web-operating-rules.md`
- [x] `.agents/rules/implementation-tracker.md`
- [x] `.agents/rules/execution-autonomy.md`
- [x] `.agents/rules/ai-code-quality.md`
- [ ] `.agents/rules/naming.md`
- [ ] `.agents/rules/types.md`
- [ ] `.agents/rules/code-style.md`
- [ ] `.agents/rules/testing.md`
- [ ] `.agents/rules/error-handling.md`
- [ ] `.agents/rules/api-backend.md`
- [ ] `.agents/rules/express-api.md`
- [ ] `.agents/rules/stripe-api-pattern.md`
- [ ] `.agents/rules/sdk-conventions.md`
- [ ] `.agents/rules/platform-services.md`
- [ ] `.agents/rules/billing-data-plane.md`
- [ ] `.agents/rules/storage-architecture.md`
- [ ] `.agents/rules/module-settings.md`
- [ ] `.agents/rules/git.md`

## Dispatched briefs

None. GPT Web is implementing directly on the requested branch.

## Execution reports

| Tool | Report | Status |
| --- | --- | --- |
| GPT Web | `./reports/gpt-web/2026-09-07-billing-commercial-platform-architecture.md` | pending |

## Phase checklist

### Phase 0 — Architecture contract + characterization

- [ ] Add `docs/architecture/013-billing-commercial-platform.md`.
- [ ] Add mirrored `.claude/rules/billing-commercial-platform.md` and `.agents/rules/billing-commercial-platform.md`.
- [ ] Reference the rule from root `CLAUDE.md` without changing existing public behavior.
- [ ] Document existing vs reserved-future domain map and app projection ownership.
- [ ] Expand characterization tests around Item/Variant resolution, stock, invoice finalize/void, quote conversion, and media where existing test structure supports it.

### Phase 1 — Shared commercial kernel

- [ ] Add small server-only commerce contracts for `CommerceContext`, `ActorContext`, `ResourceReference`, `ResourceOrigin`, `SellableReference`, and `StockTarget`.
- [ ] Reuse existing actor/source/reference types where present rather than duplicating them.
- [ ] Keep future `channelId`/`locationId` contextual only; no tables or resources.

### Phase 2 — Transaction / unit-of-work seam

- [ ] Audit existing Prisma transaction helpers and reuse the canonical owner.
- [ ] Introduce a transaction-manager seam only if it materially centralizes multi-domain workflows.
- [ ] Avoid a god repository/factory or pass-through abstraction with one caller.

### Phase 3 — Catalog sellable resolver

- [ ] Add one canonical `resolveSellable()` path.
- [ ] Resolve single Item vs Variant identity, active/sellable state, SKU/name, media fallback, tax/unit metadata, pricing reference, and stock target.
- [ ] Refactor document line resolution to consume it.

### Phase 4 — Inventory bounded domain

- [ ] Create `modules/inventory` as the owner of current lightweight stock behavior.
- [ ] Move current stock availability/mutation logic out of Catalog without changing physical Item/Variant quantity storage unless required.
- [ ] Replace Invoice-specific stock operations with generic `checkAvailability`, `consume`, `restore`, and `adjust` commands using generic resource references.
- [ ] Preserve exact Item and Variant stock behavior, duplicate-line aggregation, out-of-stock policy, finalization, and void restoration.
- [ ] Define future Inventory evolution contract without adding advanced inventory schema.

### Phase 5 — Pricing resolver

- [ ] Audit current Product/Price/Price List/default Item/Variant price ownership.
- [ ] Add/normalize one `pricing.resolve()` path for sellable unit pricing.
- [ ] Keep deterministic document total calculation separate from price selection.

### Phase 6 — Commercial line contract

- [ ] Define a shared internal commercial-line snapshot contract.
- [ ] Refactor Quote/Invoice/Credit Note line construction to use the shared resolver where safe.
- [ ] Preserve immutable historical snapshots and wire contracts.

### Phase 7 — Document application workflows

- [ ] Move Invoice finalize orchestration into an explicit workflow boundary.
- [ ] Move Invoice void orchestration into an explicit workflow boundary.
- [ ] Formalize Invoice lifecycle transition rules without building a generic state-machine framework.
- [ ] Repositories must no longer coordinate Catalog/Inventory/Pricing/Ledger domains directly.

### Phase 8 — Trusted actor/origin context

- [ ] Audit existing `sourceAppId`, integration references, `createdBy`, and provider references.
- [ ] Normalize command context without trusting actor/org/app identity from request bodies.
- [ ] Avoid app-specific columns.

### Phase 9 — Idempotency infrastructure

- [ ] Reuse any existing idempotency primitive if present.
- [ ] If absent, add additive `billing_idempotency_keys` schema + hand-written migration.
- [ ] Protect high-value existing commands first; do not retrofit every CRUD route.
- [ ] Add same-key/same-request replay and same-key/different-request conflict tests.

### Phase 10 — Transactional event outbox

- [ ] Reuse existing event/outbox infrastructure if Billing already owns one.
- [ ] If absent, add additive `billing_outbox_events` schema + hand-written migration.
- [ ] Write events atomically with existing real domain mutations only.
- [ ] Document domain-event vs stable integration-event distinction.
- [ ] Do not invent order/fulfillment events.

### Phase 11 — Storage media port / orchestration

- [ ] Audit merged Item/Variant Storage orchestration for duplication between Billing and Invoice hosts.
- [ ] Introduce a Billing-owned Storage adapter/port only where it removes real duplicated business behavior.
- [ ] Keep direct browser→R2 signed upload flow; Billing never proxies bytes.
- [ ] Preserve opaque `fileId` identity and Storage ownership/audience rules.

### Phase 12 — Capability resolver

- [ ] Centralize existing Item/Variant/stock capability evaluation where real duplicate checks exist.
- [ ] Map current persisted preferences without aesthetic key migrations.
- [ ] Document reserved future capability namespaces only; do not seed unavailable features.

### Phase 13 — SDK/caller boundaries

- [ ] Preserve explicit `@876/billing` bounded client and existing caller tiers.
- [ ] Ensure internal StockTarget/UnitOfWork/Outbox concepts do not leak into public SDK APIs.
- [ ] Do not add empty future `orders`, `inventory`, `fulfillments`, or `channels` SDK namespaces.

### Phase 14 — Dependency boundaries

- [ ] Strengthen `apps/billing-api/.dependency-cruiser.cjs` for new Inventory/Pricing/workflow boundaries.
- [ ] Cross-module imports use `index.ts` only.
- [ ] Inventory may not import Documents.
- [ ] Catalog/Pricing may not import Documents internals.
- [ ] Workflows may not import another module's repository.

### Phase 15 — Error ownership

- [ ] Reuse/normalize registered Billing domain errors for sellable/inventory/pricing/idempotency failures.
- [ ] Do not leak Prisma/Storage/provider errors through domain contracts.

### Phase 16 — Tests and hardening

- [ ] Add targeted Catalog resolver tests.
- [ ] Add targeted Inventory generic-command tests.
- [ ] Add Pricing resolver tests.
- [ ] Add document workflow transaction/rollback tests where feasible with existing test patterns.
- [ ] Add idempotency tests if persistence is introduced.
- [ ] Add outbox atomicity tests if persistence is introduced.
- [ ] Add boundary-test coverage/config assertions.
- [ ] Review diff for duplicate abstractions, compatibility residue, swallowed errors, forbidden casts/comments, and speculative features.

### Phase 17 — Documentation + final report

- [ ] Update relevant Billing docs/rules with final implemented architecture rather than aspirational code that was not added.
- [ ] Record exact future insertion points for Orders, advanced Inventory, Channels, Fulfillment, Purchasing, Restaurant projections, Store projections, and Marketplace projections.
- [ ] Write GPT Web report at `reports/gpt-web/2026-09-07-billing-commercial-platform-architecture.md` with per-phase status, test counts, files changed, migrations in full, decisions, risks, unverified work, and verification commands.
- [ ] Update this plan to `COMPLETED` or explicitly document any genuine block.

## Verification commands

GPT Web cannot execute these. They must be run by the local/orchestrating agent.

```bash
pnpm --filter @876/billing-api generate
pnpm --filter @876/billing-api typecheck
pnpm --filter @876/billing-api lint
pnpm --filter @876/billing-api boundaries
pnpm --filter @876/billing-api test
pnpm --filter @876/billing-api build
pnpm --filter @876/billing-api db:validate
pnpm --filter @876/billing-api db:drift
pnpm --filter @876/billing-api db:migration:check
pnpm --filter @876/billing-api api:contract:check

pnpm --filter @876/billing typecheck
pnpm --filter @876/billing test

pnpm --filter @876/billing-ui typecheck
pnpm --filter @876/billing-ui test

pnpm --filter @876/billing-app typecheck
pnpm --filter @876/billing-app lint
pnpm --filter @876/billing-app test
pnpm --filter @876/billing-app build

pnpm --filter @876/invoice-app typecheck
pnpm --filter @876/invoice-app lint
pnpm --filter @876/invoice-app test
pnpm --filter @876/invoice-app build

pnpm --filter @876/storage typecheck
pnpm --filter @876/storage test
```

Do not blindly run `prisma migrate deploy`; inspect migration status/target first.

## Multi-session continuity / handoff

Current state:

- Fresh branch created from latest `main` after PR #510 (Item Variants + 876 Storage Item media).
- No implementation code changed yet.
- Plan is the first branch commit.
- GPT Web cannot run shell/tests/typecheck/build/migrations; all verification remains local/orchestrator responsibility.
- No PR is authorized.

Next step:

1. Finish reading the required backend/domain rules.
2. Audit existing transaction, pricing, event/outbox, idempotency, source/origin, and module-boundary implementations before adding abstractions.
3. Implement Phase 0 architecture contract and characterization tests.
4. Continue through every non-blocked phase in this run.

## PR preparation summary

Pending implementation. No PR should be opened unless explicitly authorized by the user.
