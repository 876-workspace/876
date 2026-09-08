# Implementation Plan: Billing Commercial Platform Architecture

**Run ID:** `2026-09-07-billing-commercial-platform-architecture`  
**Branch:** `feature/billing-commercial-platform-architecture`  
**Original base:** `main` at `90c986688ddd4add71fd665592b15722029ebc42`  
**Final status:** `COMPLETED — VERIFIED LOCALLY`

## Goal

Refactor 876 Billing into the canonical financial + commercial data plane while preserving current Billing/Invoice behavior and deliberately **not** implementing speculative commerce features.

The implemented architecture lets current Invoice/Quote workflows and future Store/Restaurant/POS/Marketplace/Order workflows reuse the same Catalog, Pricing, Inventory, calculation, customer, payment, ledger, idempotency, event, and media boundaries.

Invoice is now one application workflow over shared commercial domains rather than the architectural owner of Item/Variant pricing and stock behavior.

## Explicit non-goals preserved

No persisted resources, routes, SDK namespaces, or UI were added for:

- Orders or carts/checkouts;
- warehouses or stock locations/bins;
- InventoryItem/InventoryLevel/reservations/transfers;
- purchase orders/supplier receiving;
- fulfillment/shipments;
- sales channels;
- restaurant menus/kitchen/table workflows;
- modifiers/bundles/combos;
- marketplace listings/offers;
- advanced inventory costing;
- a generic workflow/state-machine framework.

Future ownership/insertion points are documented only.

## Binding invariants — final

- [x] 876 Billing is the canonical financial + commercial data plane.
- [x] Canonical Items/Variants remain Billing-owned across Invoice/future product surfaces.
- [x] Product apps may own projections/workflow state but reference Billing sellables by opaque IDs.
- [x] Catalog owns sellable identity.
- [x] Pricing owns Price/Price List selection.
- [x] Billing Engine remains deterministic monetary calculation owner.
- [x] Inventory owns stock interpretation/mutation.
- [x] Documents own document lifecycle + immutable snapshots.
- [x] Repositories no longer coordinate another bounded domain for Invoice finalize/void.
- [x] Cross-module access is through public module APIs and dependency rules enforce the new direction.
- [x] Storage owns bytes/File identity; Billing owns Item/Variant media relationships using opaque `fileId`.
- [x] Existing public resource shapes remain compatible; optional lifecycle idempotency is additive.
- [x] No speculative future commerce resources were created.

## Rules read

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

## Report

| Tool | Report | Status |
| --- | --- | --- |
| GPT Web | `./reports/gpt-web/2026-09-07-billing-commercial-platform-architecture.md` | complete |

## Phase completion

### Phase 0 — Architecture contract + characterization

- [x] Added `docs/architecture/013-billing-commercial-platform.md`.
- [x] Added byte-identical `.claude/rules/billing-commercial-platform.md` and `.agents/rules/billing-commercial-platform.md`.
- [x] Updated both `platform-services.md` mirrors so canonical commercial truth explicitly resolves to Billing rather than a parallel generic commerce/orders service.
- [x] Documented current vs reserved-future domains and Store/Restaurant/Marketplace projection ownership.
- [x] Added targeted characterization around Catalog, Inventory, Invoice workflows, idempotency, Pricing, Item capability, and media orchestration.
- [x] Root `CLAUDE.md` was intentionally not rewritten solely to add another bullet: the repository declares `.claude/rules/` canonical and both `platform-services.md` mirrors explicitly point to this new rule/ADR. This is recorded honestly rather than claiming a root-file edit.

### Phase 1 — Shared commercial kernel

- [x] Added `CommerceContext`, `ActorContext`, `ResourceReference`, `ResourceOrigin`, `SellableReference`, `StockTarget`, `ResolvedSellable`, and `IdempotencyContext` server contracts.
- [x] Reused existing canonical hashing/source attribution concepts instead of duplicating them.
- [x] Kept future `channelId` / `locationId` contextual only; no persistence/resources.

### Phase 2 — Transaction seam

- [x] Audited/reused Prisma transaction ownership.
- [x] Documents repository layer owns the serializable Invoice transaction helper.
- [x] Application workflows do not query Prisma directly.
- [x] No generic god Unit of Work/factory was added.

### Phase 3 — Catalog sellable resolver

- [x] Added canonical `resolveSellable()` / `resolveSellables()`.
- [x] Added Variant-only reference resolution for legacy/current call sites.
- [x] Canonicalized Item/Variant active state, identity, SKU, unit/tax metadata, price defaults, media fallback, Pricing reference, and Inventory stock target.
- [x] Documents now consume the Catalog resolver instead of duplicating Item/Variant interpretation.

