# GPT Web Implementation Report — Billing Commercial Platform Architecture

**Run ID:** `2026-09-07-billing-commercial-platform-architecture`  
**Branch:** `feature/billing-commercial-platform-architecture`  
**Original branch base:** `main` at `90c986688ddd4add71fd665592b15722029ebc42`  
**Current `main` merge base at closeout:** `091b8d341bf8d4a93b2f21c6b1dc89f7831218dc`  
**Code checkpoint before this report commit:** `02400141eb99bec0c07d6840f42aebb794841d34`  
**Status:** `IMPLEMENTATION_COMPLETE — LOCAL_VERIFICATION_REQUIRED`  
**PR:** Not opened. No PR was authorized.

## Executive summary

This branch completes the approved deeper architectural refactor of 876 Billing into the platform's canonical **financial + commercial data plane** without implementing speculative commerce features.

The purpose of the work is not to build Orders, ecommerce, restaurant ordering, warehouses, fulfillment, channels, purchasing, or marketplace features today. It establishes the ownership boundaries and reusable internal contracts those future products can consume without making Invoice the center of Catalog, Pricing, or Inventory behavior.

The implemented shape is now:

```text
Billing application workflow
  ├── Catalog          -> what is being sold
  ├── Pricing          -> how a selected Price / Price List resolves
  ├── Billing Engine   -> deterministic monetary calculation
  ├── Inventory        -> lightweight stock availability/mutation
  ├── Documents        -> Quote/Invoice/Credit Note lifecycle + snapshots
  ├── Ledger           -> durable financial movements
  ├── Idempotency      -> persisted replay protection for high-value commands
  ├── Outbox           -> transactionally recorded stable events
  └── Storage port     -> shared Item/Variant image orchestration
```

Invoice finalize/void are the first concrete workflows using these boundaries. Future Store, Restaurant, POS, Marketplace, and similar applications can reference Billing sellables by opaque Item/Variant IDs while owning only their application-specific projections and workflow state.

No public `orders`, `channels`, `fulfillments`, `purchasing`, advanced `inventory`, `menus`, or marketplace SDK/resource namespaces were created.

## Final architecture decisions

### 1. Billing owns canonical commercial truth

The architecture ADR and mirrored rules establish 876 Billing as the owner of shared financial/commercial records, including:

- Customers and payer relationships;
- Items and Item Variants;
- Item/Variant media relationships;
- Prices and Price Lists;
- lightweight stock state and movement history;
- Quotes, Invoices, and Credit Notes;
- Payments;
- subscriptions;
- tax configuration;
- ledger records.

Product applications do not create competing canonical copies.

`platform-services.md` was updated in both rule trees so its generic shared-service placement rule no longer implies that canonical commerce/Orders should be split into a parallel service. Cross-surface domains such as ticketing/messaging still follow the normal shared-service rule; canonical commercial truth goes to Billing.

### 2. Catalog owns sellable identity

Added one canonical Item/Variant resolution path:

- `resolveSellable()`;
- `resolveSellables()`;
- `resolveVariantReferences()`;
- stable `sellableKey()` identity.

Catalog resolves:

- tenant ownership and active Item/Variant state;
- Item vs Variant selection;
- Variant-required semantics;
- Variant-belongs-to-Item validation;
- Item/Variant name + SKU;
- unit and tax metadata;
- default selling amount/currency;
- primary media fallback;
- Pricing reference;
- Inventory `StockTarget`.

Document line preparation no longer performs its own independent Item/Variant interpretation.

### 3. Inventory owns stock semantics

The old Catalog-owned Invoice-specific stock implementation was removed.

Current lightweight stock behavior is now owned by `apps/billing-api/src/modules/inventory/` and exposed through generic operations:

```text
checkAvailability
adjust
consume
restore
```

Inventory receives generic `StockTarget` and `ResourceReference` values instead of an Invoice-specific API.

The current physical quantity columns remain on Item/ItemVariant intentionally. The architecture hides that persistence choice behind Inventory so a future model can evolve toward inventory items/levels/locations without changing every caller.

The transitional oversized Inventory repository was also removed during hardening and split into focused repositories:

- `resolve-targets.ts`;
- `check-availability.ts`;
- `consume.ts`;
- `restore.ts`;
- `adjust.ts`.

