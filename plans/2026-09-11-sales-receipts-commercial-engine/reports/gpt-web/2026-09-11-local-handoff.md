# Local Handoff — Sales Receipts Commercial Engine

**Run:** `2026-09-11-sales-receipts-commercial-engine`  
**Branch:** `feat/sales-receipts-commercial-engine`  
**Base:** `main`  
**Handoff date:** 2026-09-11  
**Status:** IN PROGRESS — substantially implemented, but not merge-ready until local verification and the remaining correctness items are closed  
**Code snapshot immediately before this handoff update:** `a5691bddd1c4145ceb7c1dbc15711c9a83cb9043` (`plans: resync sales receipt implementation tracker`)  
**Base / merge-base snapshot:** `b864b752f909ead27fa30c9c2b04c8681b3a2346`  
**Branch comparison immediately before this handoff update:** **157 commits ahead of `main`, 0 behind**  
**PR:** none opened

## Read this first

This report supersedes the earlier handoff state in this same file. The branch has moved materially forward since the first handoff.

The tracker has also now been reconciled with the actual branch and is useful again:

- `plans/2026-09-11-sales-receipts-commercial-engine/plan.md`
- `plans/2026-09-11-sales-receipts-commercial-engine/tracker.md`
- this report

Before continuing locally, re-read the binding repository rules listed in `plan.md`, especially the root `CLAUDE.md`, GPT Web operating rules, finance-app parity, Billing data-plane/commercial-platform rules, SDK conventions, Express/API rules, app structure/layout, testing, naming/types/error handling, and git rules.

No executable verification was run from GPT Web. Treat every compile/test/build/migration claim as **unverified until run locally**.

---

# 1. Executive state

Sales Receipts are now implemented as a first-class Billing commercial primitive rather than an Invoice shortcut.

The intended economic model is preserved:

```text
Intent
  Quote / Subscription / Estimate

Credit sale
  Invoice -> Accounts Receivable -> later settlement

Immediate paid sale
  Sales Receipt -> settled Payment + bank evidence immediately
```

A Sales Receipt creation does **not** create:

```text
Invoice
Accounts Receivable
PaymentAllocation
PAYMENT_RECEIVED customer-ledger credit
unused customer credit
```

The linked `Payment` exists as durable cash/banking/provider evidence. Its `unappliedAmount` is zero, and the ordinary Payments Received resource intentionally excludes Sales-Receipt-owned Payments.

The branch now has working implementation slices across:

- Prisma persistence and additive migration;
- Sales Receipt numbering and IDs;
- settled-payment recording and reversal seams;
- atomic create workflow;
- list/retrieve APIs;
- void/correction workflow;
- partial stock-return primitive;
- atomic Credit Note + Refund Sales Receipt refund workflow;
- tenant and integration API routes;
- dedicated OAuth scopes;
- `@876/billing` tenant + integration SDK resources;
- customer Transactions integration;
- shared Billing/Invoice list UI;
- real Billing and Invoice Sales Receipt detail pages;
- **New Sales Receipt** forms in both Billing and Invoice;
- Invoice same-origin Sales Receipt proxy/client boundary;
- amount-only Sales Receipt refund pages in both hosts;
- shared Refund + Void lifecycle actions;
- derived correction/refund projection fields;
- accounting-model documentation;
- request/client tests added, though not executed.

---

# 2. Non-negotiable architectural invariants

Preserve these while finishing the branch.

## 2.1 Billing owns the truth

Billing API is the canonical resource owner.

Do not create:

- an Invoice-app Sales Receipt model;
- a second Sales Receipt payment model;
- app-local accounting rules;
- a second totals calculator;
- app-local inventory mutations.

Billing and Invoice are hosts over the same Sales Receipt IDs and records.

## 2.2 Sales Receipt is not a paid Invoice

Do not implement Sales Receipt by creating/finalizing an Invoice and immediately allocating a Payment.

That would create unnecessary AR and then settle it, pollute statement/ledger semantics, and make future POS/retail use cases depend on invoice lifecycle.

## 2.3 Embedded Payment is not Payments Received

The linked Payment must remain distinct from ordinary customer Payments Received.

Sales Receipt payment invariants:

```text
amount = SalesReceipt.totalAmount
unappliedAmount = 0
invoiceAllocations = []
```

