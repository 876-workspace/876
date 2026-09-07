# GPT Web Final Report — Billing + Invoice Item Stock Tracking

**Run ID:** `2026-09-07-item-stock-tracking`  
**Branch:** `feature/item-stock-tracking`  
**Base:** `main` at `2e9997b992e88ecc0a5a1f749c53e3fccca8a64f`  
**Implementation status:** COMPLETE — LOCAL VERIFICATION REQUIRED  
**PR status:** No PR was created or authorized.

## Executive summary

This run adds lightweight stock tracking to the existing shared Billing/Invoice `Item` domain without introducing an Inventory application, warehouse subsystem, purchasing subsystem, or fulfillment subsystem.

The Billing API remains the sole writer and owner of stock state. Billing and Invoice consume the same Item records, SDK contracts, and shared `@876/billing-ui` stock presentation.

Implemented behavior:

- Goods may opt into stock tracking; Services may not.
- Tracked Goods carry `stockQuantity`, `lowStockThreshold`, and `allowOutOfStock`.
- Opening stock may be supplied when a tracked Good is created.
- Current quantity cannot be rewritten through generic Item update; manual changes go through a dedicated stock-adjustment operation.
- Manual count changes are recorded as immutable movements.
- Invoice draft creation performs an advisory availability check but does not reserve or decrement stock.
- Quotes never block on stock and never consume stock.
- Invoice finalization aggregates duplicate Item lines, re-checks availability, decrements stock, records one movement per tracked Item, and performs the stock work inside the same serializable transaction as invoice/AR/ledger finalization.
- `allowOutOfStock=false` blocks finalization that would take stock negative; `true` permits negative counts.
- Voiding an eligible finalized invoice restores the exact quantity recorded by that invoice's finalization movements, also inside a serializable transaction.
- Billing and Invoice both show stock state, stock status, low-stock threshold, out-of-stock policy, and a focused stock-adjustment route.
- Both invoice editors receive the same stock metadata and client-side advisory validation; the Billing API remains authoritative.

## Architectural decisions

### Item remains the owner

No `inventory` module or app was introduced. This capability belongs to the existing Item/catalog domain because the requested scope is a single shared count and sales-time guard, not warehouse inventory management.

### Integer quantity only

Stock quantities are `Int` because document line quantities are currently integer values. Fractional inventory would require a coordinated document quantity migration and is deliberately out of scope.

### Dedicated adjustment path

Once an Item exists, `stockQuantity` is omitted from generic update contracts. Manual quantity changes use:

- tenant route: `POST /items/:itemId/stock-adjustments`
- integration route: `POST /integrations/organizations/:organizationId/items/:itemId/stock-adjustments`

The operation accepts the absolute new quantity, derives the delta, updates the Item, and writes a `manual-adjustment` movement atomically.

### Drafts do not reserve

Invoice drafts do not reserve or decrement stock. The UI and draft-create path can report insufficient stock early, but finalization is the authoritative check because stock may change after a draft was created.

### Quotes are non-binding

Quotes carry stock metadata only for useful catalogue context. `enforceItemStock` is enabled only for invoice editors. Quote creation and quote lifecycle transitions do not consume or block on stock.

### Finalization is the stock-consumption point

Invoice finalization aggregates duplicate lines by `itemId`, queries tracked Goods, validates policy, decrements the count, and writes one `invoice-finalized` movement per Item. The work occurs inside the existing serializable finalization transaction so stock, invoice state, AR, and ledger changes succeed or roll back together.

### Void restores recorded movement, not reconstructed document intent

Void reads the immutable `invoice-finalized` movements and reverses the exact recorded deltas. This avoids guessing from a later Item configuration or recomputing from potentially changed catalogue state.

### Disabling tracking preserves the last count

For a Good, disabling tracking preserves the dormant `stockQuantity` so re-enabling can resume from the last count. The API clears `lowStockThreshold` and forces `allowOutOfStock=false` when tracking is disabled. Converting the Item to a Service clears all stock semantics, including the count.

### Credit notes do not restock

A financial credit does not prove that physical goods were returned. Credit notes therefore do not automatically alter stock in this phase.

## Database changes

### Item fields

`billing_items` gains:

- `track_stock BOOLEAN NOT NULL DEFAULT FALSE`
- `stock_quantity INTEGER NULL`
- `low_stock_threshold INTEGER NULL`
- `allow_out_of_stock BOOLEAN NOT NULL DEFAULT FALSE`

Database constraints ensure:

- low-stock threshold is non-negative when present;
- tracked Items always have a quantity;
- only `GOOD` Items can be tracked.

### Stock movement ledger

New table: `billing_item_stock_movements`

Movement types in this phase:

- `initial-stock`
- `manual-adjustment`
- `invoice-finalized`
- `invoice-voided`

The unique reference index makes invoice movement creation idempotent per tenant, Item, movement type, and invoice reference while still allowing multiple manual adjustments because their reference is null.

## Complete migration SQL

```sql
ALTER TABLE "billing_items"
  ADD COLUMN "track_stock" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN "stock_quantity" INTEGER,
  ADD COLUMN "low_stock_threshold" INTEGER,
  ADD COLUMN "allow_out_of_stock" BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE "billing_items"
  ADD CONSTRAINT "billing_items_low_stock_threshold_check"
    CHECK ("low_stock_threshold" IS NULL OR "low_stock_threshold" >= 0),
  ADD CONSTRAINT "billing_items_tracked_stock_quantity_check"
    CHECK (NOT "track_stock" OR "stock_quantity" IS NOT NULL),
  ADD CONSTRAINT "billing_items_stock_good_check"
    CHECK (NOT "track_stock" OR "type" = 'GOOD');

CREATE TABLE "billing_item_stock_movements" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "item_id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "quantity_delta" INTEGER NOT NULL,
  "quantity_before" INTEGER NOT NULL,
  "quantity_after" INTEGER NOT NULL,
  "reference_type" TEXT,
  "reference_id" TEXT,
  "note" TEXT,
  "created_by" TEXT,
  "created_at" INTEGER NOT NULL,

  CONSTRAINT "billing_item_stock_movements_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_item_stock_movements_item_id_fkey"
    FOREIGN KEY ("item_id") REFERENCES "billing_items"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_item_stock_movements_type_check"
    CHECK ("type" IN ('initial-stock', 'manual-adjustment', 'invoice-finalized', 'invoice-voided'))
);

CREATE UNIQUE INDEX "billing_item_stock_movements_reference_key"
  ON "billing_item_stock_movements"("tenant_id", "item_id", "type", "reference_id");

CREATE INDEX "billing_item_stock_movements_item_created_idx"
  ON "billing_item_stock_movements"("tenant_id", "item_id", "created_at");

CREATE INDEX "billing_item_stock_movements_reference_idx"
  ON "billing_item_stock_movements"("tenant_id", "reference_type", "reference_id");
```

The migration is additive for existing Items: existing rows receive `track_stock=false` and `allow_out_of_stock=false`; `stock_quantity` and `low_stock_threshold` remain null until tracking is configured.

## Implementation map

### Prisma and migration

- `apps/billing-api/prisma/migrations/20260907190000_item_stock_tracking/migration.sql`
- `apps/billing-api/prisma/schema/item.prisma`
- `apps/billing-api/prisma/schema/item-stock-movement.prisma`
- `apps/billing-api/src/platform/ids.ts`

### Billing API — Item stock ownership

- `apps/billing-api/src/modules/catalog/schemas/item.ts`
- `apps/billing-api/src/modules/catalog/catalog.schemas.ts`
- `apps/billing-api/src/modules/catalog/catalog.routes.ts`
- `apps/billing-api/src/modules/catalog/item-stock.controller.ts`
- `apps/billing-api/src/modules/catalog/item-stock.service.ts`
- `apps/billing-api/src/modules/catalog/repositories/items/create.ts`
- `apps/billing-api/src/modules/catalog/repositories/items/update.ts`
- `apps/billing-api/src/modules/catalog/repositories/items/adjust-stock.ts`
- `apps/billing-api/src/modules/catalog/repositories/items/stock.ts`
- `apps/billing-api/src/modules/catalog/repositories/items/index.ts`
- `apps/billing-api/src/modules/catalog/repositories/result.ts`
- `apps/billing-api/src/modules/catalog/index.ts`
- `packages/core/src/lib/errors/billing.ts`

### Invoice lifecycle

- `apps/billing-api/src/modules/documents/repositories/invoices/create.ts`
- `apps/billing-api/src/modules/documents/repositories/invoices/finalize.ts`
- `apps/billing-api/src/modules/documents/repositories/invoices/void.ts`
- `apps/billing-api/src/modules/documents/repositories/result.ts`
- `apps/billing-api/src/modules/documents/documents.service.ts`

Finalization and void both use serializable transactions. Retryable transaction conflicts return a 409 rather than silently accepting a stale stock count.

### Shared SDK/contracts

- `packages/billing/src/integration/types/item.ts`
- `packages/billing/src/integration/types/item.schema.ts`
- `packages/billing/src/integration/types/index.ts`
- `packages/billing/src/integration/resources/items.ts`
- `packages/billing/src/resources/items.ts`

The shared Item resource exposes stock state. Generic update deliberately omits `stockQuantity`; dedicated `adjustStock` methods own manual count changes.

### Shared finance UI

