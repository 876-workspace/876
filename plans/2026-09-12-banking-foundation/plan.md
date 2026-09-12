# Implementation Plan: 876 Banking Engine

**Run ID:** `2026-09-12-banking-foundation`  
**Branch:** `feature/banking`  
**Status:** IN_PROGRESS

## Objective

Extend the existing Billing-owned bank-account and booked-cash foundation into a
statement-ingestion, matching, categorization, rules, deposit/transfer, and
reconciliation subsystem without creating a second accounting engine.

## Architectural contract

- `BankTransaction` remains canonical internally booked cash evidence.
- `BankStatementLine` is immutable external evidence supplied by a bank, file,
  feed, or future provider.
- Matching links statement evidence to existing booked cash. Matching never
  recreates a Payment, Refund, Sales Receipt, transfer, or ledger entry.
- Categorization creates the missing canonical financial operation and then
  links the statement line to the resulting `BankTransaction`.
- Reconciliation is a period-level process over booked cash movements; it is
  not a statement-line status.
- `banking` remains an 876 Billing module. 876 Invoice does not gain a duplicate
  Banking surface or data model.

## Existing owners to preserve

- `apps/billing-api`: canonical financial data plane and Banking business logic.
- `packages/billing`: typed Billing SDK contracts/resources.
- `apps/billing`: Banking host composition.
- `packages/billing-ui`: presentation-only finance UI when reuse is justified.
- Existing `BankAccount`, `BankTransaction`, `Payment`, `PaymentAllocation`,
  `Refund`, `CreditNote`, `SalesReceipt`, and `CustomerLedgerEntry` resources.

## Financial invariants

1. Importing a statement line does not create AR, customer credit, or booked cash.
2. Matching an existing payment does not create another payment or ledger entry.
3. Matching/unmatching does not mutate customer AR.
4. Unmatching preserves the canonical financial record.
5. Categorization creates canonical accounting evidence exactly once.
6. Bank-supplied statement facts are immutable after ingestion.
7. Undoing an import never silently destroys matched/categorized accounting evidence.
8. Reconciliation completion requires zero difference.
9. Money stays in integer minor units; currencies are never mixed silently.
10. Live-feed providers normalize into the same statement-line ingestion path as files.

## Phases

### Phase 0 — Contract and run tracking

- [x] Read root `CLAUDE.md`, GPT-Web operating rules, Git, code-quality,
  naming, types, code-style, testing, error-handling, API backend, Express API,
  SDK conventions, Stripe API pattern, Billing data-plane, finance parity, and
  implementation-tracker rules.
- [x] Cut `feature/banking` from `main` with explicit user authorization.
- [ ] Add Banking architecture documentation.

### Phase 1 — Schema separation

- [ ] Extend `BankAccount` with statement/bank-balance metadata without changing
  the meaning of its canonical booked balance.
- [ ] Add `BankStatementImport` and `BankStatementLine`.
- [ ] Add `BankStatementMatch` and `BankStatementMatchItem`.
- [ ] Add `BankRule`, `BankRuleCondition`, and `BankRuleAccount`.
- [ ] Add `BankReconciliation` and `BankReconciliationItem`.
- [ ] Add `BankTransfer`, `BankDeposit`, and `BankDepositItem` where the existing
  commercial model supports them without duplication.
- [ ] Hand-write additive migration SQL; do not run Prisma generators/migrations.
- [ ] Add ID prefixes and tenant/account relations.

### Phase 2 — Statement ingestion

- [ ] Add CSV/TSV normalization contracts and import mapping.
- [ ] Add deterministic fingerprint/deduplication behavior.
- [ ] Add import/list/retrieve/undo service operations and API routes.
- [ ] Preserve source provenance; no parser writes canonical accounting rows.

### Phase 3 — Matching

- [ ] Add deterministic candidate scoring against `BankTransaction`.
- [ ] Add search, match, multi-item match, and unmatch commands.
- [ ] Enforce currency/account/amount invariants and prevent duplicate matching.

### Phase 4 — Categorization and transfers

- [ ] Add command-oriented categorization boundary.
- [ ] Support canonical manual deposit/withdrawal and customer-payment creation
  only through existing owning module contracts.
- [ ] Add same-currency bank transfers with two booked `BankTransaction` legs.
- [ ] Leave Expense categorization disabled until canonical Expense CRUD exists.

### Phase 5 — Rules

- [ ] Add rule CRUD, ordered ALL/ANY conditions, recognize-only default, and
  opt-in auto-categorization.
- [ ] Persist recognition provenance on statement lines.

### Phase 6 — Reconciliation

- [ ] Add reconciliation draft/create/retrieve/list/complete/reopen commands.
- [ ] Reconcile canonical `BankTransaction` rows, never raw statement lines.
- [ ] Preserve completed history and block unsafe older-period reopening.

### Phase 7 — Deposits and clearing

- [ ] Use the existing `UNDEPOSITED_FUNDS` account type rather than inventing a
  parallel clearing concept.
- [ ] Add deposit batching only where existing Payment/BankTransaction semantics
  can be preserved without double-booking.

### Phase 8 — SDK and product UI

- [ ] Extend `@876/billing` with statement import/line, rule, transfer/deposit,
  and reconciliation resources.
- [ ] Replace mutable statement-workflow usage of `BankTransaction.status` in new
  UI while preserving the legacy field for compatibility.
- [ ] Build account inbox filters and resolution UI in Billing only.
- [ ] Keep data loading/guards in host composition; shared panels render only.

### Phase 9 — Feed-provider boundary

- [ ] Add provider-neutral `BankConnection` / account mapping contracts only if
  they do not duplicate existing finance/provider connection infrastructure.
- [ ] Normalize provider transactions into `BankStatementLine` ingestion.
- [ ] Do not ship a real provider adapter without a selected provider and credentials.

### Phase 10 — Verification and review

- [ ] Add focused tests for schemas, tenant isolation, import dedupe, matching,
  rules, reconciliation, and AR non-mutation invariants.
- [ ] Review the complete diff for duplicate abstractions, compatibility residue,
  swallowed errors, unsafe casts, and provider/accounting ownership leaks.
- [ ] Write final GPT-Web report with exact unexecuted verification commands.

## Explicit compatibility decision

`BankTransaction.status` currently exposes `UNCATEGORIZED | CATEGORIZED |
MATCHED | EXCLUDED`. Existing API/SDK callers may depend on that public field.
This run will not silently rename or remove it. New statement workflows use
`BankStatementLine.status`; the old field is retained as compatibility surface
with a documented removal condition after all first-party consumers migrate.

## Known dependency

The repository still has canonical Expense data model/CRUD work outstanding.
Banking may define an `expense` categorization capability only after that owner
exists. Banking must not create a private Expense model to complete a workflow.

## Verification commands

Not executable from the GPT-Web connector seat. The orchestrator must run at
minimum:

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
```

Add Billing app/package checks when UI work lands.

## Reports

| Report | Status |
| --- | --- |
| `reports/gpt-web/2026-09-12-banking-foundation.md` | pending |

## Handoff state

Work is active on `feature/banking`. No PR should be opened by GPT-Web.
Verification remains the orchestrator's responsibility.