It must not post the ordinary `PAYMENT_RECEIVED` customer-ledger credit.

The current Payments repository excludes Sales-Receipt-owned Payments from the normal payment list/retrieve/update/apply/cancel paths. Preserve that separation.

## 2.4 Credit Note and Refund remain separate facts

For real returns/refunds:

```text
Sales Receipt
    -> Credit Note     economic/value correction
    -> Refund          cash leaves business
```

The Sales Receipt refund workflow composes those two existing primitives atomically.

Do not collapse returned value and cash movement into Sales Receipt amount fields.

## 2.5 Void is not Refund

`VOID` means the original immediate sale was entered incorrectly.

Void reverses:

- settled Payment evidence;
- matched bank evidence;
- original inventory sale movement;
- the Sales Receipt financial state.

It does not manufacture AR activity.

A receipt with return/refund evidence cannot be voided.

## 2.6 Physical stock restoration is explicit

A monetary credit/refund does not automatically imply every physical item was returned.

The Inventory partial-return primitive restores only explicitly requested item/variant quantities and prevents cumulative over-return.

The current product refund form intentionally performs **amount-only refunds** and submits `returnLines: []` until a proper returned-line quantity editor is built.

---

# 3. Persistence and migration

## Added persistence

Key files:

```text
apps/billing-api/prisma/schema/sales-receipt.prisma
apps/billing-api/prisma/schema/sales-receipt-line.prisma
apps/billing-api/prisma/migrations/20260911120000_sales_receipts_commercial_engine/migration.sql
```

The model includes the canonical immediate-sale relationships:

- tenant;
- customer;
- optional source Quote;
- one linked Payment;
- optional salesperson snapshot;
- optional price-list snapshot;
- immutable Sales Receipt lines;
- Credit Notes;
- totals/currency/receipt date;
- source app/integration attribution;
- void metadata.

Financial status is intentionally:

```text
PAID
VOID
```

There is no persisted `DRAFT` or `SENT` Sales Receipt financial status.

Communication state should remain independent if/when sending is added.

## Related Prisma changes

Relations were added/updated on:

- `Payment`
- `Quote`
- `CreditNote`
- `Customer`
- `Tenant`
- `Item`
- `ItemVariant`
- `Price`
- `PriceList`
- `TaxRate`
- `Salesperson`

`DocumentType.SALES_RECEIPT` and Sales Receipt status values were added to the enum schema.

## Migration policy

The migration is additive.

It does **not**:

- rewrite existing Invoices;
- convert historical paid Invoices into Sales Receipts;
- reclassify historical Payments;
- delete financial evidence.

The migration has **not been executed or Prisma-validated by GPT Web**.

Local verification must include schema validate/drift and migration testing against an appropriate test/local database.

---

# 4. IDs and numbering

Sales Receipt IDs use the canonical platform ID generator.

Conceptually:

```text
SalesReceipt      -> sr_...
SalesReceiptLine  -> srl_...
```

Document numbering joins the existing centralized sequence owner:

```text
DocumentType.SALES_RECEIPT
SR-000001
```

`apps/billing-api/src/modules/documents/__tests__/document-numbers.test.ts` was updated, but the test was not run.

---

# 5. Payment architecture

The most important backend refactor was separating durable cash evidence from A/R semantics.

## New settled-payment seam

Key files:

```text
apps/billing-api/src/modules/payments/settled-payment.ts
apps/billing-api/src/modules/payments/settled-payment-reversal.ts
apps/billing-api/src/modules/payments/repositories/payments/shared.ts
```

The shared seam owns reusable payment/bank behavior without forcing customer-ledger semantics.

Ordinary Payments Received still performs its existing workflow:

```text
create Payment
+ PAYMENT_RECEIVED customer-ledger credit
+ PaymentAllocation(s)
+ recompute AR
+ BankTransaction
```

Sales Receipt instead performs:

```text
create Payment
unappliedAmount = 0
NO PAYMENT_RECEIVED AR credit
NO PaymentAllocation
+ BankTransaction
```

## Payments Received exclusion

Normal payment repository paths were changed so Sales-Receipt-owned Payments do not masquerade as Payments Received.

Review these files during local verification:

```text
apps/billing-api/src/modules/payments/repositories/payments/list.ts
apps/billing-api/src/modules/payments/repositories/payments/retrieve.ts
apps/billing-api/src/modules/payments/repositories/payments/update.ts
apps/billing-api/src/modules/payments/repositories/payments/apply.ts
apps/billing-api/src/modules/payments/repositories/payments/delete.ts
```

Direct ordinary payment refund handling was also prevented from becoming the Sales Receipt refund path.

---

# 6. Create workflow

Primary implementation:

```text
apps/billing-api/src/modules/documents/workflows/create-sales-receipt.ts
apps/billing-api/src/modules/documents/repositories/sales-receipt-workflow.ts
```

Creation coordinates under a serializable transaction:

```text
resolve customer/defaults
resolve quote snapshot OR manual document lines
resolve pricing/tax through existing owners
calculate totals
validate total > 0
validate bank charges < total
allocate SR number
allocate Payment number
record settled Payment
create SalesReceipt + immutable lines
consume Inventory for tracked item/variant lines
write sales-receipt.created Outbox event
commit
```

If inventory/payment/document persistence fails inside that transaction, the operation should roll back as one commercial event.

## Source/integration attribution

Integration-created Sales Receipts carry source attribution/idempotency data.

The embedded Payment now also receives the same source provenance.

Invoice's integration create route **requires** `Idempotency-Key`; this was caught during the later continuation and the Invoice browser client now supplies it.

Tenant/manual Sales Receipt create does not currently have a generic command-idempotency wrapper. The request is atomic, but if local review decides tenant create also needs replayable idempotency, add it deliberately without inventing unstable resource IDs.

---

# 7. Inventory behavior

Creation consumes tracked stock through the generic Inventory domain using:

```text
reference: { type: 'sales-receipt', id: salesReceiptId }
reason: 'sale'
```

Inventory was not taught Sales Receipt lifecycle policy.

## Partial returns

Added:

```text
apps/billing-api/src/modules/inventory/repositories/return-stock.ts
```

The primitive:

- accepts explicit item/variant targets and quantities;
- verifies original sale movements exist;
- accounts for prior sale-reversal quantities;
- prevents cumulative return quantities exceeding original sold quantities;
- writes auditable return movement evidence.

Do not replace this with manual stock adjustment from the Sales Receipt workflow.

---

# 8. Void workflow

Primary file:

```text
apps/billing-api/src/modules/documents/workflows/void-sales-receipt.ts
```

Void behavior:

```text
require receipt exists
require not already VOID
block if Credit Note/refund evidence exists
reverse settled Payment/bank evidence
restore original inventory sale movement
mark Sales Receipt VOID
emit sales-receipt.voided
```

Void has no A/R ledger effect.

Billing and Invoice now both expose a permission-gated **Void** action from Sales Receipt detail.

The shared UI presents an explicit warning that Void is only for an incorrectly entered original sale. Backend validation remains authoritative.

Browser refund/void commands now send `Idempotency-Key` headers so supported command retries cannot duplicate correction operations.

---

# 9. Refund / return workflow

Primary implementation:

```text
apps/billing-api/src/modules/documents/workflows/refund-sales-receipt.ts
apps/billing-api/src/modules/documents/repositories/credit-notes/record.ts
apps/billing-api/src/modules/payments/repositories/refunds/shared.ts
```

The workflow is intentionally atomic.

```text
Sales Receipt refund request
  -> validate receipt is PAID
  -> compute already credited amount
  -> cap refund at remaining uncredited sale value
  -> optionally restore explicit returned stock quantities
  -> issue Credit Note linked to Sales Receipt
  -> create Refund from Credit Note
  -> update normal customer credit/ledger projections
  -> emit sales-receipt.refunded
```

## Partial tax correction

Amount-only partial refunds proportionally reverse the original Sales Receipt tax mix.

This prevents a partial refund from reducing only revenue while leaving all original tax recognized.

Exact line-level returned-tax attribution can be improved later without changing the Credit Note + Refund contract.

## Product refund UI now exists

Both apps now have:

```text
/sales-receipts/:salesReceiptId/refund
```

The route uses the existing shared `@876/billing-ui/refund-form` but submits through `salesReceipts.refund(...)`, not the generic raw Refund endpoint.

That distinction is critical because the Sales Receipt endpoint performs the required Credit Note + Refund composition.

Current UI supports amount-only refunds.

It intentionally submits:

```text
returnLines: []
```