### Phase 4 — Inventory bounded domain

- [x] Added `modules/inventory` as current lightweight stock owner.
- [x] Removed old Catalog Item stock mutation implementation.
- [x] Removed the transitional oversized Inventory repository and split persistence by command.
- [x] Implemented generic `checkAvailability`, `consume`, `restore`, and `adjust`.
- [x] Preserved duplicate-target aggregation and `allowOutOfStock` semantics.
- [x] Preserved Variant stock ownership.
- [x] New lifecycle movement vocabulary is `sale` / `sale-reversal`.
- [x] Legacy `invoice-finalized` restore compatibility remains.
- [x] Added migration repair allowing already-written `variant-allocation` plus new semantic values.
- [x] Current physical quantity columns stay on Item/Variant intentionally behind Inventory ownership.

### Phase 5 — Pricing resolver

- [x] Added one Pricing bounded resolver for batched Price/Price List selection.
- [x] Kept document totals separate from price selection.
- [x] Reused Billing Engine's canonical pricing-model calculator.
- [x] Deleted duplicate Catalog and Documents pricing calculator implementations.
- [x] Replaced JS-float percentage adjustment in the new path with exact decimal/integer arithmetic.
- [x] Retained only a narrow Catalog re-export of Billing Engine's calculator for two large existing Subscription repositories; there is one executable algorithm. Direct-import cleanup is optional future compatibility cleanup, not an unfinished domain implementation.

### Phase 6 — Commercial line contract

- [x] Added internal `CommercialLineSnapshot`.
- [x] Quote/Invoice line preparation resolves Price through Pricing and Item/Variant through Catalog.
- [x] Preserved immutable historical line snapshots.
- [x] Rejects Price↔Item mismatch rather than combining unrelated resources.
- [x] Reviewed Credit Notes and intentionally retained explicit correction snapshots rather than re-pricing historical corrections against the live Catalog.

### Phase 7 — Document application workflows

- [x] Moved Invoice finalize orchestration into `modules/documents/workflows`.
- [x] Moved Invoice void orchestration into `modules/documents/workflows`.
- [x] Deleted old repository lifecycle implementations/aliases.
- [x] Kept lifecycle rules explicit; no generic state machine.
- [x] Cross-domain effects use owning public module APIs.

### Phase 8 — Trusted actor/origin context

- [x] Audited existing `sourceAppId`, integration references, `createdBy`, and provider references.
- [x] Added trusted server-side actor/origin seams without accepting authority from request bodies.
- [x] Preserved existing attribution call sites where replacing them would be aesthetic churn rather than removing duplicated policy.
- [x] No app-specific commercial schema columns were introduced.

### Phase 9 — Command idempotency

- [x] Reused Billing canonical JSON/hash implementation.
- [x] Added `billing_command_idempotency_keys` Prisma schema + hand-written migration.
- [x] Stores canonical request hash + resource/status, not arbitrary response blobs.
- [x] Added `completedAt` semantics.
- [x] Uses race-safe `createMany(..., skipDuplicates: true)` claim behavior.
- [x] Wired optional persisted idempotency into Invoice finalize/void inside the same serializable transaction.
- [x] Same-key/same-request completed commands replay.
- [x] Same key with another canonical request/resource conflicts.
- [x] In-progress duplicate conflicts.
- [x] Existing callers without an idempotency header retain previous behavior.

### Phase 10 — Transactional event outbox

- [x] Added `billing_outbox_events` Prisma schema + hand-written migration.
- [x] Added Billing outbox repository/service contract.
- [x] Added stable versioned `invoice.finalized` v1 event.
- [x] Added stable versioned `invoice.voided` v1 event.
- [x] Events are written with the same transaction as state/stock/ledger/idempotency completion.
- [x] Documented stable integration-event distinction.
- [x] No future Order/Fulfillment events invented.
- [x] Publisher/queue/webhook delivery is intentionally deferred until a real event consumer exists.

### Phase 11 — Storage media port/orchestration

- [x] Audited Billing vs Invoice Item-media upload duplication.
- [x] Extracted shared server-only Billing Item/Variant media orchestration to `@876/billing/server`.
- [x] Hosts retain authentication/authorization and source-app identity.
- [x] Browser still uploads directly to R2 through Storage signed URLs; Billing does not proxy bytes.
- [x] Opaque Storage `fileId` remains canonical media identity.
- [x] Added recovery for partial completion where Storage link succeeded but Billing attachment failed.

