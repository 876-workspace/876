# Local Handoff — Sales Receipts Commercial Engine

**Run:** `2026-09-11-sales-receipts-commercial-engine`  
**Branch:** `feat/sales-receipts-commercial-engine`  
**Base:** `main`  
**Handoff date:** 2026-09-11  
**Status:** IN PROGRESS — continue locally; not merge-ready  
**Code snapshot before this report commit:** `bc34bb52c4e98241066e92fe007baa78cb49c4a1` (`billing: expose sales receipt browser client`)  
**Base / merge-base snapshot:** `b864b752f909ead27fa30c9c2b04c8681b3a2346`  
**Branch comparison at handoff:** 122 commits ahead of `main`, 0 behind before this report commit  
**PR:** none opened; none authorized by this GPT Web run

## Purpose of this handoff

The user is continuing implementation locally. This document records the real branch state, the architectural decisions that must be preserved, the files and behavior already implemented, known gaps, and the safest continuation/verification sequence.

Do **not** treat `tracker.md` as an accurate completion map at this point. It was created before most implementation work and was not resynchronized as the branch evolved. The branch contains substantially more completed work than the tracker checkboxes show. Reconcile the tracker against code before using it as a completion signal.

The original implementation plan remains authoritative for scope and invariants:

- `plans/2026-09-11-sales-receipts-commercial-engine/plan.md`
- `plans/2026-09-11-sales-receipts-commercial-engine/tracker.md`

Read those files plus the binding repository rules listed in `plan.md` before continuing.

---

## Executive implementation state

The core Sales Receipt commercial engine is substantially implemented.

A Sales Receipt is modeled as an **immediate paid sale**, not as an Invoice shortcut and not as an ordinary Payments Received transaction. Creation coordinates the commercial document, settled Payment evidence, BankTransaction evidence, Inventory consumption, and Outbox event without creating Accounts Receivable, unused customer credit, or PaymentAllocation rows.

The branch now contains:

- additive Prisma persistence and migration for Sales Receipts;
- a Payment-owned settled-payment recording seam;
- a settled-payment reversal seam for void/correction behavior;
- create, list, retrieve, void, refund, and accepted Quote → Sales Receipt workflows/routes;
- explicit stock return behavior for partial returns;
- Credit Note + Refund composition for Sales Receipt refunds;
- OAuth/integration scopes and integration API support;
- tenant and integration `@876/billing` SDK resources;
- Quote SDK conversion helpers;
- shared Sales Receipt list/customer-history UI in `@876/billing-ui`;
- real Invoice Sales Receipt list/detail loading instead of the old fake Invoice-backed scaffold;
- a new Billing Sales Receipts list/detail route family;
- Billing browser-side Sales Receipt mutation client.

The largest incomplete user-facing slice is **Sales Receipt creation UI**, especially the shared form and the Invoice same-origin mutation proxy/client. Test coverage, generated API-contract verification, documentation, tracker resync, and final review are also still required.

---

## Non-negotiable architecture decisions

Preserve these even if local refactors change file layout.

### 1. Sales Receipt is not an Invoice

Do not create an Invoice internally just to reuse invoice lifecycle code.

The intended paths are separate:

```text
Credit sale:
Quote -> Invoice -> Payment -> A/R settlement

Immediate paid sale:
Quote? -> Sales Receipt + settled Payment evidence
```

An accepted Quote may convert directly to a Sales Receipt when payment details are supplied. There is no intermediate Invoice.

### 2. Sales Receipt creation must remain A/R-neutral

Creation must not:

- create an Invoice;
- create a customer Accounts Receivable debit;
- create a `PAYMENT_RECEIVED` customer-ledger credit;
- create `PaymentAllocation` rows;
- create unused customer credit;
- change open/overdue invoice balances.

The embedded Payment is payment/banking/provider evidence for cash that is already fully consumed by the Sales Receipt.

Expected embedded Payment semantics:

```text
status = SUCCEEDED
unappliedAmount = 0
allocations = []
```

This is intentionally different from ordinary Payments Received.

### 3. Embedded Sales Receipt Payments stay out of default Payments Received

The Payment is still a real canonical `Payment` and still participates in banking/provider/audit/refund behavior, but it must not appear as an ordinary standalone Payments Received row by default.

The Payment repository list/retrieve/update/delete handling was adjusted around this distinction. Review those changes carefully before altering Payment queries.

### 4. Inventory ownership remains generic

Inventory owns stock movement and validation. It does **not** own Sales Receipt lifecycle policy.

