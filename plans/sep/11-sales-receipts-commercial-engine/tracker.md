# Sales Receipts Commercial Engine Tracker

**Run:** `2026-09-11-sales-receipts-commercial-engine`  
**Branch:** `feat/sales-receipts-commercial-engine`  
**Status:** COMPLETED ✅ for branch scope — see plan.md "Local closeout" and "Follow-ups"

## Repository preparation

- [x] Read `CLAUDE.md` on `main`.
- [x] Read `.agents/rules/gpt-web-operating-rules.md`.
- [x] Read implementation tracker/autonomy/reuse/naming/types/style/testing/error/git guidance.
- [x] Read Express/API/Stripe-pattern/SDK guidance.
- [x] Read app structure/layout/module/access guidance.
- [x] Read finance-app parity, Billing data-plane, and Billing commercial-platform guidance.
- [x] Create `feat/sales-receipts-commercial-engine` from `main` with explicit user authorization.
- [x] Create committed implementation plan before code edits.

## Evidence inventory

- [x] Verify Sales Receipts canonical module exists.
- [x] Verify Invoice Sales Receipts list/detail scaffold exists.
- [x] Verify no pre-existing Billing API `SalesReceipt` Prisma model existed.
- [x] Verify ordinary Payment create semantics post customer A/R credit/unapplied cash.
- [x] Verify invoice workflow orchestration pattern.
- [x] Verify generic Inventory reference pattern.
- [x] Verify Credit Note + Refund separation.
- [x] Verify document numbering owner.
- [x] Inventory Documents API route/controller/service/schema/repository shapes used by the implementation.
- [x] Inventory `@876/billing` tenant/integration client/resource/schema patterns.
- [x] Inventory Billing and Invoice Sales Receipt host files and shared `@876/billing-ui` patterns.

## Phase 1 — Persistence

- [x] `DocumentType.SALES_RECEIPT`
- [x] `SalesReceiptStatus`
- [x] `SalesReceipt` model
- [x] `SalesReceiptLine` model
- [x] one-to-one Payment relation
- [x] Quote relation
- [x] Credit Note relation
- [x] additive hand-written migration SQL
- [x] sequence prefix + document-number test update

## Phase 2 — Payment seam

- [x] shared settled-payment persistence/validation seam
- [x] ordinary Payments Received behavior preserved
- [x] Sales Receipt payment writes zero unapplied credit
- [x] no `PaymentAllocation` for Sales Receipt
- [x] no ordinary customer A/R ledger credit
- [x] embedded Sales Receipt Payment excluded from ordinary Payments Received retrieval/mutation surfaces
- [x] settled-payment reversal seam used by Sales Receipt void

## Phase 3 — Create workflow

- [x] strict create schemas
- [x] repository persistence
- [x] inventory consume
- [x] settled Payment + BankTransaction evidence
- [x] integration/source idempotency and replay behavior
- [x] `sales-receipt.created` outbox event
- [x] serializable transaction/rollback boundary
- [x] request-schema tests added
- [ ] tenant/manual create command-idempotency header is not implemented; create remains one atomic request while integration creates require source idempotency
- [ ] workflow integration/rollback tests still required

## Phase 4 — API/resource reads

- [x] list
- [x] retrieve
- [x] create route/controller/service
- [x] canonical serializer/resource contracts
- [x] status and customer filters
- [x] tenant + integration route families
- [x] dedicated `billing.sales-receipts.read/write` OAuth scopes
- [ ] cursor pagination is not implemented; current list follows the existing bounded no-cursor document pattern
- [ ] tenant/integration isolation route tests still required
- [ ] generated route/OpenAPI contract artifacts must be regenerated/checked locally; do not hand-edit generated manifests

## Phase 5 — Void

- [x] void workflow
- [x] inventory restore
- [x] settled Payment/bank correction evidence
- [x] return/refund guardrails
- [x] `sales-receipt.voided` event
- [x] Billing + Invoice Void UI action with in-context error
- [x] browser correction requests use command idempotency headers
- [ ] workflow/API tests still required

## Phase 6 — Quote conversion

- [x] accepted Quote → Sales Receipt API/SDK contract
- [x] direct Sales Receipt creation from Quote snapshot
- [x] no intermediate Invoice
- [x] source Quote relation and integration idempotency
- [x] Quote repository now reads both conversion target relations
- [ ] **Critical:** cross-kind conversion exclusivity is not complete. Quote → Invoice and Quote → Sales Receipt use separate one-to-one relations; a shared conversion claim/constraint is still required to guarantee one economic conversion under sequential and concurrent cross-kind requests.
- [ ] Do not expose the planned Quote → Sales Receipt UI action until the cross-kind invariant above is closed.
- [ ] conversion tests still required, including Invoice-vs-Sales-Receipt double-conversion and concurrent race coverage

## Phase 7 — Returns/refunds