### Phase 12 — Capability resolver

- [x] Centralized the real duplicated Item Variant capability decision.
- [x] Variant-mode Item creation and Variant mutation now use the same service-layer capability resolver.
- [x] Existing `items / product-variants` preference key/default is preserved.
- [x] No unavailable future capabilities were seeded.
- [x] Stock tracking remains Item state; no artificial org capability was introduced.

### Phase 13 — SDK/caller boundaries

- [x] Preserved explicit `@876/billing` bounded client/caller tiers.
- [x] Kept `StockTarget`, transaction, idempotency rows, outbox rows, and persistence ports internal.
- [x] Added only a server-side Item-media orchestration export required by both hosts.
- [x] Added no empty future Orders/Inventory/Fulfillment/Channels SDK namespaces.

### Phase 14 — Dependency boundaries

- [x] Strengthened `apps/billing-api/.dependency-cruiser.cjs`.
- [x] Inventory cannot depend on Documents.
- [x] Catalog cannot depend on Documents.
- [x] Pricing cannot depend on Documents.
- [x] Documents workflows cannot import another module's repositories.
- [x] Existing public-index/module-boundary and repository-only Prisma rules remain authoritative.

### Phase 15 — Error ownership

- [x] Reused existing registered Item/Variant/stock errors.
- [x] Registered new idempotency/Pricing/currency errors in Billing's central error registry.
- [x] New domain seams normalize failures instead of exposing Prisma/Storage internals as Billing domain errors.

### Phase 16 — Tests and hardening

- [x] 5 Catalog sellable resolver tests authored.
- [x] 3 Item capability tests authored.
- [x] 5 Inventory generic-command tests authored.
- [x] 5 Pricing resolver tests authored.
- [x] 5 command-idempotency service tests authored.
- [x] 5 command-idempotency repository tests authored.
- [x] 5 Invoice workflow/outbox-composition tests authored.
- [x] 5 shared Item-media orchestration tests authored.
- [x] **38 focused tests total across 8 files.**
- [x] Final compile-oriented review fixed the workflow test's Zod output shape for `autoApplyCredits`.
- [x] Removed dead Catalog stock implementation/tests and transitional Inventory god repository.
- [x] Removed duplicate executable pricing implementations.
- [x] Reviewed diff for speculative resources/internal SDK leakage; none intentionally introduced.
- [x] Runtime/typecheck/build/database verification — **LOCAL VERIFICATION REQUIRED; GPT Web did not execute commands.**

### Phase 17 — Documentation + closeout

- [x] Added accepted architecture ADR.
- [x] Added byte-identical commercial-platform rule mirrors.
- [x] Updated byte-identical platform-services rule mirrors to remove architecture contradiction.
- [x] Recorded future insertion points for Orders, advanced Inventory, Channels, Fulfillment, Purchasing, Restaurant, Store, and Marketplace projections.
- [x] Wrote final GPT Web report with migrations in full, tests, decisions, risks, deferrals, compatibility seams, and verification commands.
- [x] Tracker closed as `IMPLEMENTATION_COMPLETE — LOCAL_VERIFICATION_REQUIRED`.

## Key implementation findings

1. Billing already owned canonical request hashing; command idempotency reuses it.
2. Billing Engine already owned the canonical pricing-model calculation; duplicate Catalog/Documents copies were removed.
3. The merged Variant implementation had a real SQL constraint mismatch for `variant-allocation`; the additive migration repairs it.
4. Inventory can own stock semantics before physical Item/Variant quantity columns are normalized.
5. Application workflows can orchestrate Inventory/Ledger/Outbox while Documents repositories own Invoice persistence/transaction details.
6. Credit Notes should keep explicit immutable correction snapshots rather than depending on current live Catalog pricing.
7. Billing and Invoice duplicated meaningful Storage orchestration; extracting it also enabled a correct partial-failure retry path.
8. `platform-services.md` needed an explicit Billing commercial-plane exception to avoid future agents creating a parallel commerce/orders source of truth.

## Schema/migrations added

- `apps/billing-api/prisma/migrations/20260907230000_billing_commercial_platform/migration.sql`
  - repairs stock movement type constraint;
  - permits `variant-allocation`, `sale`, `sale-reversal` while retaining historical values.
- `apps/billing-api/prisma/migrations/20260907231000_billing_command_idempotency_outbox/migration.sql`
  - adds `billing_command_idempotency_keys`;
  - adds `billing_outbox_events`.

Full SQL is preserved in the GPT Web report.