Sales Receipt workflows call generic inventory primitives with evidence such as:

```ts
{ type: 'sales-receipt', id: salesReceiptId }
```

Partial return behavior was added to Inventory so callers can explicitly restore selected quantities without teaching Inventory what a refund means.

### 5. Refund value correction and cash movement remain separate

A Sales Receipt refund composes existing canonical concepts:

```text
Credit Note = commercial/value correction
Refund      = money moving back out
Inventory   = only explicit returned quantities
```

Do not collapse those into one new refund table or one giant Sales Receipt status machine.

The document financial lifecycle remains fundamentally:

```text
PAID | VOID
```

Refund presentation should be derived separately (`none`, partial, refunded) from linked correction/refund evidence.

### 6. Partial refunds reverse tax proportionally

The refund workflow was corrected so amount-only partial refunds proportionally reverse the original Sales Receipt tax instead of creating a zero-tax Credit Note. Do not regress this to `taxAmount = 0` on partial refunds.

Returned stock quantities remain explicit and independent from monetary refund amount.

### 7. Integration provenance must cover both receipt and embedded Payment

Integration-created Sales Receipts carry source attribution/idempotency metadata. The embedded Payment writer already supported attribution; the settled-payment seam was updated to forward it.

Do not allow the receipt to be attributed while its linked Payment loses source provenance.

### 8. Billing remains the canonical commercial plane

Do not introduce an Invoice-owned Sales Receipt model/API.

`apps/invoice` is a host over the Billing data plane. Shared types/resources belong in `@876/billing`; reusable presentation belongs in `@876/billing-ui` when both hosts genuinely consume it.

### 9. Modules are not feature flags

Billing Sales Receipts live under the existing Sales product area. Do not invent a new `salesReceipts: boolean` product feature flag just to gate the route.

Use the canonical module/navigation/plan system for module availability and the existing broader Sales access/permission model for host access.

---

## Persistence and migration already implemented

### New Prisma files

- `apps/billing-api/prisma/schema/sales-receipt.prisma`
- `apps/billing-api/prisma/schema/sales-receipt-line.prisma`

### Migration

- `apps/billing-api/prisma/migrations/20260911120000_sales_receipts_commercial_engine/migration.sql`

The migration is additive and introduces the Sales Receipt persistence needed by this feature.

Related existing schema files were updated for relations/enums, including:

- `enums.prisma`
- `payment.prisma`
- `quote.prisma`
- `credit-note.prisma`
- `customer.prisma`
- `tenant.prisma`
- `salesperson.prisma`
- `tax-rate.prisma`
- `price.prisma`
- `price-list.prisma`
- `item.prisma`
- `item-variant.prisma`

The local agent must run Prisma validation/drift/generation processes required by current repo rules. GPT Web did **not** execute those commands.

Pay special attention to relation cardinality/uniqueness for:

- one Sales Receipt → one embedded Payment;
- optional Quote → converted Sales Receipt;
- Credit Notes sourced from a Sales Receipt;
- line references to item/variant/price/tax snapshots.

Do not assume migration correctness merely because schema and SQL exist.

---

## Payment seam already implemented

### Added

- `apps/billing-api/src/modules/payments/settled-payment.ts`
- `apps/billing-api/src/modules/payments/settled-payment-reversal.ts`

### Shared Payment repository refactor

Relevant changes include:

- `repositories/payments/shared.ts`
- `repositories/payments/create.ts`
- `repositories/payments/list.ts`
- `repositories/payments/retrieve.ts`
- `repositories/payments/apply.ts`
- `repositories/payments/update.ts`
- `repositories/payments/delete.ts`

The settled-payment writer validates the same canonical customer/payment-mode/deposit-account/currency constraints but writes fully-consumed Payment evidence without A/R allocations/customer credit.

Integration attribution is forwarded through `writePaymentEvidence(...)`.

The local agent should specifically regression-test ordinary Payments Received after this refactor. The public behavior of ordinary Payment creation is supposed to remain unchanged.

---

## Core Sales Receipt create workflow already implemented

Primary files:

- `apps/billing-api/src/modules/documents/workflows/create-sales-receipt.ts`
- `apps/billing-api/src/modules/documents/repositories/sales-receipt-workflow.ts`
- `apps/billing-api/src/modules/documents/schemas/sales-receipt.ts`

The workflow supports two sources:

### Manual Sales Receipt

Caller supplies customer, lines, payment mode, deposit account, and optional pricing/document details.

