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
- [x] `.agents/rules/naming.md`
- [x] `.agents/rules/types.md`
- [x] `.agents/rules/code-style.md`
- [x] `.agents/rules/testing.md`
- [x] `.agents/rules/error-handling.md`
- [x] `.agents/rules/api-backend.md`
- [x] `.agents/rules/express-api.md`
- [x] `.agents/rules/stripe-api-pattern.md`
- [x] `.agents/rules/sdk-conventions.md`
- [x] `.agents/rules/platform-services.md`
- [x] `.agents/rules/billing-data-plane.md`
- [x] `.agents/rules/storage-architecture.md`
- [x] `.agents/rules/module-settings.md`
- [x] `.agents/rules/git.md`

## Dispatched briefs

None. GPT Web is implementing directly on the requested branch.

## Execution reports

| Tool | Report | Status |
| --- | --- | --- |
| GPT Web | `./reports/gpt-web/2026-09-07-billing-commercial-platform-architecture.md` | pending |

## Phase checklist

### Phase 0 — Architecture contract + characterization

- [x] Add `docs/architecture/013-billing-commercial-platform.md`.
- [x] Add mirrored `.claude/rules/billing-commercial-platform.md` and `.agents/rules/billing-commercial-platform.md`.
- [x] Reference the rule from root `CLAUDE.md` without changing existing public behavior.
- [x] Document existing vs reserved-future domain map and app projection ownership.
- [ ] Expand characterization tests around Item/Variant resolution, stock, invoice finalize/void, quote conversion, and media where existing test structure supports it.

### Phase 1 — Shared commercial kernel

- [x] Add small server-only commerce contracts for `CommerceContext`, `ActorContext`, `ResourceReference`, `ResourceOrigin`, `SellableReference`, and `StockTarget`.
- [x] Reuse existing actor/source/reference types where present rather than duplicating them.
- [x] Keep future `channelId`/`locationId` contextual only; no tables or resources.

### Phase 2 — Transaction / unit-of-work seam

- [x] Audit existing Prisma transaction helpers and reuse the canonical owner.
- [x] Add only the transaction seam required by existing multi-domain Invoice workflows: Documents repositories own the serializable Prisma transaction helper; workflows do not query Prisma directly.
- [x] Avoid a god repository/factory or pass-through abstraction with one caller.

### Phase 3 — Catalog sellable resolver

- [x] Add one canonical `resolveSellable()` path plus batch `resolveSellables()`.
- [x] Resolve single Item vs Variant identity, active/sellable state, SKU/name, media fallback, tax/unit metadata, pricing reference, and stock target.
- [x] Refactor document line resolution to consume it.

### Phase 4 — Inventory bounded domain

- [x] Create `modules/inventory` as the owner of current lightweight stock behavior.
- [x] Move current stock availability/mutation logic out of Catalog without changing physical Item/Variant quantity storage.
- [x] Replace Invoice-specific stock operations with generic `checkAvailability`, `consume`, `restore`, and `adjust` commands using generic resource references.
- [x] Preserve exact Item and Variant stock behavior, duplicate-line aggregation, out-of-stock policy, finalization, and void restoration.
- [x] Preserve legacy `invoice-finalized`/`invoice-voided` audit history while allowing new generic `sale`/`sale-reversal` movement semantics.
- [x] Fix the stock-movement SQL constraint so existing merged `variant-allocation` writes are actually permitted.
- [x] Define future Inventory evolution contract without adding advanced inventory schema.
- [ ] Add targeted Inventory regression tests for generic target-based commands and legacy movement restoration.

### Phase 5 — Pricing resolver

- [x] Audit current Product/Price/Price List/default Item/Variant price ownership.
- [x] Add one Pricing bounded resolver for batched Price/Price List selection.
- [x] Keep deterministic document total calculation separate from price selection.
- [x] Reuse Billing Engine's canonical catalog amount calculation rather than creating another pricing implementation.
- [x] Remove float-based percentage adjustment from the new Pricing path; use exact decimal/integer arithmetic.
- [ ] Remove remaining duplicate legacy pricing helpers/re-exports after all callers use Pricing/Billing Engine.