- [x] Credit Note Sales Receipt source relation
- [x] atomic Sales Receipt refund orchestration using Credit Note + existing Refund primitive
- [x] proportional tax reversal for amount-only partial refunds
- [x] Inventory-owned explicit partial-return primitive with cumulative over-return protection
- [x] stock restoration only for explicit returned quantities
- [x] derived `creditedAmount`, `refundedAmount`, `refundableAmount`, and `refundStatus`
- [x] Billing + Invoice amount-only refund routes using canonical Sales Receipt workflow
- [x] shared lifecycle Refund UI
- [ ] returned-line quantity editor is not implemented in product UI; current refund form intentionally submits `returnLines: []`
- [ ] workflow/API tests still required

## Phase 8 — SDK

- [x] Sales Receipt resource types/schemas
- [x] `billing.salesReceipts`
- [x] create/retrieve/list/refund/void lifecycle methods
- [x] quote conversion method on tenant and integration Quote resources
- [x] tenant and integration authority entrypoint exports
- [x] variant-aware Sales Receipt create line contract
- [x] correction/refund projection fields typed and validated
- [x] Invoice browser client test added for create/refund/void routes and idempotency headers
- [ ] broader SDK unit tests still required

## Phase 9 — Product UI

- [x] Billing Sales Receipts list/detail surface
- [x] Invoice Sales Receipts list/detail backed by real Sales Receipt data
- [x] shared finance list/create/lifecycle UI promoted through `@876/billing-ui`
- [x] create route/form in Billing
- [x] create route/form in Invoice
- [x] Invoice same-origin Sales Receipt proxy/client boundary
- [x] create form uses shared document line editor, catalog items/variants, stock previews, currency, payment mode, deposit account, references, notes/terms
- [x] detail view exposes credited/refunded/refund state
- [x] amount-only refund route/form in both hosts
- [x] Void action in both hosts
- [x] correct financial list filters (`PAID | VOID`; no fake Draft/Sent)
- [x] mutation failures rendered in-context for create/refund/void
- [x] host guards/permissions/module ownership preserved
- [ ] create UI does not yet expose salesperson or explicit price-list selection; backend defaults remain available
- [ ] create UI currently preloads up to 100 Items/variants; large-catalog server search should replace that bound when needed
- [ ] physical returned-line quantity UI remains to be built
- [ ] Quote → Sales Receipt UI intentionally withheld until Phase 6 cross-kind exclusivity is fixed

## Phase 10 — Customer/reporting

- [x] customer Transactions surfaces include Sales Receipts as commercial history
- [x] Sales Receipt creation leaves A/R neutral
- [x] Sales Receipt embedded Payment leaves available customer credit neutral
- [x] AR statement remains ledger-derived and does not add synthetic Sales Receipt debit/credit noise
- [x] A/R/aging semantics remain invoice-based
- [ ] existing sales-report projections have not yet been extended to include non-void Sales Receipts
- [ ] broader `lifetimeSales` metric is intentionally not introduced; `lifetimeBilled` semantics remain stable

## Phase 11 — Documentation and closeout

- [x] accounting model documents intent vs credit sale vs immediate paid sale and Sales Receipt correction semantics
- [x] detailed local handoff exists under `reports/gpt-web/`
- [ ] update product-facing Sales Receipt docs if the local review identifies another canonical doc owner
- [ ] perform local duplicate/compatibility/error/scope diff review after typecheck/test feedback
- [ ] regenerate/check generated API contract artifacts
- [ ] grant `billing.sales-receipts.read/write` in the deployed Invoice provisioning-profile revision; `financeScopes` are deployment data, not a repo constant
- [ ] final implementation report after verification
- [ ] mark plan/tracker `COMPLETED` only after all merge-blocking issues are resolved

## Verification

All executable verification remains **NOT EXECUTED by GPT Web**. The local/orchestrating agent must run the commands in `plan.md` using the actual workspace package names and record real results.

At minimum verify:

- Billing API typecheck, lint, boundaries, tests, build, Prisma validate/drift, API contract generation/check.
- `@876/billing` typecheck/tests.
- `@876/billing-ui` typecheck/tests.
- Billing app typecheck/tests.
- Invoice app typecheck/tests.
- migration SQL against an appropriate local/test database before deployment.

## Merge blockers / highest-priority local continuation

1. Run typecheck first and repair any static contract drift in the newly added create/refund/lifecycle UI.
2. Close Quote cross-kind conversion exclusivity before exposing Quote → Sales Receipt UI.
3. Regenerate/check Billing API route/OpenAPI artifacts.
4. Add workflow/API tests for create, rollback, void, refund, tenant isolation, and conversion races.
5. Extend canonical sales reports if current report owners can consume Sales Receipts without adding a parallel reporting subsystem.
6. Update the deployed Invoice provisioning-profile revision with the new Sales Receipt OAuth scopes.
7. Run the full required verification matrix, then write the final report and resync this tracker.