The workflow resolves through existing owners rather than reimplementing pricing/document arithmetic.

### Accepted Quote conversion

Caller supplies an accepted Quote plus payment details.

The workflow copies historical commercial values from the accepted Quote and creates a direct Sales Receipt.

Important conversion rule:

```text
Quote must be ACCEPTED
Quote -> Sales Receipt directly
No intermediate Invoice
```

Creation also:

- generates document and Payment numbers through the existing document-number owner;
- records the settled Payment;
- persists the receipt + immutable lines;
- consumes inventory;
- enqueues `sales-receipt.created` in the same transaction;
- supports integration idempotency/source attribution;
- protects against duplicate quote conversion.

Inspect transaction retry/error handling before changing this workflow. It intentionally treats payment, stock, and receipt creation as one commercial operation.

---

## Sales Receipt repositories and read model already implemented

Added:

- `repositories/sales-receipts/index.ts`
- `repositories/sales-receipts/list.ts`
- `repositories/sales-receipts/retrieve.ts`

List supports tenant ownership plus optional:

- `status` (`PAID | VOID`);
- integration `sourceAppId` restriction;
- `customerId` filtering.

`customerId` filtering was added specifically so customer activity surfaces can discover Sales Receipts **without manufacturing A/R ledger entries**.

Do not solve customer history by posting Sales Receipts into the customer A/R ledger.

---

## Void workflow already implemented

Primary file:

- `apps/billing-api/src/modules/documents/workflows/void-sales-receipt.ts`

Supporting payment reversal:

- `apps/billing-api/src/modules/payments/settled-payment-reversal.ts`

The void path is intended to reverse eligible settled payment/bank evidence and inventory exactly once without introducing A/R activity.

Local work should add/confirm tests for:

- PAID → VOID happy path;
- inventory restoration;
- repeated/replayed void;
- void after incompatible refunds/returns;
- bank/payment evidence correctness;
- no A/R/customer-credit side effects;
- event/idempotency behavior.

---

## Refund / return workflow already implemented

Primary file:

- `apps/billing-api/src/modules/documents/workflows/refund-sales-receipt.ts`

Credit Note reuse/refactor:

- `repositories/credit-notes/create.ts`
- `repositories/credit-notes/record.ts`
- `schemas/credit-note.ts`

Refund reuse/refactor:

- `modules/payments/repositories/refunds/create.ts`
- `modules/payments/repositories/refunds/shared.ts`

Inventory return primitive:

- `modules/inventory/repositories/return-stock.ts`
- `modules/inventory/inventory.service.ts`
- `modules/inventory/index.ts`
- `src/types/inventory.ts`

### Refund semantics implemented

The workflow creates a linked commercial correction and cash refund atomically.

A monetary refund does **not** automatically mean all stock was physically returned.

Returned stock must be supplied explicitly through return lines/quantities.

The Inventory primitive validates cumulative returns so a line cannot be returned beyond its original sold quantity.

### Important tax behavior

Partial refunds proportionally reverse original tax. Preserve this behavior unless the commercial engine later gains a more explicit line-level refund allocation model.

### Local tests that are especially important

- full refund;
- multiple partial refunds whose total reaches receipt value;
- over-refund rejection;
- partial tax calculation;
- zero-tax receipt;
- monetary refund with no stock return;
- partial stock return;
- repeated partial returns across multiple refunds;
- over-return rejection;
- service/non-stock lines;
- failed Refund write rolling back Credit Note and stock mutation;
- failed inventory return rolling back Credit Note/Refund.

---

## API/controller/service routing already implemented

Added:

- `sales-receipts.routes.ts`
- `sales-receipts.controller.ts`
- `sales-receipts.service.ts`

Mounted through:

- `apps/billing-api/src/http/routes.ts`
- `apps/billing-api/src/modules/documents/index.ts`

### Tenant routes

Implemented conceptual surface:

```text
GET  /api/v1/sales-receipts
POST /api/v1/sales-receipts
GET  /api/v1/sales-receipts/:salesReceiptId
POST /api/v1/sales-receipts/:salesReceiptId/refund
POST /api/v1/sales-receipts/:salesReceiptId/void
POST /api/v1/quotes/:quoteId/convert-to-sales-receipt
```

Tenant permissions use existing Sales permissions (`sales:read`, `sales:write`).

### Integration routes

Implemented organization-scoped create/list/get/refund/void plus Quote conversion under the existing integration route family.

Dedicated OAuth/integration scopes were added to:

- `apps/api/src/modules/oauth/oauth.scopes.ts`

Scopes:

```text
billing.sales-receipts.read
billing.sales-receipts.write
```

### Important deployment gap

Declaring scopes in code is not sufficient for already-provisioned product connections.

Invoice/Billing integration provisioning-profile data must be checked and updated locally/deployment-side so relevant app connections are actually granted the new scopes where needed.

Do not assume deployed integrations can call these routes merely because OAuth discovery now advertises them.

---

## Mutation response contract was normalized

During implementation an SDK/API mismatch was found: the SDK expected a Sales Receipt resource while mutation service methods initially returned only `{ object, id }`.

The service was changed so create, Quote conversion, refund, and void return the freshly serialized canonical Sales Receipt resource.

Preserve this consistency unless the broader API standard explicitly requires separate mutation-result schemas.

---

## `@876/billing` SDK implementation already present

### Tenant SDK

Added:

- `packages/billing/src/types/sales-receipt.ts`
- `packages/billing/src/types/sales-receipt.schema.ts`
- `packages/billing/src/resources/sales-receipts.ts`

Wired into:

- `packages/billing/src/client.ts`
- `packages/billing/src/index.ts`

Canonical surface:

```ts
billing.salesReceipts.list(...)
billing.salesReceipts.retrieve(id)
billing.salesReceipts.create(params)
billing.salesReceipts.refund(id, params)
billing.salesReceipts.void(id, params)
```

The list contract supports `status` and `customerId`.

Guaranteed response fields were tightened enough for shared UI:

```ts
object: 'sales_receipt'
id: string
number: string
status: 'PAID' | 'VOID'
currency: string
totalAmount: string
receiptAt: number
```

The schema remains passthrough-friendly so backend fields can evolve without requiring synchronized SDK releases for every additive field.

### Quote tenant helper

`packages/billing/src/resources/quotes.ts` now exposes direct conversion to Sales Receipt in the same lifecycle style as Quote → Invoice.

### Integration SDK

Added:

- `packages/billing/src/integration/resources/sales-receipts.ts`
- `packages/billing/src/integration/types/sales-receipt.ts`
- `packages/billing/src/integration/types/sales-receipt.schema.ts`

Wired through:

- `packages/billing/src/integration/client.ts`
- `packages/billing/src/integration/index.ts`

Integration Quote conversion was also added to:

- `packages/billing/src/integration/resources/quotes.ts`

Integration create/conversion requires a stable idempotency key according to the existing integration conventions.

### Variant typing fix

While wiring Sales Receipt form contracts, an existing SDK gap was found: Billing API document lines support `variantId`, but `DocumentLineCreateParams` in `@876/billing` omitted it.

That canonical type was updated. Preserve the field so Sales Receipt line submission does not collapse variant stock identity to item identity.

---

## Shared UI already implemented

Added to `@876/billing-ui`:

- `src/sales-receipts-list.tsx`
- `src/customer-sales-receipts-accordion.tsx`

Package subpath exports were added in:

- `packages/billing-ui/package.json`

`document-status.ts` now contains canonical Sales Receipt filter vocabulary rather than each host inventing its own.

Supported financial filters are:

```text
all
paid
void
```

Do not restore `draft` or `sent` as Sales Receipt financial statuses. Sending/emailing is communication state, not the commercial financial lifecycle.

The shared list follows the existing `CustomersList` host-policy pattern:

- `@876/billing-ui` owns reusable table/list-detail rendering;
- the host supplies `baseHref`;
- the host supplies money/date/status formatting policy where appropriate;
- host routing/auth/module/session policy remains in the app.

---

## Customer transaction/history integration already implemented

Modified:

- `apps/billing/src/app/(app)/customers/[customerId]/transactions/page.tsx`
- `apps/invoice/src/app/(app)/customers/[customerId]/transactions/page.tsx`

Both hosts now request Sales Receipts separately by `customerId` and render them as commercial history alongside the existing ledger-backed transaction sections.

This design is intentional.

The current customer `account().statement` is an A/R/accounting ledger read model. A Sales Receipt does not create A/R, so it must **not** be forced into that statement just to make the UI discover it.

The shared `CustomerSalesReceiptsAccordion` renders receipt activity separately.

A/R statement/aging semantics remain unchanged.

---

## Invoice Sales Receipt surface already corrected

### Before this branch

Invoice had a Sales Receipts UI/navigation scaffold but it was fake:

- the list loaded Invoices and cast them as Sales Receipts;
- the detail page searched `listInvoices()` for a receipt ID;
- status filters included `draft` and `sent`.