### Phase 6 — Commercial line contract

- [ ] Define a shared internal commercial-line snapshot contract reusable by document workflows without leaking public SDK internals.
- [x] Refactor Quote/Invoice document line construction to resolve Item/Variant through Catalog and Price/Price List through Pricing.
- [x] Preserve immutable historical snapshots and wire contracts.
- [x] Reject mismatched Price↔Item selections instead of silently snapshotting one Item with another resource's Price.
- [ ] Review Credit Note line construction and reuse the same shared line contract where safe.

### Phase 7 — Document application workflows

- [x] Move Invoice finalize orchestration into `modules/documents/workflows`.
- [x] Move Invoice void orchestration into `modules/documents/workflows`.
- [x] Keep lifecycle transition rules explicit without building a generic state-machine framework.
- [x] Delete the old repository-layer Invoice finalize/void orchestration paths instead of retaining aliases.
- [x] Repositories no longer coordinate Catalog/Inventory/Pricing/Ledger domains for Invoice finalize/void.

### Phase 8 — Trusted actor/origin context

- [x] Audit existing `sourceAppId`, integration references, `createdBy`, and provider references.
- [x] Define trusted server-side `ActorContext` / `ResourceOrigin` seams without accepting authority from request bodies.
- [ ] Normalize high-value command workflow call sites onto the context where it reduces real duplicated attribution behavior.
- [x] Avoid app-specific columns.

### Phase 9 — Idempotency infrastructure

- [x] Reuse the existing canonical JSON/hash implementation in `src/platform/idempotency.ts`.
- [x] Add additive tenant-scoped command idempotency Prisma schema + hand-written migration.
- [x] Store canonical request hash and resulting resource reference/status rather than arbitrary response blobs.
- [x] Add `completedAt` semantics so a committed replay is distinguishable from an in-transaction claim.
- [ ] Wire persisted idempotency into existing high-value Invoice finalize/void workflows inside the same serializable transaction.
- [ ] Keep normal session/UI lifecycle calls backward compatible when no key is supplied; do not retrofit every CRUD route.
- [ ] Add same-key/same-request replay and same-key/different-request conflict tests.

### Phase 10 — Transactional event outbox

- [x] Audit existing Billing/Core outbox implementations and avoid reusing Core-owned projection tables for Billing domain events.
- [x] Add additive tenant-scoped `billing_outbox_events` Prisma schema + hand-written migration.
- [ ] Add a small Billing outbox repository/service contract with stable versioned event envelopes.
- [ ] Write Invoice finalized/voided events atomically with their real domain mutation transactions.
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

- [x] Preserve explicit `@876/billing` bounded client and existing caller tiers so far.
- [x] Keep internal `StockTarget`, transaction, idempotency, and outbox concepts out of public SDK contracts so far.
- [x] Do not add empty future `orders`, `inventory`, `fulfillments`, or `channels` SDK namespaces.
- [ ] Recheck the finished diff for accidental internal-type leakage after all phases land.

### Phase 14 — Dependency boundaries

- [ ] Strengthen `apps/billing-api/.dependency-cruiser.cjs` for new Inventory/Pricing/workflow boundaries.
- [ ] Cross-module imports use `index.ts` only.
- [ ] Inventory may not import Documents.
- [ ] Catalog/Pricing may not import Documents internals.
- [ ] Workflows may not import another module's repository.

### Phase 15 — Error ownership

- [ ] Reuse/normalize registered Billing domain errors for sellable/inventory/pricing/idempotency failures.
- [x] New Catalog/Inventory/Pricing boundaries return domain errors rather than exposing raw Prisma errors.
- [ ] Audit remaining new error strings/codes and register/normalize them consistently.

