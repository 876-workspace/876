# Orchestrator adjustments to the Sales Order plan

**To:** the GPT web run on `feature/billing-commercial-engine`
**From:** the orchestrator, after reviewing `plan.md` and your pushed commits up to
`e47b33eed` (schema, migration `20260913183000_sales_orders`, commercial-line
refactor, and the sales-order errors)
**Binding:** yes. Where this file and `plan.md` disagree, this file wins.
**Pull before your next commit.** Record each adjustment in the plan's decisions
and in your report. Do not rewrite `plan.md` in a way that drops them.

The direction is sound: Sales Orders in Billing, snapshot lines, no Product
rename, no stock consumption, and no speculative channels/fulfillment/carts. The
`commercial-lines` extraction (`buildCommercialLines`) is accepted: it is the one
shared line contract `billing-commercial-platform.md` asks for.

The changes below correct what your schema and plan got wrong.

### Editing the migration in place is correct here

`20260913183000_sales_orders` has not been applied to any database. **Edit that
migration file directly** to match the schema changes below. Do not add a second
corrective migration. Every change must stay additive with respect to `main`.

---

## A1 — Place the Sales Order API code in the existing `documents` module

Quotes, Invoices, Credit Notes and Sales Receipts all live in
`apps/billing-api/src/modules/documents/` (schema, repository folder, workflow,
controller, routes). Sales Orders are a sibling document.

- Add `schemas/sales-order.ts`, `repositories/sales-orders/`,
  `workflows/*-sales-order.ts`, `sales-orders.controller.ts`,
  `sales-orders.routes.ts`, and `sales-orders.service.ts`. Mirror the Sales
  Receipt files.
- Do **not** create `src/modules/sales-orders/` or `src/modules/orders/`.
  `commercial-lines` is the only new top-level module this run needs.

## A2 — Lines come only from `buildCommercialLines`

Use `@/modules/commercial-lines` for create and draft update. Input contract:
`DocumentLineCreateSchema` (`documents/schemas/document-line.ts`). If you find
yourself writing subtotal/tax/discount arithmetic, you took a wrong turn. Stop
and report it.

## A3 — Cut the status model down to what this phase can actually write

`plan.md` defines three stored status axes. Two of them have no writer here:

- **Payment status:** payments allocate to **invoices** (`payment-allocation.prisma`).
  Nothing in this phase allocates money to an order, so a stored `paymentStatus`
  would stay `unpaid` forever or be set by hand, which is a false financial record.
- **Fulfillment status:** the Fulfillment domain is explicitly deferred. A
  stored column with no fulfillment behavior is the speculative persistence
  `billing-commercial-platform.md` forbids.

Adjusted model:

| Field             | Stored?         | Values (wire)                                 | Source                                                                                                                               |
| ----------------- | --------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `status`          | yes             | `draft`, `confirmed`, `completed`, `canceled` | lifecycle commands                                                                                                                   |
| `invoicingStatus` | **no, derived** | `not-invoiced`, `invoiced`                    | whether a non-void invoice references the order                                                                                      |
| `paymentStatus`   | **no, derived** | `unpaid`, `partially-paid`, `paid`            | the linked invoice's status (`OPEN/SENT/OVERDUE` → unpaid, `PARTIALLY_PAID` → partially-paid, `PAID` → paid). Null when not invoiced |

- Drop `pending` and `processing`. No actor in this phase tells them apart from
  `confirmed`: `pending` means awaiting checkout payment (deferred), and
  `processing` means fulfillment (deferred).
- Drop stored `fulfillmentStatus` completely. Name this deferral in your report.
- Derive the two statuses in the serializer or service from a **batched** join.
  Lists must not issue one invoice lookup per row.

Allowed transitions, each its own command route. There is no status patch:

```
draft      --confirm-->  confirmed
draft      --cancel-->   canceled
confirmed  --cancel-->   canceled    only when no non-void invoice references it
confirmed  --complete--> completed
```

Every other transition returns a registered conflict error. Write a test per
arrow plus at least one illegal transition from each state.

## A4 — Editing

- `update` (PATCH) is allowed **only in `draft`**. It may replace lines, and
  replaced lines are re-resolved through `buildDocumentLines`.
- A `confirmed`, `completed` or `canceled` order's lines and totals are
  immutable. An update attempt returns a registered conflict error.
- Never hard-delete an order that is not a draft. Deleting a draft follows the
  existing draft-quote delete behavior, if one exists. If none does, do not add
  delete in this phase.

## A5 — Conversions follow the existing precedent exactly

Existing routes: `POST /quotes/:quoteId/convert-to-invoice` and
`POST /quotes/:quoteId/convert-to-sales-receipt`. The target carries
`quoteId String? @unique`.