### Current branch

Modified:

- `apps/invoice/src/app/(app)/sales-receipts/[salesReceiptId]/page.tsx`
- `apps/invoice/src/app/(app)/sales-receipts/_components/sales-receipts-list-data.tsx`
- `apps/invoice/src/app/(app)/sales-receipts/_components/sales-receipts-list.tsx`
- `apps/invoice/src/app/(app)/sales-receipts/_components/sales-receipts-toolbar.tsx`

Invoice now reads the canonical Sales Receipt resource via its request-scoped Billing client.

The list/detail no longer substitutes Invoice data.

The local Invoice list component has been reduced toward a host wrapper around shared `@876/billing-ui` presentation.

### Cleanup still needed

Inspect remaining Invoice-local Sales Receipt table/list files for dead or now-redundant presentation code. Remove only after confirming no imports/tests still depend on them.

---

## Billing Sales Receipt host surface already added

Billing previously had no actual Sales Receipt route sibling under `(sales)`.

Added:

- `apps/billing/src/app/(app)/(sales)/sales-receipts/layout.tsx`
- `.../sales-receipts/(list)/page.tsx`
- `.../sales-receipts/[salesReceiptId]/page.tsx`
- `.../sales-receipts/_components/sales-receipts-list-data.tsx`
- `.../sales-receipts/_components/sales-receipts-list.tsx`
- `.../sales-receipts/_components/sales-receipts-section.tsx`

The new host surface:

- sits under the existing `(sales)` parent, which already gates `sales:read` and the broader Sales product area;
- loads through canonical `getBilling()` / `@876/billing` rather than adding new methods to the legacy `service` compatibility facade;
- consumes shared `@876/billing-ui` receipt list presentation;
- preserves the existing list-detail/Suspense shell pattern.

Do not move this new resource back onto the legacy Billing `service` facade unless a separate migration decision requires it.

---

## Billing browser mutation client already added

Added:

- `apps/billing/src/lib/client/sales-receipts.ts`

Wired into:

- `apps/billing/src/lib/client/index.ts`

This was the last code slice completed before the handoff snapshot.

It provides the browser-side mutation boundary needed by a future shared create/refund/void UI.

---

# What is NOT finished

## Priority 1 — Finish Sales Receipt creation UI

This is the largest incomplete product slice.

Both Billing and Invoice already expose/expect a `New` Sales Receipt route in their UI patterns, but there is not yet one coherent shared creation experience backed by the new resource.

### Recommended direction

Build **one shared Sales Receipt create form in `@876/billing-ui`** using the existing shared `DocumentLineItemsEditor` rather than duplicating invoice/quote forms again.

The form should own reusable Sales Receipt UX only:

- customer selection;
- line items;
- item + variant identity;
- quantity/rate/tax/discount handling through existing shared money/editor code;
- receipt date;
- currency;
- salesperson/price-list fields only if current host data supports them cleanly;
- payment mode;
- deposit account;
- payment date;
- payment reference;
- bank charges;
- receipt reference;
- notes/terms;
- in-context error rendering;
- pending/submit state;
- redirect to created receipt on success.

The host should own:

- auth/session resolution;
- access/module gating;
- data loading;
- same-origin transport/mutation callback;
- route return destinations;
- app-specific shell.

### Do not extend the existing invoice/quote `DocumentCreateForm` into a giant incompatible union unless local review proves that is genuinely cleaner.

Billing and Invoice currently each have their own document-create host wrapper. Sales Receipt adds required settlement fields and materially different submit semantics. The clean plan at handoff is a dedicated shared Sales Receipt form built on the already-shared line-item editor.

## Priority 2 — Finish Invoice browser mutation boundary

Billing browser client support exists.

Invoice still needs the matching safe mutation path.

Invoice browser code should not call Billing API directly with server credentials. Follow Invoice's established same-origin proxy approach:

```text
browser -> Invoice /api/... proxy -> request-scoped/server Billing client -> Billing API
```

Recommended work:

1. add narrow `apps/invoice/src/lib/client/sales-receipts.ts`;
2. export it from `apps/invoice/src/lib/client/index.ts`;
3. add the same-origin API route(s) needed for create, and later refund/void if UI exposes them;
4. validate body contracts with canonical/shared schemas where current route conventions allow;
5. preserve Invoice auth/access behavior;
6. add client/proxy tests following neighboring Payments/Documents patterns.