### Phase 16 — Tests and hardening

- [ ] Add targeted Catalog resolver tests.
- [ ] Add targeted Inventory generic-command tests.
- [ ] Add Pricing resolver tests.
- [ ] Add document workflow transaction/rollback tests where feasible with existing test patterns.
- [ ] Add idempotency tests.
- [ ] Add outbox atomicity tests.
- [ ] Add boundary-test coverage/config assertions.
- [ ] Review diff for duplicate abstractions, compatibility residue, swallowed errors, forbidden casts/comments, and speculative features.

### Phase 17 — Documentation + final report

- [ ] Update relevant Billing docs/rules with final implemented architecture rather than aspirational code that was not added.
- [ ] Record exact future insertion points for Orders, advanced Inventory, Channels, Fulfillment, Purchasing, Restaurant projections, Store projections, and Marketplace projections.
- [ ] Write GPT Web report at `reports/gpt-web/2026-09-07-billing-commercial-platform-architecture.md` with per-phase status, test counts, files changed, migrations in full, decisions, risks, unverified work, and verification commands.
- [ ] Update this plan to `COMPLETED` or explicitly document any genuine block.

## Implementation findings / decisions

1. Billing already owned cross-app source attribution and deterministic canonical request hashing; the new command idempotency layer reuses those primitives rather than introducing another canonicalizer.
2. Billing Engine already owned the tested deterministic catalog-price calculation. Catalog and Documents contained duplicate copies, so Pricing delegates amount calculation to Billing Engine and owns selection/price-list policy only.
3. The merged Item Variant implementation wrote `variant-allocation` movements while the original stock SQL check constraint did not permit that value. The commercial-platform migration repairs the constraint additively and also admits semantic `sale` / `sale-reversal` movement values.
4. Inventory's public command contract is `StockTarget` based. Current persistence still resolves those targets to Item/Variant quantity columns and movement FKs; future inventory indirection can change without changing callers.
5. Invoice finalize/void orchestration now lives in Documents workflows, while a Documents repository helper owns Prisma transaction/query/write details. Cross-domain side effects use Inventory/Ledger public APIs.
6. Document line preparation now batches Pricing and Catalog resolution and keeps `@876/core/money` as the document-total arithmetic owner. It does not introduce per-line N+1 resolution.
7. `platform-services.md` previously used commerce/orders as an example future shared service. The new Billing commercial-platform rule/ADR makes Billing the actual shared commercial data plane; final docs review must ensure those rules do not contradict one another.

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

Current state as of the tracker sync:

- Branch remains based on `main` commit `90c986688ddd4add71fd665592b15722029ebc42` and was 60 commits ahead / 0 behind that base when compared during this run.
- Architecture ADR/rules, commercial kernel, Catalog sellable resolution, Inventory boundary, Pricing boundary, document-line delegation, and explicit Invoice finalize/void workflows are implemented.
- Command-idempotency and Billing-outbox persistence schemas/migrations exist, but workflow wiring and tests are still pending.
- No speculative commerce resources have been added.
- The branch also contains unrelated Invoice/Billing finance-settings work from concurrent work. Preserve it; do not rewrite, revert, or fold it into this architecture task.
- GPT Web cannot run shell/tests/typecheck/build/migrations; all verification remains local/orchestrator responsibility.
- No PR is authorized.

Next step:

1. Wire command idempotency into Invoice finalize/void atomically with the existing serializable transaction.
2. Add the Billing outbox repository/service and emit only real Invoice lifecycle events from those same transactions.
3. Remove the remaining duplicate legacy pricing helpers after caller audit.
4. Complete shared line/error/capability/media/boundary work only where it removes real duplication.
5. Add focused regression tests, finish docs, write the GPT Web report, and close this tracker only after the implementation diff has been reviewed.

## PR preparation summary

Implementation is in progress. No PR should be opened unless explicitly authorized by the user.