- **Quote → Sales Order:** `POST /quotes/:quoteId/convert-to-sales-order`, with
  `quoteId String? @unique` on the sales order. Reuse the quote transition
  workflow (`workflows/transition-quote.ts`) for the quote side. Do not fork it.
  Before assuming the quote status gate, read what `convert-to-invoice` requires
  (e.g. `ACCEPTED`).
- **Sales Order → Invoice:** `POST /sales-orders/:salesOrderId/convert-to-invoice`.
  - Add a nullable `salesOrderId` to `Invoice` with a **non-unique** index,
    **not** `@unique`. Partial invoicing is a likely next phase, and a unique
    constraint would need a destructive migration to undo.
  - Enforce "at most one non-void invoice per order" in the workflow, inside the
    transaction, and return a registered conflict when violated.
  - Copy the order's **line snapshots** onto the invoice lines. Do not re-resolve
    live prices, because the invoice must bill what the customer agreed to.
  - Use a new `InvoiceBillingReason` value `SALES_ORDER` (enum stays UPPER in
    Prisma, per the physical-schema rule), mirroring `QUOTE`.
  - Converting requires `confirmed`. It does not auto-complete the order.
- A voided invoice frees the order for re-invoicing. Test that.

## A6 — Numbering

Extend `DocumentType` (`prisma/schema/enums.prisma`) with `SALES_ORDER` and
allocate numbers through the existing `document-numbers.repository.ts` inside the
creation transaction, exactly like Sales Receipts. Find the prefix convention in
the document preferences/sequence code, and use `SO-` only if that is where
prefixes come from. Do not invent a second numbering path.

## A7 — Wire naming and errors

The documents v1 family uses camelCase fields, a snake discriminator
(`sales_receipt`) and UPPER status values (`'PAID' | 'VOID'`). Those are legacy
contracts, and `naming.md` / `stripe-api-pattern.md` forbid copying them into a
**new** resource.

- `object: 'sales-order'` (and `'sales-order-line'` if lines carry one).
- Wire status values are lowercase kebab. Prisma enums stay UPPER and are mapped
  in the serializer.
- Fields are camelCase. Money amounts are strings, like Sales Receipts.
- Your registered errors in `packages/core/src/lib/errors/billing.ts` are
  accepted, with two changes:
  - `billing/sales-order-invalid-state` covers illegal transitions and edits of
    non-draft orders. Do not add separate codes for those.
  - Add `billing/sales-order-already-invoiced` for the second-invoice conflict
    (A5).
  - `billing/sales-order-conflict` says "number already exists", but numbers are
    server-allocated (A6). Remove it unless a real path produces it.
- Record in your report that this resource intentionally differs from its v1
  siblings.

## A8 — Required schema corrections (`sales-order.prisma` + migration)

Compare against `sales-receipt.prisma` / `sales-receipt-line.prisma`. Fix every
item below:

1. **Tenant isolation bug:** `customer` relates on `[customerId] → [id]`. It must
   be the tenant-composite
   `fields: [tenantId, customerId], references: [tenantId, id]`, exactly as
   Sales Receipt does, with the FK in the migration changed to match. Otherwise a
   row can point at another tenant's customer.
2. Add `@@unique([tenantId, id], map: "billing_sales_orders_tenant_id_id_key")`.
3. **Remove** `paymentStatus`, `fulfillmentStatus`, both of their enums and their
   indexes. **Remove** `PENDING`, `PROCESSING` and `processingAt` (A3).
4. Add `quoteId String? @unique @map("quote_id")` with a relation named
   `"QuoteConvertedSalesOrder"` (`ON DELETE SET NULL`), matching Sales Receipt's
   quote relation.
5. Add the provenance/idempotency columns and unique keys Sales Receipt has:
   `sourceAppId`, `sourceExternalReference`, `sourceIdempotencyKey`,
   `sourcePayloadHash`. A Store/POS will create orders from another app. Do
   **not** add integration routes in this phase.
6. Add the snapshots: `customerName`, `customerEmail`,
   `billingAddressSnapshot Json?`, `shippingAddressSnapshot Json?`,
   `referenceNumber`, `taxBehavior TaxBehavior @default(EXCLUSIVE)`, and
   `salespersonId`/`salespersonName` with the tenant-composite Salesperson
   relation. An ecommerce order without a shipping address snapshot is useless.
7. **Lines are missing the tax snapshot and ordering** that Sales Receipt and
   Invoice lines carry: `position Int @default(0)`, `taxRateId`
   (+ `sourceTaxRate` relation, SET NULL), `taxName`,
   `taxRate Decimal? @db.Decimal(7,4)`, `taxInclusive Boolean @default(false)`.
   Without them, Order → Invoice (A5) cannot copy what was agreed. If
   `CommercialLineSnapshot` lacks those fields, read how Sales Receipt lines get
   them and use the same source. Do not compute tax separately.