until an explicit receipt-line quantity return editor exists.

---

# 10. Derived correction/refund projection

The Billing service now computes canonical Sales Receipt correction fields instead of making hosts interpret nested Credit Note/Refund arrays.

Every serialized Sales Receipt now includes:

```text
creditedAmount
refundedAmount
refundableAmount
refundStatus
```

Definitions:

```text
creditedAmount
  = sum(totalAmount of non-VOID Sales-Receipt-linked Credit Notes)

refundedAmount
  = sum(cash Refund amounts from those non-VOID linked Credit Notes)

refundableAmount
  = max(SalesReceipt.totalAmount - creditedAmount, 0)

refundStatus
  = NONE
  | PARTIALLY_REFUNDED
  | REFUNDED
```

This deliberately distinguishes value correction from cash returned.

Example:

```text
Sales Receipt total:     10,000
Credit Note held:         2,000
Cash refunded:                0

creditedAmount:           2,000
refundedAmount:               0
refundableAmount:         8,000
refundStatus:              NONE
```

The remaining Credit Note balance can still be refunded through the canonical Credit Note refund flow; the Sales Receipt cannot create another value correction over the already credited amount.

These fields are now typed and validated in `@876/billing`.

---

# 11. API surface

Sales Receipts are mounted under Billing API v1.

Tenant routes implemented:

```text
GET  /api/v1/sales-receipts
POST /api/v1/sales-receipts
GET  /api/v1/sales-receipts/:salesReceiptId
POST /api/v1/sales-receipts/:salesReceiptId/refund
POST /api/v1/sales-receipts/:salesReceiptId/void
POST /api/v1/quotes/:quoteId/convert-to-sales-receipt
```

Integration routes implemented:

```text
GET  /api/v1/integrations/organizations/:organizationId/sales-receipts
POST /api/v1/integrations/organizations/:organizationId/sales-receipts
GET  /api/v1/integrations/organizations/:organizationId/sales-receipts/:salesReceiptId
POST /api/v1/integrations/organizations/:organizationId/sales-receipts/:salesReceiptId/refund
POST /api/v1/integrations/organizations/:organizationId/sales-receipts/:salesReceiptId/void
POST /api/v1/integrations/organizations/:organizationId/quotes/:quoteId/convert-to-sales-receipt
```

List supports:

```text
status = PAID | VOID
customerId
```

Current list behavior follows the neighboring bounded document resource and does not yet expose cursor pagination.

## OAuth scopes

Declared:

```text
billing.sales-receipts.read
billing.sales-receipts.write
```

**Important deployment action:** Invoice's deployed connection must be granted these scopes in its provisioning-profile revision.

Like Quote scopes, `financeScopes` are provisioning data, not a hardcoded repository constant. Do not invent a code-level allowlist just to avoid the provisioning update.

---

# 12. Generated API contracts

The source routes changed, but GPT Web did **not** run contract generation/check commands.

Do not hand-edit generated route/OpenAPI manifests simply to silence drift.

Local continuation must regenerate/check through the repository-supported commands and review the resulting generated diff.

Expect route-manifest/OpenAPI drift until that step is run.

---

# 13. `@876/billing` SDK

Sales Receipts are first-class SDK resources.

Tenant client:

```ts
billing.salesReceipts.list()
billing.salesReceipts.retrieve(id)
billing.salesReceipts.create(params)
billing.salesReceipts.refund(id, params)
billing.salesReceipts.void(id, params)

billing.quotes.convertToSalesReceipt(id, params)
```

Integration client has the corresponding Sales Receipt resource and quote-conversion method.

The SDK response contract now guarantees:

```text
id
number
status
refundStatus
currency
totalAmount
creditedAmount
refundedAmount
refundableAmount
receiptAt
```

while remaining passthrough-compatible for additional backend fields.

Sales Receipt create lines support `variantId` so variant-mode stock is not degraded to item-level sales.

Do not move this resource onto `$876`; it remains a Billing commercial resource.

---

# 14. Invoice same-origin integration boundary

Invoice does not call Billing API credentials directly from the browser.

New proxy support:

```text
apps/invoice/src/app/api/sales-receipts/[[...path]]/route.ts
apps/invoice/src/lib/api/resource-manifest.ts
apps/invoice/src/lib/client/sales-receipts.ts
```