Do not overload Invoice's generic `documents` browser client with Sales Receipt payloads if that creates an incompatible invoice/quote/sales-receipt union.

## Priority 3 — Add `new` routes in both hosts

Billing:

```text
apps/billing/src/app/(app)/(sales)/sales-receipts/new/page.tsx
```

Invoice:

```text
apps/invoice/src/app/(app)/sales-receipts/new/page.tsx
```

Follow existing route-shell rules:

- creation is a route, not a modal/dialog;
- preserve list-detail takeover behavior already used by finance routes;
- start independent server reads concurrently/Suspense where current host conventions support it;
- mutation errors stay in-context rather than replacing the shell;
- permission failures use established no-access behavior.

Required supporting reads likely include customers/items/currencies/payment modes/deposit accounts, with optional salesperson/price-list reads depending on final form scope.

## Priority 4 — Add lifecycle controls to detail as appropriate

List/detail reading exists, but richer actions are not fully surfaced.

Consider shared UI for:

- Refund Sales Receipt;
- Void Sales Receipt;
- print/PDF/send later if/when document delivery infrastructure is already available;
- derived refund state display.

Do not add speculative communication/POS subsystems as part of this run.

## Priority 5 — Reconcile and expand tests

Most implementation in this branch is currently **untested by this GPT Web run**.

At minimum add/verify focused coverage across these areas.

### Billing API workflow tests

Create:

- manual Sales Receipt success;
- accepted Quote conversion success;
- non-accepted Quote rejection;
- duplicate Quote conversion/replay;
- integration idempotent replay;
- idempotency key + payload mismatch conflict;
- unavailable customer/payment mode/account/currency failures;
- inventory failure rolls back Payment/BankTransaction/receipt/event;
- embedded Payment gets zero unapplied amount;
- no `PaymentAllocation` rows;
- no `PAYMENT_RECEIVED` ledger entry;
- integration attribution reaches Payment.

Void:

- valid void;
- inventory restoration exactly once;
- settled Payment/bank reversal;
- repeated void/replay;
- incompatible refunded/returned state blocked;
- no A/R side effects.

Refund:

- full refund;
- partial refund;
- proportional tax reversal;
- cumulative over-refund rejected;
- explicit stock return;
- no stock return when returnLines omitted;
- cumulative over-return rejected;
- rollback of Credit Note/Refund/Inventory on any failure.

### API route/security tests

Add tenant and integration route tests for:

- read scope;
- write scope;
- missing/wrong scopes;
- organization ownership;
- source-app isolation where appropriate;
- customerId/status query validation;
- mutation idempotency headers;
- Quote conversion routes.

### Payment regression tests

Because payment internals were refactored, verify ordinary Payments Received still:

- posts normal customer ledger credit;
- allocates to invoices;
- leaves unapplied customer credit when appropriate;
- does not accidentally filter ordinary payments;
- preserves update/delete/refund behavior.

### Inventory tests

Test the new return primitive independently:

- tracked item;
- tracked variant;
- non-stock/service line behavior;
- repeated partial returns;
- over-return conflict;
- missing original movement;
- tenant/reference isolation.

### SDK tests

Tenant and integration clients should pin:

- paths;
- methods;
- query serialization;
- request bodies;
- idempotency header behavior;
- schemas;
- Quote conversion helper.

### UI tests

Add/adjust Billing + Invoice tests for:

- real Sales Receipt list loading;
- paid/void filtering only;
- shared list/detail behavior;
- customer Sales Receipt history;
- create form validation/submission/error behavior once implemented;
- host guard/module behavior.

---

## Priority 6 — API contract generation/check

The route implementation changed, but generated route/OpenAPI contract artifacts were intentionally **not hand-edited**.

Run the repo's canonical API contract generation/check workflow and commit whatever generated artifacts are required by current rules.

Do not manually fabricate route-manifest/OpenAPI output.

Verify the generated contract includes:

- tenant Sales Receipt routes;
- integration Sales Receipt routes;
- Quote → Sales Receipt conversion routes;
- dedicated integration scopes;
- `customerId` and status query fields;
- correct success/error envelopes.

---

## Priority 7 — Provisioning scope grants

The OAuth scope registry now advertises:

```text
billing.sales-receipts.read
billing.sales-receipts.write
```

Inspect canonical provisioning-profile data for Invoice and any product integration expected to consume Sales Receipts. Existing connections may require a profile revision/reprovisioning path before deployed calls work.

This is a deployment/data-plane task, not just a code declaration.

---

## Priority 8 — Reporting integration