- `packages/billing-ui/src/item-stock.ts`
- `packages/billing-ui/src/item-stock-summary.tsx`
- `packages/billing-ui/src/item-stock-adjustment-form.tsx`
- `packages/billing-ui/src/items-table.tsx`
- `packages/billing-ui/src/document/document-line-items-editor.tsx`
- `packages/billing-ui/package.json`

Stock presentation states are `not-tracked`, `in-stock`, `low-stock`, and `out-of-stock`. The document editor aggregates duplicate selected Item lines before advisory invoice validation.

### 876 Billing host

- Item create/edit forms expose Good-only stock settings.
- Item list/table includes Stock.
- Item detail renders the shared stock summary.
- `/items/[itemId]/stock` provides focused manual adjustment.
- New Invoice passes stock metadata and enables invoice-only stock validation.
- New Quote passes metadata but does not enforce stock.
- The generic create/edit form gained declarative `visibleWhen` support so hidden Good-only stock fields are not submitted.

Affected paths include:

- `apps/billing/src/app/(app)/items/**`
- `apps/billing/src/components/patterns/create-form.tsx`
- `apps/billing/src/types/form.ts`
- `apps/billing/src/types/item.ts`
- `apps/billing/src/lib/client/items.ts`
- `apps/billing/src/features/documents/components/document-create-form.tsx`
- `apps/billing/src/app/(app)/(sales)/invoices/new/page.tsx`
- `apps/billing/src/app/(app)/(sales)/quotes/new/page.tsx`

### 876 Invoice host

- Item create/edit exposes the same stock policy.
- Item list/detail shows stock from the same Billing Item record.
- `/items/[itemId]/stock` uses the shared adjustment form.
- New Invoice carries stock metadata and enables invoice-only validation.
- New Quote carries metadata without enforcing availability.

Affected paths include:

- `apps/invoice/src/app/(app)/items/**`
- `apps/invoice/src/lib/client/items.ts`
- `apps/invoice/src/features/documents/components/document-create-form.tsx`
- `apps/invoice/src/app/(app)/invoices/new/page.tsx`
- `apps/invoice/src/app/(app)/quotes/new/page.tsx`

## Error contracts

Added stable Billing errors:

- `billing/item-insufficient-stock`
- `billing/item-stock-not-tracked`

Repository `ServiceResult` errors can now carry a stable code through the service layer so API clients receive the canonical registered error rather than a generic invoice conflict.

## Integration ownership

The integration stock-adjustment route uses the existing source-app ownership boundary before mutation. An integration cannot use the adjustment operation to mutate another product app's Item merely because it knows the Item ID.

## Test coverage authored

Fifteen focused test cases were added in three files:

### `apps/billing-api/src/modules/catalog/schemas/item.stock.test.ts` — 5 cases

1. tracked Good configuration is accepted;
2. Service stock tracking is rejected;
3. opening quantity without tracking is rejected;
4. generic Item update rejects `stockQuantity`;
5. signed manual adjustment input is accepted so Item policy can decide whether negative stock is legal.

### `apps/billing-api/src/modules/catalog/repositories/items/stock.test.ts` — 5 cases

1. duplicate invoice lines aggregate into one decrement/movement;
2. aggregated oversell is rejected without writes;
3. explicit out-of-stock policy permits negative stock;
4. service/untracked lines produce no stock writes;
5. void restoration uses the exact recorded finalization delta.

### `packages/billing-ui/src/item-stock.test.ts` — 5 cases

1. Services are not tracked;
2. Goods with tracking disabled are not tracked;
3. positive count above threshold is in stock;
4. count at threshold is low stock;
5. zero/negative count is out of stock.

These tests were authored but **not executed by GPT Web**.

## Static review findings resolved during this run

- Billing invoice editor initially lacked the stock metadata already wired in Invoice; parity was completed.
- Billing quote options now preserve the same metadata while remaining non-enforcing.
- Invoice void originally restored stock in the default transaction isolation level; it was upgraded to serializable isolation with retryable-conflict handling to avoid racing a manual adjustment/finalization.
- Disabling stock tracking had host-specific behavior; the rule is now centralized in Billing API.
- An SDK edit accidentally removed existing Item contract documentation; that documentation was restored and the final diff contains only intended contract additions.
- A test matcher was normalized to `toHaveBeenCalledTimes(1)` for portable Vitest behavior.
- Latest `main` was re-read before final reporting and remained at the branch base; the implementation branch was 17 commits ahead and 0 behind before this report commit.

## Implementation commits before this report