## Verification status

GPT Web did **not** run and does **not** claim success for:

- Prisma generation;
- typecheck;
- lint;
- dependency-cruiser;
- tests;
- builds;
- DB validate/drift/migration checks;
- API contract checks;
- database migrations.

## Required local verification

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

Do not blindly run `prisma migrate deploy`; inspect target/status/constraints first.

## Closeout / local-agent handoff

- Preserve branch history and all files.
- Read the final report before local verification.
- Current `main` caught up with the concurrent finance-settings work during this run; the commercial-platform branch was ahead of current `main` with no behind divergence at final pre-closeout comparison.
- Generate Prisma before judging TypeScript errors involving the two new models.
- Verify Billing API typecheck + dependency boundaries before broad app builds.
- Exercise concurrent/last-unit stock finalize behavior and idempotency replay on a real local DB after static verification.
- Confirm one outbox row per successful lifecycle command and none for rolled-back commands.
- Confirm Item-media completion can be retried after Storage linking succeeds but Billing attachment fails.
- A future PR split should be focused, but no PR is authorized/created by GPT Web.

## PR preparation summary

Architecture implementation is complete and **locally verified** by the orchestrating agent.

### Verification performed (orchestrator, on the merged tree)

`origin/main` (#512) was merged into the branch before final verification, so these results
describe the merged result rather than the branch in isolation.

| Target | Result |
| --- | --- |
| `@876/billing-api` typecheck / lint / boundaries | clean / 0 errors (3 pre-existing warnings) / **0 violations** |
| `@876/billing-api` test | 660 passed (71 files) |
| `@876/billing-api` api:contract:check | 0 differences |
| `@876/billing-api` build | success |
| `@876/billing` | typecheck clean, 313 passed |
| `@876/billing-ui` | typecheck clean, 380 passed |
| `@876/storage` | typecheck clean, 391 passed |
| `@876/billing-app` | typecheck clean, 858 passed |
| `@876/invoice-app` | typecheck clean, 386 passed |

### Defects found and repaired during verification

GPT Web cannot execute a shell, so none of its output had ever been run. Codex
(`gpt-5.6-terra`, high effort) repaired the following under orchestrator briefs:

1. `packages/billing` gained an `@876/storage` dependency with no lockfile entry, so **every**
   pnpm command failed before any check could run.
2. `calculateCatalogAmount` moved `quantity` into its options object; four call sites still
   passed it positionally, so it arrived `undefined` and threw at runtime (4 typecheck errors,
   4 failing tests).
3. **20 `no-circular` boundary violations** that `main` does not have, from Catalog importing the
   Billing Engine barrel and re-exporting its calculator. Fixed structurally by moving the pure
   arithmetic into the `src/commerce/` leaf — the dependency-cruiser config was not weakened.
4. A test asserted on `storage/resource-link-conflict`, an error code that exists nowhere.
5. A reserved `module` loop variable failed the lint gate.
6. `apps/invoice` finance-settings asserted `getByText('USD')` while the shared panel renders
   `USD · US Dollar` in one element — a test that had never been executed.

An earlier Codex fix added an unreachable `pricingModel = 'FLAT'` default to accommodate an
incomplete fixture; that was rejected as a runtime guard for an impossible state
(`ai-code-quality.md`) and replaced by correcting the fixture.

### Outstanding for the reviewer

- **Two migrations are unapplied everywhere**: `20260907230000_billing_commercial_platform` and
  `20260907231000_billing_command_idempotency_outbox`. The first widens the
  `billing_item_stock_movements` type CHECK constraint; the second creates
  `billing_command_idempotency_keys` and `billing_outbox_events`. Both are additive.
- **The constraint widening fixes a live defect on `main`.** PR #510 shipped code that writes
  `type: 'variant-allocation'` (`catalog/repositories/items/variants.ts`) without extending the
  CHECK constraint created in `20260907190000_item_stock_tracking`. Converting an item to
  variants with stock on hand currently violates that constraint at runtime. Tests do not catch
  it because they mock Prisma.
- `20260907230000_billing_commercial_platform` shares a timestamp prefix with #512's
  `20260907230000_invoice_preference_provisioning`. Ordering is deterministic
  (lexicographic) and the two touch unrelated tables, so they were left as-is rather than
  renaming a migration already on `main`.
- Runtime behaviour still worth exercising against a real database: concurrent/last-unit stock
  finalize, idempotency replay, one outbox row per committed lifecycle command and none for a
  rolled-back one, and Item-media retry after Storage links but Billing attach fails.