`sales-receipts` was added to the explicit proxy resource manifest.

The existing manifest test dynamically compares the route directory set to `PROXIED_RESOURCES`, so this route joins that existing contract coverage automatically.

## Important idempotency detail

Invoice's product-app integration create endpoint requires `Idempotency-Key`.

The new Invoice browser Sales Receipt client generates that header for create.

Refund and Void clients in both Billing and Invoice also generate command idempotency keys.

Added Invoice client test:

```text
apps/invoice/src/lib/client/sales-receipts.test.ts
```

It asserts create/refund/void route encoding and idempotency headers.

The test was added but not executed.

---

# 15. Shared product UI

New/extended `@876/billing-ui` surfaces include:

```text
sales-receipts-list
sales-receipt-create-form
sales-receipt-lifecycle-actions
customer-sales-receipts-accordion
shared sales-receipt status options
```

Exports were added to `packages/billing-ui/package.json`.

Billing and Invoice own:

- route composition;
- auth/permissions;
- server data loading;
- browser transport wrappers;
- destination hrefs.

The shared package owns the reusable finance presentation and validation.

That matches the finance-app parity rule and avoids a second Invoice-specific Sales Receipt implementation.

---

# 16. List and detail UI

## Billing

New route family under:

```text
apps/billing/src/app/(app)/(sales)/sales-receipts/
```

Includes:

- list page;
- Suspense/list-detail layout;
- real SDK-backed list loader;
- detail page;
- new form route;
- refund route;
- create/refund/lifecycle host wrappers.

## Invoice

The previous Sales Receipt scaffold no longer substitutes Invoice data.

Invoice now reads real Sales Receipt records for list/detail and uses the same shared list/create/lifecycle UI as Billing.

## Financial filters

The old placeholder financial statuses were removed.

Current filter vocabulary:

```text
All
Paid
Void
```

Do not reintroduce `Draft` or `Sent` as Sales Receipt financial states.

Refund state is shown separately on detail.

---

# 17. New Sales Receipt form

A real create form now exists in **both Billing and Invoice**.

Shared implementation:

```text
packages/billing-ui/src/sales-receipt-create-form.tsx
```

Host routes:

```text
apps/billing/src/app/(app)/(sales)/sales-receipts/new/page.tsx
apps/invoice/src/app/(app)/sales-receipts/new/page.tsx
```

Form fields currently include:

- customer;
- currency;
- receipt date;
- sale reference;
- item/variant lines;
- quantity;
- rate;
- line tax;
- amount/percentage discount through the shared line editor;
- payment mode;
- deposit account filtered by currency;
- payment reference;
- bank charges;
- notes;
- terms.

It uses the existing shared `DocumentLineItemsEditor` and server-owned Billing calculation remains authoritative.

The UI enforces stock previews for tracked items/variants; Inventory still performs the authoritative mutation-time stock check.

The form correctly represents an immediate sale:

```text
button: Create sales receipt
NO Save Draft
NO Invoice creation
```

## Known create-form follow-ups

The form does **not** yet expose:

- salesperson selector;
- explicit price-list selector;
- quote prefill/conversion mode.

The backend supports salesperson/price-list defaults and direct Quote conversion.

The page currently preloads up to 100 active Items and 100 active variants. For large catalogs, replace this with the same server-search/typeahead pattern used elsewhere rather than simply raising the limit indefinitely.

---

# 18. Customer Transactions and AR

Sales Receipts now appear in customer commercial transaction history in both Billing and Invoice through a shared accordion/surface.

They intentionally do **not** become synthetic customer-statement entries.

Creation leaves these unchanged:

```text
Customer.outstandingReceivable
Customer.unusedCredits
```

Sales Receipt activity belongs in Transactions/Activity.

AR statement/aging remains invoice/ledger based.

The accounting model now documents this explicitly.

---

# 19. Accounting documentation

Updated:

```text
apps/billing/docs/accounting-model.md
```

It now documents:

- intent vs receivable vs immediate paid sale;
- Sales Receipt no-A/R semantics;
- embedded settled Payment behavior;
- Void vs return/refund;
- Credit Note + Refund correction chain;
- derived correction/refund fields;
- Sales Receipt AR neutrality;
- statement behavior;
- updated financial flow diagram.

Preserve these rules if local refactoring changes naming or code structure.

---