- `2f1e44d40ae6b59ed9c63d18397d73a021e6f82b` — plan/tracker
- `57aee13d613cff0115fcd8c28e6fcb8440ee0ace` — Item stock state, movement ledger, migration
- `cf7edb308e3e0acbd632fa9ebab917cdbf1f7531` — invoice stock lifecycle
- `cb0a60a1293484058207c61ccff4d6a40104fa3f` — shared SDK/client contracts
- `0073fce7843e4e9cbace49121e466ebe410ac50b` — shared stock UI
- `63e24a1b0337b1bffb1972b4223daad185e3c09f` — Billing/Invoice Item host surfaces
- `d56e8d4efadbf5c5fff0bfae718d68c06ecee171` — Invoice editor advisory validation
- `0ad51fa37772a6b8d5ce21e2848be8c239aea059` — Billing invoice stock metadata
- `bffbf1690d13fe8cba4dec29c42ccd0dc6f2682a` — Billing quote stock metadata
- `ff525bd5a7abfb23be1bd4cadb7dad02e93516c6` — Billing invoice-editor advisory validation
- `b47c2382755f6cb28fd3b066f929d7ba558e28a4` — serializable invoice-void stock restoration
- `8e4b7ef21be78a062ae2f24d7a99226218e621ed` — shared UI stock tests
- `c42cb81b13684a9996844c6ee66f782701df0abb` — API stock schema tests
- `baa360e16ce6ae83c6ae23f9f04b1683d2edaaff` — stock repository lifecycle tests
- `4f98970cc11a716ac51de0c8dd2be827b53b09b4` — preserve SDK Item documentation
- `8ef69ce44a04711fe9b72229a4a9a03a4c46d04c` — centralize tracking-disable policy
- `9bd3c4cdfafadc027c974fa1fe9f8361a6055bc9` — portable Vitest call-count matcher

## Local verification required

GPT Web did not run shell commands, package scripts, migrations, tests, typechecks, lint, builds, Prisma generation, or database operations. The local orchestrator must verify the branch before merge.

Run from repository root:

```bash
pnpm --filter @876/billing-api generate
pnpm --filter @876/billing-api typecheck
pnpm --filter @876/billing-api lint
pnpm --filter @876/billing-api boundaries
pnpm --filter @876/billing-api test
pnpm --filter @876/billing-api build
pnpm --filter @876/billing-api db:validate
pnpm --filter @876/billing-api db:drift
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

node scripts/check-app-structure.mjs
```

Also review migration status in the target environment before applying it. GPT Web did **not** run `prisma migrate deploy` and did **not** modify any database.

## Manual behavior checks after migration

1. Create a Service and confirm stock controls are unavailable/not tracked.
2. Create a tracked Good with opening stock and threshold; verify Item list/detail show the same count in Billing and Invoice.
3. Adjust the count in Billing, refresh Invoice, and confirm the same count appears; repeat in the opposite direction.
4. Create a draft invoice with duplicate lines for one Item and verify the editor aggregates their quantity for advisory validation.
5. Confirm a Quote with quantity above current stock can still be saved.
6. With `allowOutOfStock=false`, attempt to finalize an invoice whose aggregate quantity exceeds stock and confirm finalization is rejected without a stock decrement.
7. With enough stock, finalize and confirm exactly one decrement movement exists per tracked Item.
8. With `allowOutOfStock=true`, finalize beyond stock and confirm the count can become negative.
9. Void an eligible unsettled invoice and confirm the exact finalization quantity is restored.
10. Disable tracking on a Good and confirm its count is dormant while threshold/out-of-stock policy are cleared; re-enable and confirm the count resumes.
11. Convert a Good to a Service and confirm all stock semantics are cleared.
12. Exercise an integration-owned Item and confirm another app identity cannot adjust its stock.

## Known limits / deliberately deferred work

- No warehouses or per-location balances.
- No reservations or committed/available stock split.
- No fulfillment/shipment event model.
- No purchase orders, goods receipts, suppliers, or incoming stock workflow.
- No transfers, cycle counts, serials, lots, batches, expiry, or damaged-stock states.
- No FIFO/weighted-average costing or inventory valuation ledger.
- No fractional stock quantities.
- No automatic restocking from credit notes.
- No dedicated inventory dashboard/navigation/product entitlement.
- No live database migration was applied by GPT Web.
- No real concurrent database test was executed here; concurrency safety is implemented through serializable transaction boundaries and retryable conflict handling and must be verified locally.
- Draft stock validation is intentionally non-reserving and therefore can become stale; finalization always re-checks authoritatively.

## Handoff

The code implementation is complete for the requested lightweight scope. The local agent should pull `feature/item-stock-tracking`, run the verification suite above, inspect any generated Prisma/API contract differences, apply the migration only through the repository's normal deployment process, and preserve the documented module boundaries.

Do not expand this work into warehouses/full Inventory while reviewing this branch. Any such expansion should be a separate architectural phase.