Customer activity integration exists separately from A/R.

Still review existing Sales reports and extend them only where there is an established reporting owner.

Expected behavior:

```text
Sales totals/history: include Sales Receipts where appropriate
A/R aging: exclude Sales Receipts
Open receivables: exclude Sales Receipts
Customer available credit: unchanged by Sales Receipt creation
```

Do not rename existing metrics such as `lifetimeBilled` casually. If its semantics are invoice-only, either preserve that meaning or add a coordinated new sales metric rather than silently broadening it.

---

## Priority 9 — Documentation

Still required:

- update `apps/billing/docs/accounting-model.md`;
- document credit sale vs immediate paid sale;
- document why embedded Sales Receipt Payments are not ordinary Payments Received;
- document Sales Receipt void/refund/return correction semantics;
- update relevant product docs/feature specs if they enumerate sales documents;
- record integration scope/provisioning implications.

Suggested accounting explanation:

```text
Invoice sale:
Dr Accounts Receivable
Cr Sales Revenue
Cr Tax Payable

Payment against Invoice:
Dr Cash/Bank
Cr Accounts Receivable

Sales Receipt:
Dr Cash/Bank
Cr Sales Revenue
Cr Tax Payable

No Accounts Receivable leg is created for the Sales Receipt.
```

Inventory COGS/stock accounting remains subject to the current commercial engine's existing inventory/accounting ownership.

---

## Priority 10 — Tracker and plan resync

`tracker.md` is currently stale.

Before closeout, inspect code and mark actual state rather than mechanically checking everything.

Likely current high-level state:

```text
Phase 1 persistence: largely implemented, needs verification/tests
Phase 2 payment seam: implemented, needs regression tests
Phase 3 create workflow: implemented, needs focused tests
Phase 4 API/read routes: implemented, needs contract/security tests
Phase 5 void: implemented, needs focused tests
Phase 6 Quote conversion: implemented, needs tests
Phase 7 returns/refunds: implemented, needs tests/refinement review
Phase 8 SDK: implemented, needs tests
Phase 9 UI: list/detail substantially implemented; create form/mutation completion remains
Phase 10 customer/reporting: customer history implemented; reporting review remains
Phase 11 docs/finalization: incomplete
```

Keep `plan.md` status `IN_PROGRESS` until verification and remaining UI/docs are coherent.

---

## Known review risks

### 1. Branch has many small commits

At handoff the branch was 122 commits ahead of `main` before this report commit. This is largely connector write granularity, not 122 conceptual features.

Do not assume commit boundaries correspond to implementation phases. Preserve history unless the repo's normal local/PR process explicitly calls for consolidation/squash.

### 2. Schema/migration were not validated

The SQL and Prisma schema were written but no migration, generation, validation, or drift command was run by GPT Web.

### 3. Refactored Payment and Refund internals are high-risk regression surfaces

The feature intentionally reuses existing payment/refund owners. This is architecturally preferable, but it means ordinary payment/refund behavior must receive regression testing.

### 4. Tracker does not reflect branch reality

Do not use unchecked boxes to infer missing code.

### 5. UI compile issues may remain

Shared exports, host imports, Next route typing, response-field narrowing, money formatter expectations, and client/server boundaries have not been typechecked.

### 6. API generated artifacts may be stale

Run canonical contract generation/check; do not hand-edit output.

### 7. Provisioning profiles may not grant new scopes

Code-level scopes and deployment-level grants are different concerns.

### 8. Refund accounting needs tests, not intuition

The current implementation uses proportional tax reversal for amount-only partial refunds. Validate exact rounding behavior in minor units against the commercial engine's money rules.

---

# Recommended local continuation order

Use this order to avoid doing UI work on top of a broken backend contract.

1. Pull/checkout `feat/sales-receipts-commercial-engine` and read `CLAUDE.md`, GPT Web rules, this handoff, `plan.md`, and `tracker.md`.
2. Inspect `git diff main...HEAD` and preserve local/other-agent changes if any have landed since this handoff.
3. Run formatting/typecheck on the narrowest affected packages first to expose compile errors before adding more code.
4. Validate Prisma schema and migration; fix relation/enum/migration issues without changing core invariants.
5. Run/add focused Billing API tests for create/void/refund/return and Payment regressions.
6. Run API contract generation/check and commit generated artifacts if required.
7. Finish Invoice same-origin Sales Receipt mutation proxy/client.
8. Build shared `@876/billing-ui` Sales Receipt create form using the shared line-item editor.
9. Add Billing and Invoice `/sales-receipts/new` routes using host-owned loaders/mutation callbacks.
10. Add/refine detail lifecycle actions only after create is stable.
11. Run Billing SDK/integration SDK tests.
12. Run Billing/Invoice/shared-UI tests and typechecks.
13. Review/reporting behavior; keep A/R neutral.
14. Update accounting/product docs.
15. Remove confirmed dead placeholder/duplicate Sales Receipt UI code.
16. Resync tracker/plan against actual implementation.
17. Run full required verification and perform final diff review against `main`.
18. Write the final implementation report only after the above is complete.