# 20. Quote → Sales Receipt conversion — implemented backend, UI intentionally withheld

Backend and SDK conversion support exists.

A Quote converted to Sales Receipt copies the accepted historical commercial values and requires payment/deposit details.

It creates **no intermediate Invoice**.

However, do **not** expose the product UI action yet.

## Critical remaining invariant

`Quote` currently has two separate one-to-one conversion relations:

```text
convertedInvoice
convertedSalesReceipt
```

That does not by itself guarantee one economic conversion across both kinds.

A Quote can be prevented from creating two Invoices and can be prevented from creating two Sales Receipts, but cross-kind exclusivity still needs a shared mechanism.

At minimum the final design must ensure:

```text
Accepted Quote
  -> either Invoice
  -> or Sales Receipt
  -> never both
```

and it must remain true under concurrent requests.

During this continuation `quotes.retrieve()` was extended to load both conversion targets in preparation for the fix, but the shared cross-kind claim/constraint is **not complete**.

### Recommended solution direction

Prefer one explicit Quote conversion claim owned by Documents rather than relying on two independent relation checks.

Possible patterns to evaluate locally:

1. additive Quote conversion fields claimed atomically, e.g. conversion kind + timestamp/resource identity;
2. a dedicated QuoteConversion row with a unique `quoteId` and conversion kind/resource evidence;
3. another existing repository-approved transactional claim mechanism if one already exists.

Whatever is chosen must handle both sequential and truly concurrent Invoice-vs-Sales-Receipt conversion attempts.

Do not solve only the UI visibility case.

Required tests should include:

```text
accepted quote -> invoice -> Sales Receipt rejected
accepted quote -> Sales Receipt -> invoice rejected
concurrent invoice + Sales Receipt conversion -> exactly one wins
same-kind conversion retry remains idempotent/replayed
```

After this is closed, add the Quote UI choice:

```text
Convert to Invoice      pay later
Convert to Sales Receipt paid now
```

The Sales Receipt choice needs payment mode/deposit-account inputs before submission.

---

# 21. Tests added vs tests still needed

## Added but not executed

- document-number Sales Receipt updates;
- `apps/billing-api/src/modules/documents/__tests__/sales-receipt.schemas.test.ts`;
- `apps/invoice/src/lib/client/sales-receipts.test.ts`;
- existing Invoice proxy-manifest test automatically covers the new resource directory/manifest parity.

Schema tests pin:

- valid manual immediate sale;
- customer/lines required for manual create;
- quote conversion cannot override quote commercial snapshot fields;
- duplicate return-line IDs rejected.

Invoice browser client tests pin:

- required integration create idempotency key;
- encoded refund route;
- encoded void route;
- command idempotency headers.

## Still required

Prioritize tests for:

### Create

- Sale creates one Sales Receipt and one embedded Payment.
- `unappliedAmount = 0`.
- no PaymentAllocation.
- no customer `PAYMENT_RECEIVED` ledger credit.
- A/R unchanged.
- customer unused credit unchanged.
- inventory consumes once.
- bank transaction created once.
- outbox event written once.
- failure in Inventory/Payment/document event rolls back all parts.

### Payments Received isolation

- embedded Sales Receipt Payment absent from normal payment list.
- cannot retrieve/update/apply/cancel embedded payment through normal payment endpoints.
- cannot direct-refund the embedded payment through ordinary unapplied-payment refund path.

### Void

- reverses payment/bank evidence;
- restores inventory exactly once;
- no A/R mutation;
- blocked after Credit Note/refund evidence;
- retry/idempotency behavior.

### Refund

- partial amount refund creates linked Credit Note + Refund atomically;
- proportional tax behavior;
- partial refund correctly updates projected fields;
- repeat refund capped at uncredited value;
- explicit stock return quantities restored;
- cumulative over-return rejected;
- service/non-stock lines cannot be falsely returned to inventory;
- transaction rollback leaves no half-created Credit Note or Refund.

### Tenant/integration isolation

- wrong tenant cannot access a receipt;
- app-scoped integration access cannot retrieve/mutate another source app's receipt;
- scope checks use dedicated Sales Receipt scopes.

### Quote conversion

- all cross-kind exclusivity cases described above.

### SDK/UI

- Sales Receipt schema projection fields;
- Billing browser lifecycle client routing/idempotency;
- shared create-form payload mapping;
- Billing and Invoice route permission gates;
- refund form does not allow more than `refundableAmount`.