Legacy Catalog stock files were deleted rather than kept as aliases.

### 4. Generic stock movement semantics

New Inventory mutations use semantic movement types:

- `sale`;
- `sale-reversal`.

Historical records remain valid:

- `invoice-finalized`;
- `invoice-voided`.

Restore intentionally recognizes legacy `invoice-finalized` records so previously finalized invoices remain restorable after the architecture migration.

The migration also fixes an existing defect from the merged Item Variants work: code already wrote `variant-allocation`, but the stock-movement SQL check constraint did not permit that value.

### 5. Pricing owns resolution; Billing Engine owns calculation

Added a Pricing bounded domain responsible for Price / Price List selection and contextual line-price resolution.

Pricing does **not** become a second monetary calculator. It delegates supported pricing-model calculation to the existing Billing Engine canonical implementation.

The duplicate Catalog and Documents pricing calculators were deleted.

A narrow Catalog re-export of Billing Engine's `calculateCatalogAmount` remains only for existing Subscription repository callers. This is an intentional compatibility seam, not a duplicate algorithm. A future focused cleanup may move those callers directly to Billing Engine and remove the re-export.

Price List percentage adjustment in the new Pricing path no longer converts Decimal percentages through JavaScript `Number`; it uses exact decimal/integer money arithmetic.

### 6. Shared commercial-line snapshot

Added internal `CommercialLineSnapshot` as the neutral immutable line shape used by document line preparation.

Quote/Invoice line preparation now:

1. batches Price resolution through Pricing;
2. resolves Variant-only selections to canonical Item/Variant references;
3. batches Item/Variant resolution through Catalog;
4. rejects a Price selected for an unrelated Item;
5. calculates totals through `@876/core/money`;
6. persists immutable snapshots.

Credit Notes intentionally keep their explicit submitted snapshot amounts/descriptions. A historical credit correction should not be re-priced from the current live Catalog merely to force every document type through one live resolver.

### 7. Explicit Invoice application workflows

Invoice finalize/void orchestration moved out of `repositories/invoices/*` into:

- `modules/documents/workflows/finalize-invoice.ts`;
- `modules/documents/workflows/void-invoice.ts`.

The old repository lifecycle files were deleted.

A Documents-owned repository helper retains the serializable Prisma transaction and Invoice-specific reads/writes. The workflow itself calls other domains through their public module APIs.

Finalize now coordinates, in one serializable transaction:

```text
optional command idempotency claim
-> Invoice lifecycle validation
-> payment-term / salesperson resolution
-> Inventory.consume(reference=invoice, reason=sale)
-> Invoice final state
-> Ledger entry
-> optional credit settlement
-> customer AR recomputation
-> invoice.finalized outbox event
-> idempotency completion
-> commit
```

Void similarly coordinates:

```text
optional command idempotency claim
-> Invoice lifecycle / settlement validation
-> Inventory.restore(reference=invoice, reason=sale)
-> Invoice VOID state
-> reversing Ledger entry
-> customer AR recomputation
-> invoice.voided outbox event
-> idempotency completion
-> commit
```

A failed transaction leaves neither a completed idempotency claim nor a committed outbox event.

### 8. Persisted command idempotency

Added tenant-scoped persisted command idempotency for the existing high-value Invoice finalize/void commands.

The infrastructure reuses Billing's canonical JSON hashing implementation rather than adding another request canonicalizer.

The effective key is scoped by:

```text
tenant + operation + Idempotency-Key
```

The stored row binds the key to:

- canonical request hash;
- resource type/id;
- resulting HTTP status;
- creation time;
- completion time;
- optional future expiry.

Behavior:

- same key + same request + completed transaction -> replay;
- same key + different request/resource -> 409 conflict;
- same key while the first transaction is in progress -> 409 conflict;
- no header -> existing UI/session behavior remains unchanged.

Claims use `createMany(..., skipDuplicates: true)` so the unique-key race does not abort the surrounding PostgreSQL transaction before the existing row can be classified.

### 9. Transactional Billing outbox

Added Billing-owned outbox persistence and a small module contract.

Stable v1 event envelopes currently exist only for real implemented lifecycle events:

- `invoice.finalized`;
- `invoice.voided`.