---

## Verification commands from the implementation plan

GPT Web did not execute these. Run them locally and adjust package names only if current workspace metadata differs.

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

Also run any canonical Prisma generation/format command required by the current Billing API package before typecheck if the generated client is stale. Follow current repository scripts rather than guessing a raw Prisma command.

---

## Suggested targeted first-pass verification

Before running the entire suite, a useful local sequence is:

```text
1. Prisma validate/generate as prescribed by package scripts
2. Billing API typecheck
3. Billing API Sales Receipt workflow/route tests
4. Billing API Payment/Refund/Inventory regression tests
5. @876/billing typecheck/tests
6. @876/billing-ui typecheck/tests
7. Billing app typecheck
8. Invoice app typecheck
9. API contract check
10. Full affected-package tests/builds
```

If typecheck fails in UI first, do not paper over it with `as unknown as` unless the boundary is already an established compatibility layer. Prefer fixing canonical SDK response typing or host mapping.

---

## Final acceptance criteria for this run

Do not mark the run complete until all of the following are true:

- manual Sales Receipt can be created from Billing and Invoice;
- accepted Quote can convert directly to Sales Receipt with payment details;
- Sales Receipt creation is atomic across receipt/payment/bank/inventory/outbox;
- no Invoice/A/R/unused-credit/PaymentAllocation is created by a Sales Receipt;
- embedded Payment is hidden from ordinary Payments Received while remaining available for banking/audit/refund internals;
- list/retrieve work in tenant and integration authorities;
- void reverses eligible sale settlement/inventory exactly once;
- refund composes Credit Note + Refund and only restores explicitly returned stock;
- partial refunds handle tax correctly in integer minor units;
- integration attribution and idempotency work for both receipt and Payment;
- Billing and Invoice consume the same canonical resource;
- customer commercial history shows Sales Receipts without contaminating A/R statements;
- Sales Receipt statuses remain financially `PAID | VOID` with refund state derived separately;
- generated API contracts and provisioning scopes are coherent;
- tests/typecheck/lint/build/database checks required by repo rules pass;
- accounting/product documentation is updated;
- `tracker.md` and `plan.md` reflect reality;
- final diff review finds no duplicate domain model, speculative Orders/POS scope, swallowed errors, unsafe compatibility residue, or accidental A/R behavior;
- final implementation report is written.

---

## No claims of verification

No local shell was available to this GPT Web implementation run. Therefore I did **not** execute or verify:

- TypeScript typecheck;
- ESLint/lint;
- Vitest/test suites;
- package builds;
- Prisma generation;
- Prisma schema validation;
- migration application;
- database drift checks;
- API contract generation/check;
- runtime browser flows;
- deployed OAuth/provisioning behavior.

The code should be treated as an implemented but **unverified** branch until the local agent completes those steps.

---

## Short continuation brief for a local coding agent

```text
Continue on feat/sales-receipts-commercial-engine.

Read:
- CLAUDE.md
- .agents/rules/gpt-web-operating-rules.md
- all rules listed in plans/2026-09-11-sales-receipts-commercial-engine/plan.md
- plan.md
- tracker.md
- reports/gpt-web/2026-09-11-local-handoff.md

Do not rewrite the Sales Receipt architecture into invoice+payment.
Preserve A/R neutrality, zero-unapplied embedded Payments, no PaymentAllocation,
explicit stock returns, Credit Note + Refund separation, and direct accepted
Quote -> Sales Receipt conversion.

First validate/fix the existing backend/Prisma/SDK changes and add targeted tests.
Then finish Invoice same-origin Sales Receipt mutations, a shared @876/billing-ui
Sales Receipt create form, and /sales-receipts/new in Billing + Invoice.
Run canonical API contract generation/check, provisioning-scope review, docs,
tracker resync, full verification, and final diff review before claiming complete.

Do not open or merge a PR unless separately authorized by the user.
```