---

# 22. Reporting still incomplete

Sales Receipts are not yet wired into canonical sales-report projections.

Target semantic rule:

```text
commercial sales =
  finalized/non-void Invoice sales
  + non-void Sales Receipt sales
  - applicable Credit Notes
```

But keep these invoice/AR-based:

```text
AR aging
open receivables
overdue invoices
```

Do not build a parallel reporting subsystem just for this feature.

Extend the existing report owner only where current architecture provides a canonical place.

`lifetimeBilled` remains intentionally invoice-specific for now. Do not silently change its meaning. If the product needs a broader customer metric, add a clearly named `lifetimeSales` projection in a coordinated change.

---

# 23. Permissions and access

Billing Sales Receipt pages use the existing sales permissions:

```text
sales:read
sales:write
```

Invoice does not currently have a Sales-Receipt-specific app permission family.

The new host routes reuse the existing sales-document permissions rather than inventing local-only permission names:

- create uses `invoices.create`;
- refund/void uses `invoices.edit`.

Revisit this only as part of a coordinated access-catalog evolution, not as an isolated Sales Receipt string addition.

The Billing API remains authoritative with its tenant `sales:*` permission and integration Sales Receipt OAuth scopes.

---

# 24. Module and feature gating

The canonical module already exists:

```text
sales-receipts
```

Do not create another module key.

Do not add a dedicated boolean product feature merely because Sales Receipts are now implemented.

Billing's route family lives under the existing broader `sales` product feature/access shell, while module/navigation availability remains governed by the canonical module system.

This follows the repository rule:

```text
modules != feature flags
```

---

# 25. Known static/compile risks to check first locally

Because GPT Web could not run typecheck, check these immediately.

## Shared create form

File:

```text
packages/billing-ui/src/sales-receipt-create-form.tsx
```

Verify:

- React namespace types resolve as expected;
- `SalesReceiptCreateParams` minor-unit types accept the prepared string values;
- `DocumentLineItemsEditor` draft-to-payload mapping matches current types;
- percentage discount conversion uses the correct subtotal semantics;
- currency changes correctly clear stale catalog selections;
- no missing imports/format helper drift.

## Host item/variant mapping

Verified by inspection against SDK types:

- Item has `name`, `defaultSellingAmount`, `defaultSellingCurrency`, stock fields.
- Variant has `name`, `sku`, `defaultSellingAmount`, `defaultSellingCurrency`, `stockQuantity`.

Still run typecheck to validate inference through the page mapping.

## Derived correction projection

File:

```text
apps/billing-api/src/modules/documents/sales-receipts.service.ts
```

Verify Prisma-inferred `creditNotes/refunds` shapes satisfy the local projection helper and that all list/retrieve/mutation resource responses contain the new required SDK fields.

## Detail action imports/client boundaries

Verify Billing and Invoice detail pages correctly cross the server/client boundary into their lifecycle wrappers and that Next's route composition accepts the nested refund pages in the existing list-detail shell.

---

# 26. Verification commands

Use the repository's real package names if any command aliases differ.

The original plan lists the expected verification matrix. At minimum run:

```bash
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
pnpm --filter @876/billing-app test

pnpm --filter @876/invoice typecheck
pnpm --filter @876/invoice test
```

Also run the repository-supported API contract generation command before `api:contract:check` if contract artifacts are expected to change.

Do not mark the tracker complete until real output has been captured/reviewed.

---

# 27. Recommended local continuation order

Use this order to minimize churn.

## Step 1 — Pull and establish exact branch state

```bash
git switch feat/sales-receipts-commercial-engine
git pull
```

Then read:

```text
CLAUDE.md
.agents/rules/gpt-web-operating-rules.md
plans/2026-09-11-sales-receipts-commercial-engine/plan.md
plans/2026-09-11-sales-receipts-commercial-engine/tracker.md
this handoff
```

## Step 2 — Run typecheck before adding more features

Start with:

```text
@876/billing-api
@876/billing
@876/billing-ui
Billing app
Invoice app
```

Fix concrete static errors before broad refactors.

## Step 3 — Close Quote cross-kind conversion exclusivity

This is the highest-priority correctness gap.

Do not expose the Quote → Sales Receipt product action until concurrent one-conversion semantics are guaranteed.