Events are inserted with the same transaction that commits the state they describe.

The branch deliberately does **not** implement an event broker, delivery worker, webhook engine, or speculative future Order/Fulfillment events. Outbox publication/retry transport is a later operational concern when an actual consumer requires it.

### 10. Shared Billing/Storage Item-media orchestration

The merged Item/Variant work had duplicated Billing and Invoice BFF logic for:

- selecting Storage upload route policy;
- creating the upload session;
- validating completion owner/purpose/status;
- creating the Storage resource link;
- attaching the `fileId` to Billing Item/Variant metadata.

That business orchestration now lives once under `@876/billing/server`.

Each host still owns:

- authentication;
- authorization;
- source app identity;
- host-specific Billing client construction;
- HTTP response translation.

Storage still owns File identity, bytes, R2 object keys, verification, and delivery.

The browser continues to upload directly to R2 using Storage's signed URL. Billing does not proxy image bytes.

The shared helper also fixes a real retry gap: if Storage completion + resource-link creation succeeded but the Billing attachment failed, a retry can recover the already-existing exact Storage link and retry only the Billing attachment.

### 11. Capability resolution

Item Variant capability evaluation was centralized at the Catalog service layer.

Both Variant-mode Item creation and Variant mutation now resolve the same persisted `items / product-variants` preference instead of allowing the Item repository to query capability state independently.

No aesthetic preference-key migration was performed.

Stock tracking remains Item state rather than being invented as an unrelated organization capability.

### 12. Dependency boundaries

`apps/billing-api/.dependency-cruiser.cjs` now explicitly protects the new ownership direction:

- Inventory must not depend on Documents;
- Catalog must not depend on Documents;
- Pricing must not depend on Documents;
- Documents workflows may not import another module's repositories;
- existing module-boundary rule continues requiring cross-module imports through public `index.ts` entrypoints;
- Prisma access remains repository-only.

### 13. Error ownership

Billing's central error registry was extended for new stable commercial errors, including:

- idempotency key/conflict;
- currency mismatch;
- Price not found;
- Price List not found;
- invalid Price List;
- price quantity unavailable.

Existing registered Item/Variant/stock errors are reused.

The new Catalog/Pricing/Inventory/idempotency boundaries return domain-level errors instead of exposing raw Prisma/provider errors to callers.

## Shared server contracts added

`apps/billing-api/src/types/commerce.ts` now defines the small internal kernel:

```ts
ActorContext
ResourceOrigin
ResourceReference
SellableReference
StockTarget
ResolvedSellable
CommerceContext
IdempotencyContext
```

`channelId` and `locationId` are context seams only. There are no Channel or Location resources/tables.

`apps/billing-api/src/types/commercial-line.ts` defines `CommercialLineSnapshot`.

`apps/billing-api/src/types/inventory.ts` defines the internal Inventory command/result contracts.

`apps/billing-api/src/types/pricing.ts` defines internal Pricing resolution contracts.

These are server implementation concepts and are not exposed as new public SDK resource namespaces.

## Schema and migration changes

### Migration 1 — stock movement vocabulary / constraint repair

Path:

`apps/billing-api/prisma/migrations/20260907230000_billing_commercial_platform/migration.sql`

Full SQL:

```sql
-- Preserve historical stock movement values while allowing the semantic
-- Inventory vocabulary used by the commercial-platform boundary. The
-- item-variants migration introduced `variant-allocation` writes but did not
-- extend the original check constraint, so include that already-shipped value
-- here as well.
ALTER TABLE "billing_item_stock_movements"
  DROP CONSTRAINT "billing_item_stock_movements_type_check";

ALTER TABLE "billing_item_stock_movements"
  ADD CONSTRAINT "billing_item_stock_movements_type_check"
    CHECK (
      "type" IN (
        'initial-stock',
        'manual-adjustment',
        'variant-allocation',
        'invoice-finalized',
        'invoice-voided',
        'sale',
        'sale-reversal'
      )
    );
```

This migration does not rewrite historical movement rows.

### Migration 2 — command idempotency + outbox

Path:

`apps/billing-api/prisma/migrations/20260907231000_billing_command_idempotency_outbox/migration.sql`

Full SQL:

```sql
CREATE TABLE "billing_command_idempotency_keys" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "operation" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "request_hash" TEXT NOT NULL,
  "resource_type" TEXT,
  "resource_id" TEXT,
  "http_status" INTEGER,
  "created_at" INTEGER NOT NULL,
  "completed_at" INTEGER,
  "expires_at" INTEGER,

  CONSTRAINT "billing_command_idempotency_keys_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_command_idempotency_keys_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "billing_tenants"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "billing_command_idempotency_keys_tenant_operation_key"
  ON "billing_command_idempotency_keys"("tenant_id", "operation", "key");
CREATE INDEX "billing_command_idempotency_keys_tenant_created_idx"
  ON "billing_command_idempotency_keys"("tenant_id", "created_at");
CREATE INDEX "billing_command_idempotency_keys_expires_idx"
  ON "billing_command_idempotency_keys"("expires_at");

CREATE TABLE "billing_outbox_events" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "resource_type" TEXT NOT NULL,
  "resource_id" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "occurred_at" INTEGER NOT NULL,
  "published_at" INTEGER,
  "attempt_count" INTEGER NOT NULL DEFAULT 0,
  "last_error" TEXT,

  CONSTRAINT "billing_outbox_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_outbox_events_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "billing_tenants"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_outbox_events_version_check" CHECK ("version" > 0),
  CONSTRAINT "billing_outbox_events_attempt_count_check" CHECK ("attempt_count" >= 0)
);

CREATE INDEX "billing_outbox_events_tenant_occurred_idx"
  ON "billing_outbox_events"("tenant_id", "occurred_at");
CREATE INDEX "billing_outbox_events_publish_idx"
  ON "billing_outbox_events"("published_at", "occurred_at");
```

Corresponding Prisma models:

- `CommandIdempotencyKey`;
- `OutboxEvent`;
- Tenant relation fields for both.

New ID prefixes:

- `CommandIdempotencyKey -> idem`;
- `OutboxEvent -> evt`.

## Tests authored

**38 focused tests were authored across 8 new/refactored test files. None were executed by GPT Web.**

### Catalog capability — 3

`apps/billing-api/src/modules/catalog/item-capabilities.service.test.ts`

Covers:

- preference -> capability mapping;
- enabled Variant workflow;
- registered disabled-Variant error.

### Catalog sellable resolution — 5

`apps/billing-api/src/modules/catalog/sellables.service.test.ts`

Covers:

- single Item resolution and stock target;
- Variant identity/default price/media/stock target;
- Variant-required validation;
- Variant ownership mismatch;
- Variant-only legacy selection -> canonical Item/Variant reference.

### Command idempotency service — 5

`apps/billing-api/src/modules/command-idempotency/command-idempotency.service.test.ts`

Covers:

- new claim;
- completed replay;
- request/resource conflict;
- in-progress duplicate;
- completion delegation.

### Command idempotency persistence — 5

`apps/billing-api/src/modules/command-idempotency/command-idempotency.repository.test.ts`

Covers:

- race-safe `skipDuplicates` claim;
- completed same-request replay;
- in-progress classification;
- canonical request conflict;
- fail-closed completion.

### Inventory — 5

`apps/billing-api/src/modules/inventory/repositories/inventory-stock.test.ts`

Covers:

- duplicate target aggregation;
- insufficient stock;
- Variant stock ownership;
- legacy `invoice-finalized` restore compatibility;
- exact Variant restoration.

### Pricing — 5

`apps/billing-api/src/modules/pricing/pricing.service.test.ts`

Covers:

- batched unique Price IDs;
- exact fractional percentage Price Lists;
- custom volume tiers;
- transaction-currency mismatch;
- uncovered tiered quantity.

### Invoice workflows / outbox atomic composition — 5

`apps/billing-api/src/modules/documents/workflows/invoice-workflows.test.ts`

Covers:

- finalize replay before state check;
- finalize Inventory/Ledger/AR/outbox/idempotency composition;
- no finalize/event/completion after Inventory rejection;
- void replay before VOID guard;
- void Inventory restore + event before idempotency completion.

The finalize tests use the parsed Zod output shape (`autoApplyCredits: false`) after the final compile-oriented audit.

### Billing/Storage media orchestration — 5

`packages/billing/src/server/item-media.test.ts`