8. Replace the `[tenantId, status]` index with
   `[tenantId, status, orderedAt]` and add `[tenantId, customerId, orderedAt]`,
   matching the list access patterns. Make `orderedAt` non-null, set at create.
9. Add `SALES_ORDER` to `DocumentType`, and `SALES_ORDER` to
   `InvoiceBillingReason`. Add nullable `salesOrderId` on `Invoice` with a
   **non-unique** index and FK `ON DELETE SET NULL` (A5). Put each
   `ALTER TYPE … ADD VALUE` on its own statement, and do not use the new value
   elsewhere in the same migration.

## A9 — Idempotency for create

Sales Receipt commands use `optionalCommandIdempotency` from
`src/http/command-idempotency` in `sales-receipts.controller.ts`. Sales Order
**create**, the lifecycle commands, and **convert-to-invoice** use the same helper
the same way. Do not write a new hashing or replay path.

## A10 — No events in this phase

Do not add `sales-order.*` outbox events. Nothing consumes them yet, and the
architecture forbids inventing events for integrations that do not exist. Note
it as a follow-up.

## A11 — Access, modules, navigation (Phase 5)

- Add the canonical module identity `salesOrders: { key: 'sales-orders', … }` to
  `packages/core/src/modules.ts` and include it in the **Billing** registry only.
  Do not add it to the Invoice registry: `finance-app-parity.md` allows
  Billing-only capabilities.
- Find how the Billing permission catalog is derived from modules. Start from
  `packages/core/src/access/catalogs.billing-invoice.test.ts`. Add
  `sales-orders.view` and `sales-orders.edit` there, and **name the roles that
  are granted them**. A permission nothing grants hides the page.
- Add a Sales Orders nav entry in `packages/billing/src/navigation.ts` under
  Sales, between Quotes and Invoices, requiring `sales-orders.view`. Add the
  matching route guard. The registry-to-route binding test must still pass.
- UI routes live at `apps/billing/src/app/(app)/(sales)/sales-orders/`. Copy the
  **Quotes** section's structure (list/detail split, `new`, `[id]/edit`), and use
  the shared `DocumentLineItemsEditor` from `@876/billing-ui`. Do not build a
  second line editor.
- Browser mutations go through Billing's existing product-owned `/api/...` route
  pattern. Find how Sales Receipts reach the API from the Billing app and mirror
  it. Do not add a new proxy style.

## A12 — SDK (Phase 3)

Add `packages/billing/src/resources/sales-orders.ts`, mirroring
`resources/sales-receipts.ts`, and register it in `client.ts` for the entrypoint
Sales Receipts use. Verbs: `create`, `retrieve`, `list`, `update`, `confirm`,
`cancel`, `complete`, `convertToInvoice`. `list` accepts `status` and
`customerId` filters, which the API must implement server-side, plus the cursor
params Sales Receipts use. Add the quote conversion to the quotes resource
(`convertToSalesOrder`) next to its existing convert methods.

Add nothing to `packages/billing/src/integration/client.ts` in this phase.

## A13 — Update the architecture record

Orders move from reserved to implemented, so in the same run:

- `docs/architecture/013-billing-commercial-platform.md`: take "Orders" out of the
  reserved and deferred lists and describe what exists. Carts, checkout,
  reservations, fulfillment and channels stay deferred.
- `.claude/rules/billing-commercial-platform.md` **and** the byte-identical
  `.agents/rules/billing-commercial-platform.md`: change the "Reserved future
  boundaries" line the same way. Commit documentation separately from code.

## A14 — Test floors (counted `it()` cases, per phase)

| Phase         | Floor | Must include                                                                                                                                                                                                                               |
| ------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1 persistence | 4     | migration file present and ordered; serializer maps every enum value                                                                                                                                                                       |
| 2 API         | 30    | every transition arrow and illegal transitions; draft-only update; tenant isolation (another tenant's order → 404); Supertest route auth; list filter by status is server-side; batched derived status (one query regardless of row count) |
| 3 SDK         | 10    | endpoint paths, params, malformed response rejection per verb                                                                                                                                                                              |
| 4 conversions | 12    | quote gate; duplicate quote conversion; order → invoice copies snapshots not live price; second invoice blocked; void invoice re-enables; derived payment status per invoice state                                                         |
| 5 host        | 10    | nav binding; guard denies without `sales-orders.view`; list chrome renders while data loads; error keeps toolbar mounted                                                                                                                   |

Check each package's `vitest.config.ts` environment before writing component
tests.

## A15 — Scope order if you run short

Deliver phases **in order** and stop cleanly between phases. A finished 1–4 with
an honest note that 5 is not started beats a half-built UI. Update the
`plan.md` handoff state at every stopping point.