## Step 4 — Regenerate/check API contracts

Sales Receipt routes/scopes are new and generated contract artifacts are expected to move.

Review generated diffs rather than manually editing them.

## Step 5 — Run focused tests and add missing workflow/API tests

Start with the Sales Receipt request/client tests already added, then add/create integration tests around transactional negative space and tenant/source isolation.

## Step 6 — Apply/validate migration in a safe environment

Confirm:

- schema validity;
- no destructive drift;
- FK/index names;
- existing Billing data remains intact;
- new tables/relations work with Prisma generation.

## Step 7 — Add Quote conversion UX

Once exclusivity is closed:

```text
Accepted Quote
  [Convert to Invoice]
  [Convert to Sales Receipt]
```

Sales Receipt conversion must collect payment mode/deposit account and optional references before submission.

## Step 8 — Add explicit returned-line quantity UI

Keep the existing amount-only refund workflow intact.

Add line selection/quantity only when the UI can correctly show sold quantity, previously returned quantity, and remaining returnable quantity.

## Step 9 — Extend existing sales reports

Only through the canonical report owner.

Do not touch A/R aging semantics.

## Step 10 — Provision deployed Invoice scopes

Update the relevant provisioning-profile revision with:

```text
billing.sales-receipts.read
billing.sales-receipts.write
```

Without this data update, Invoice's new proxy/client code can be structurally correct but fail authorization in a deployed environment.

## Step 11 — Full verification and adversarial review

Review for:

- duplicate helpers/resources;
- stale Invoice placeholder Sales Receipt components no longer used;
- hidden Payments Received leakage;
- accidental AR/customer-credit effects;
- BigInt/JSON serialization problems;
- tenant/source isolation gaps;
- cross-kind Quote conversion race;
- refund/void idempotency;
- stock over-return;
- error swallowing;
- generated-contract drift;
- module/feature-gating drift;
- large-catalog create-form behavior.

## Step 12 — Finalize docs/tracker/report

Only after verification:

- mark tracker items from actual evidence;
- update `plan.md` status from `IN_PROGRESS` to completed if warranted;
- write a final implementation report with commands/results and migration/provisioning notes;
- then prepare PR/merge according to current user permission and repo rules.

---

# 28. Things deliberately not built

Do not expand this branch into speculative commerce scope.

Still out of scope:

- Orders;
- carts;
- checkout sessions;
- POS registers/cash drawers/shifts;
- store/location/channel models;
- fulfillment;
- promotions;
- gift cards;
- loyalty;
- restaurant tables/kitchen tickets;
- marketplace order orchestration;
- new payment-provider adapters.

Sales Receipt is the commercial primitive those future systems can consume; they do not need to be built here.

---

# 29. Current branch assessment

The branch is no longer just backend scaffolding. It now has a coherent immediate-sale lifecycle across the Billing plane and the two finance hosts:

```text
Create
  -> Sales Receipt
  -> settled Payment/bank evidence
  -> Inventory sale movement

Inspect
  -> same canonical record in Billing and Invoice
  -> customer Transactions visibility
  -> no AR statement noise

Correct entered-in-error sale
  -> Void
  -> reverse payment/bank
  -> restore inventory

Real customer refund
  -> Sales Receipt refund
  -> Credit Note
  -> Refund
  -> optional explicit inventory return
```

The main reasons it is still **not merge-ready** are now concentrated:

1. no executable verification has been run from this session;
2. Quote cross-kind conversion exclusivity must be made concurrency-safe;
3. generated API contracts need regeneration/checking;
4. workflow/API negative-space tests are incomplete;
5. deployment provisioning must grant the new Invoice scopes;
6. sales-report integration remains unfinished;
7. physical returned-line UI remains intentionally incomplete;
8. local typecheck may expose static issues in the newly added shared form/host route code.

Do not discard the current architecture to fix those items. Finish them within the existing ownership boundaries.

---

# 30. GPT Web verification statement

GPT Web did **not** execute:

- typecheck;
- lint;
- unit/integration tests;
- builds;
- Prisma generation;
- Prisma validation/drift commands;
- migrations;
- API contract generation/check;
- deployment provisioning updates.

No claim is made that any of those pass.

No PR was opened.

The local/orchestrating agent owns all executable verification and final merge readiness.