Covers:

- Item upload policy;
- completed-file owner validation;
- existing-link recovery after partial failure;
- retryable Billing attach failure;
- Variant route/resource identity.

## Public compatibility

The architecture intentionally preserves the current Billing API/resource model.

### Preserved

- existing Item routes;
- existing Item Variant routes;
- existing Item/Variant stock-adjustment route shapes;
- Invoice finalize/void response shapes;
- Billing and Invoice BFF Item-media route behavior;
- existing `@876/billing` resource namespaces;
- existing historical Invoice/stock movement data;
- current Quote/Invoice immutable line snapshots.

### Additive behavior

Invoice finalize/void now optionally honor `Idempotency-Key`.

Callers that do not send the header keep the previous behavior.

### Not exposed

No public SDK types expose:

- `StockTarget`;
- Prisma transaction handles;
- Unit of Work concepts;
- outbox persistence rows;
- command idempotency rows;
- future Order/Channel/Fulfillment namespaces.

## Main/branch concurrency result

The branch was originally cut from `main` at `90c986688ddd4add71fd665592b15722029ebc42`.

During implementation, concurrent Invoice/Billing finance-settings work also appeared in the branch and was later merged into `main`. At final audit, current `main` (`091b8d341bf8d4a93b2f21c6b1dc89f7831218dc`) is the branch merge base and the commercial-platform branch is **ahead with no behind divergence**.

The commercial-platform diff against current `main` is therefore scoped to this architecture work rather than carrying those already-merged finance-settings changes as outstanding diff.

Do not rewrite history to remove already-merged commits from the feature branch. A local agent preparing focused PRs should preserve branch contents and split/cherry-pick deliberately.

## Intentional non-features / deferrals

The following are deliberately **not implemented** by this architecture branch:

- Orders;
- carts/checkouts;
- warehouses;
- stock locations/bins;
- InventoryItem/InventoryLevel resources;
- reservations/committed stock;
- transfers;
- purchase orders/supplier workflows;
- receiving;
- fulfillment/shipments;
- sales channels;
- menus;
- restaurant modifiers/combos;
- tables/seats;
- kitchen tickets/stations;
- marketplace listings/offers;
- inventory costing/FIFO/weighted average;
- an outbox publisher/queue/webhook worker;
- idempotency expiration cleanup/sweeper;
- a generic workflow/state-machine framework.

These are feature work, not missing architecture scaffolding.

## Future insertion points

### Orders

When a real Order feature is approved, add a Billing-owned `orders` bounded module. It should reference canonical Billing Customers/Sellables, resolve price through Pricing, use Billing Engine for totals, and consume/reserve Inventory according to the then-approved lifecycle. Do not create a competing ecommerce catalog.

### Advanced Inventory

Evolve internally from:

```text
Sellable -> StockTarget -> Item/Variant quantity
```

toward:

```text
Sellable
  -> InventoryRequirement
  -> InventoryItem
  -> InventoryLevel
  -> StockLocation
```

Existing callers should continue talking to Inventory rather than Item quantity columns directly.

### Channels

A future Channels domain can make `CommerceContext.channelId` real and feed channel-aware pricing/availability/publishing decisions. No channel tables are justified yet.

### Fulfillment

A future Fulfillment module should consume Order/Inventory contracts and own shipment/pick/pack/fulfillment state. It must not become the owner of Item identity or financial Invoice truth.

### Purchasing

Supplier and purchase-order workflows belong inside the Billing commercial plane when required because they materially affect canonical stock/cost/commercial truth. They are not needed for the current lightweight stock system.

### Restaurant application

Restaurant can own projections/workflows such as:

- menus and sections;
- menu assignments;
- tables/seats;
- dining options;
- kitchen stations/tickets;
- preparation state.

Those projections reference Billing `itemId` + optional `variantId` sellables.

### Store/ecommerce application

Store can own:

- storefront pages;
- collections presentation;
- merchandising;
- SEO;
- theme/navigation;
- listing presentation/search projections.

Canonical product/sellable, price, stock, customer, payment, and financial truth remains Billing-owned.

### Marketplace

Marketplace can own seller publication/moderation/discovery/listing-offer projections while seller Items/Variants remain organization-owned Billing catalog records.

## Intentional compatibility seams remaining

These are not duplicate domain implementations:

1. **Catalog `calculateCatalogAmount` re-export.** Two existing Subscription repositories still import the function through Catalog. The export now forwards directly to Billing Engine; the duplicate Catalog/Documents calculation files were deleted. A focused cleanup can change the two large Subscription imports later without affecting behavior.
2. **Item/Variant quantity columns.** Inventory owns interpretation/mutation, but current physical persistence remains on Item/ItemVariant.
3. **Legacy movement values.** Historical `invoice-finalized`/`invoice-voided` records remain valid; new operations use `sale`/`sale-reversal`.
4. **Existing source attribution shapes.** `CommerceContext`/`ActorContext`/`ResourceOrigin` are available for new workflow seams, but this branch does not force every legacy CRUD call through a new wrapper merely for uniformity.
5. **Credit Note explicit line snapshots.** They remain explicit historical correction inputs rather than being re-resolved from current Catalog/Pricing state.

## Root rule registration note

The new rule is present byte-identically in:

- `.claude/rules/billing-commercial-platform.md`;
- `.agents/rules/billing-commercial-platform.md`.

Both `platform-services.md` mirrors explicitly link to the Billing commercial-platform rule and ADR. Root `CLAUDE.md` was not rewritten solely to add another Required Context bullet; the repository already defines `.claude/rules/` as the canonical rule directory. This closeout records that decision rather than claiming a root-file edit that did not occur.

## Risks / local review points

Because GPT Web cannot execute repository commands, the local agent should pay particular attention to:

1. Prisma generation after adding `CommandIdempotencyKey` and `OutboxEvent`.
2. Type compatibility of the new repository mocks/tests under the generated Prisma client.
3. Dependency-cruiser regex behavior for workflow-to-repository imports.
4. `@876/billing` -> `@876/storage` workspace dependency resolution in all build environments.
5. migration ordering after the Item Variant/media migration.
6. existing database constraint name before applying `20260907230000_billing_commercial_platform`.
7. Billing Engine calculator signatures used by the Pricing resolver and intentional Catalog compatibility re-export.
8. no accidental public contract drift from optional `Idempotency-Key` support.
9. serializable transaction behavior under two concurrent finalize requests for the same last unit of stock.
10. rollback behavior if outbox/idempotency insertion fails after stock/ledger mutations; all are intended to be in the same Prisma transaction.

## Verification status

GPT Web **did not execute**:

- Prisma generation;
- typecheck;
- lint;
- dependency-cruiser;
- Vitest;
- builds;
- database validation/drift checks;
- migration checks;
- API contract checks;
- migrations against any database.

No command is claimed to pass.

## Required local verification

Run from the repository with the intended local/environment configuration:

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

Do **not** blindly run `prisma migrate deploy`. First inspect migration status, target database/environment, and existing constraint/schema state.

## Suggested local-agent review sequence

1. Pull/fetch `feature/billing-commercial-platform-architecture` without rewriting its history.
2. Read root `CLAUDE.md`, the GPT Web rules, this report, and the tracker.
3. Review both new migrations before touching a database.
4. Generate Prisma.
5. Run Billing API typecheck + boundaries first; resolve structural errors before running the broader suite.
6. Run the focused Billing API tests, then full Billing API tests.
7. Run `@876/billing` typecheck/tests to verify the shared Storage port.
8. Run Billing and Invoice app typecheck/tests/build because both BFF media routes now import the shared server helper.
9. Run database validation/drift/migration checks.
10. Exercise an actual finalize/void sequence locally with:
    - a single tracked Item;
    - a tracked Variant;
    - insufficient stock;
    - same Idempotency-Key replay;
    - same key + different command conflict;
    - void restoration;
    - outbox rows present exactly once.
11. Exercise the Item-media partial-failure retry path if a local Storage service is available.
12. Break the branch into focused PRs only during local review if desired; preserve all work and do not silently discard architecture/report/migration commits.

## Completion statement

The requested **architectural implementation** is complete on the branch.

The branch now has the deeper commercial-platform boundaries needed to support future commerce use cases without prematurely implementing those use cases. The remaining work is **local verification and any fixes discovered by that verification**, not an unfinished architecture phase.

No PR was opened.
