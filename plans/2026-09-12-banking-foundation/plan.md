# Implementation Plan: 876 Banking Engine

**Run ID:** `2026-09-12-banking-foundation`  
**Branch:** `feature/banking`  
**Status:** IN_PROGRESS  
**Direction update:** statement-first, country-aware banking; live feeds deferred

## Objective

Extend the existing Billing-owned bank-account and booked-cash foundation into a
statement-ingestion, matching, categorization, rules, deposit/transfer, and
reconciliation subsystem without creating a second accounting engine.

The product is intentionally **statement-first**. In Jamaica and much of the
Caribbean, a business may have reliable downloadable bank statements without a
usable live aggregation/feed integration. The Banking MVP therefore must be
fully useful with uploaded statements. A future live bank feed is only another
source of normalized statement evidence.

At the same time, tenant bank accounts must be anchored to the existing Core
financial directory so an account can identify its real institution and branch.
Core owns global/country-aware financial-institution reference data. Billing
stores opaque directory identifiers only; there are no cross-database foreign
keys and no duplicate bank/branch catalog in Billing.

## Product direction / bounded-context contract

### Core API owns financial-institution reference data

`apps/api` is the source of truth for reusable institutions and locations:

```text
Country
  -> Bank
      -> BankBranch
```

Core already owns `Bank`, `BankBranch`, the financial directory API, directory
addresses, countries, and regions. This work extends those records to be
country-aware rather than creating Billing-owned copies.

A Core bank is identified by an opaque platform id. Local clearing identifiers
(`bankCode`, routing/institution code, transit/branch code, SWIFT/BIC, etc.) are
attributes of the directory resource, not IDs used by Billing relations.

### Billing owns tenant financial accounts and banking operations

`apps/billing-api` owns:

```text
Tenant BankAccount
  -> opaque Core bank id
  -> opaque Core branch id (optional where the country/account does not use branches)
  -> booked BankTransaction cash evidence
  -> imported BankStatementLine evidence
  -> matches / categorization / reconciliation
```

Billing must never establish a database FK into Core. It may validate opaque Core
IDs through a bounded Core/platform client when that contract is available.

### BankStatementLine is not BankTransaction

- `BankTransaction` remains canonical internally booked cash evidence.
- `BankStatementLine` is immutable external evidence supplied by a statement,
  file, feed, API, or future provider.
- Matching links statement evidence to existing booked cash. Matching never
  recreates a Payment, Refund, Sales Receipt, transfer, or ledger entry.
- Categorization creates the missing canonical financial operation and then
  links the statement line to the resulting `BankTransaction`.
- Reconciliation is a period-level process over booked cash movements; it is
  not a statement-line status.
- `banking` remains an 876 Billing module. 876 Invoice does not gain a duplicate
  Banking surface or data model.

## Jamaica reference model

Jamaica is the first fully populated country profile, not a hard-coded global
banking schema.

Current Jamaican ACH/routing references use concepts equivalent to:

- a 3-digit financial-institution/bank code;
- a 5-digit branch transit code;
- a check digit;
- a 9-digit domestic ABA/routing number composed from the clearing identifiers.

The Core directory already models `Bank.bankCode`, `BankBranch.transitNumber`,
and `BankBranch.routingNumber`, which are appropriate generic storage points for
these values. The implementation must not derive a routing number using Jamaican
rules in generic Banking code; country/clearing-system-specific validation or
composition belongs to the reference-data/catalog layer.

Authoritative reference-data inputs should be versioned from Bank of Jamaica /
Automated Payments Limited sources. Seed/catalog data must carry provenance and
revision metadata rather than relying on one-off production edits.

## Existing owners to preserve

- `apps/api`: shared Core bank/branch/country directory.
- `apps/billing-api`: canonical financial data plane and Banking business logic.
- `packages/core`: Core directory client contracts/resources when required.
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
10. File imports and future feeds normalize into the same statement-line pipeline.
11. A Billing bank account never owns/copies canonical institution or branch data.
12. If a branch is selected, it must belong to the selected bank.
13. Country-specific routing rules never leak into the global Banking engine.
14. A missing feed integration must never make Banking unusable.

## Work already landed on `feature/banking`

### Billing domain foundation

- [x] Added `BankStatementImport` and `BankStatementLine`.
- [x] Added `BankStatementMatch` and `BankStatementMatchItem`.
- [x] Added `BankRule`, `BankRuleCondition`, and `BankRuleAccount`.
- [x] Added `BankReconciliation` and `BankReconciliationItem`.
- [x] Added `BankTransfer`, `BankDeposit`, and `BankDepositItem` foundations.
- [x] Added tenant/account relations and supporting enums.
- [x] Hand-wrote additive Billing migration
  `20260912190000_banking_engine_foundation`.
- [x] Extended Billing `BankAccount` with explicit Books/bank balance metadata
  while preserving `balance` as the compatibility Books-balance field.
- [x] Opening balance now participates in Books balance projection.
- [x] Hardened account deletion/currency changes when Banking history exists.

### Statement engine foundation

- [x] Normalized statement import contract.
- [x] Deterministic fallback fingerprinting that can dedupe file/feed evidence.
- [x] Duplicate provenance is preserved instead of silently discarding rows.
- [x] Import list/retrieve/undo service operations.
- [x] Statement-line list/retrieve, exclude, and restore operations.
- [x] Deterministic match candidate scoring.
- [x] Single/multi-item matching and unmatching.
- [x] Serializable match transaction re-check prevents concurrent double-use of
  the same booked amount.
- [x] Basic manual deposit/withdrawal categorization foundation.
- [x] Same-currency transfer foundation with two booked cash legs.
- [x] Reconciliation draft/complete/reopen foundation.
- [x] Rule CRUD and recognize-only rule execution foundation.
- [x] Banking engine routes mounted under Billing API.

### SDK foundation

- [x] Banking engine public contract work started in `packages/billing`.
- [ ] Finish resource wiring/exports and reconcile all API response schemas.

### Core financial directory work started

- [x] Existing Core `Bank`, `BankBranch`, directory routes, countries, and
  regions identified as the canonical shared owner.
- [x] `Bank` Prisma schema changed to include `countryCode`, `clearingSystem`,
  and `institutionType`.
- [x] `Bank.bankCode` uniqueness changed conceptually from global to
  `(countryCode, bankCode)`.
- [x] `Country` now relates to banks.
- [ ] Core financial-directory API contracts/repository/service/serializers must
  be brought up to the new Prisma shape.
- [ ] Add the Core hand-written migration for the country-aware Bank changes.
- [ ] Fix directory bank-account validation so a selected branch must belong to
  the selected bank.

## Phases

### Phase 0 — Contract and run tracking

- [x] Read root `CLAUDE.md`, GPT-Web operating rules, Git, code-quality,
  naming, types, code-style, testing, error-handling, API backend, Express API,
  SDK conventions, Stripe API pattern, Billing data-plane, finance parity, and
  implementation-tracker rules.
- [x] Cut `feature/banking` from `main` with explicit user authorization.
- [x] Establish this plan as the orchestrator handoff/source of truth.
- [ ] Add durable Banking architecture documentation under `docs/architecture`
  after the current schema/API direction settles.

### Phase 1 — Country-aware Core financial directory

- [x] Make `Bank` country-scoped in Prisma.
- [x] Add generic `clearingSystem` and `institutionType` attributes.
- [ ] Hand-write Core migration: backfill existing banks to `JM`, add country
  FK, replace global bank-code uniqueness with country-scoped uniqueness, and
  add supporting indexes.
- [ ] Update Core directory Zod schemas and OpenAPI response/request contracts.
- [ ] Update serializers/repository/service for country-aware bank fields.
- [ ] Scope duplicate bank-code checks by country.
- [ ] Add optional country filtering to bank listing if consistent with the
  existing directory query conventions.
- [ ] Validate `branch.bankId === selected bankId` for directory bank-account
  creation/update.
- [ ] Preserve compatibility for existing Jamaican records during migration.

### Phase 2 — Versioned Jamaica bank/branch catalog

- [ ] Add a versioned financial-institution reference catalog rather than
  hard-coded seed arrays.
- [ ] Seed Jamaican institutions from authoritative BOJ/APL references.
- [ ] Seed branch transit/routing data with source revision/provenance.
- [ ] Reuse Core geo country/region concepts; Jamaica branch addresses should
  remain normal directory addresses.
- [ ] Make seed execution idempotent and explicit; never seed/DDL at service boot.
- [ ] Do not require every country to use Jamaica's routing/transit shape.

### Phase 3 — Billing account -> Core bank/branch association

- [ ] Add optional opaque Core directory bank/branch IDs to Billing `BankAccount`.
- [ ] Do **not** add cross-database foreign keys.
- [ ] Add account-holder/account-number display metadata with an explicit policy
  for sensitive/full account number storage before exposing it broadly.
- [ ] Validate bank/branch references through an existing bounded Core client if
  one exists; otherwise keep validation at the host boundary and document it.
- [ ] Expose directory IDs through Billing API/SDK.
- [ ] Keep branch optional for countries/account types where it is not meaningful.

### Phase 4 — Statement upload MVP (primary ingestion path)

- [ ] Add raw CSV/TSV parser and mapping layer.
- [ ] Add preview-before-commit workflow.
- [ ] Support signed-amount and separate debit/credit column layouts.
- [ ] Add saved mapping contracts after the first parser contract stabilizes.
- [ ] Persist source file in 876 Storage and retain only opaque file ID/provenance
  in Billing.
- [x] Normalized imports already converge on `BankStatementLine`.
- [x] Deterministic fingerprint/dedupe foundation already exists.
- [x] Import/list/retrieve/undo foundation already exists.

### Phase 5 — Matching

- [x] Deterministic candidate scoring against `BankTransaction`.
- [x] Search, match, multi-item match, and unmatch foundations.
- [x] Account/type/amount invariants and concurrent remaining-amount re-check.
- [ ] Add focused API/SDK tests and richer party/reference scoring where useful.

### Phase 6 — Categorization and transfers

- [x] Command-oriented manual cash categorization foundation.
- [x] Same-currency bank transfer foundation.
- [ ] Customer-payment categorization must call the canonical Payment owner and
  never write Payment/AR state privately from Banking.
- [ ] Add refund/bank-fee/interest handlers only through canonical owners.
- [ ] Leave Expense categorization disabled until canonical Expense CRUD exists.

### Phase 7 — Rules

- [x] Rule model, ALL/ANY conditions, priority, account targeting, recognition
  provenance, and recognize-only default foundations.
- [ ] Complete supported auto-categorization execution through canonical handlers.
- [ ] Add rule testing/preview before bulk application.

### Phase 8 — Reconciliation

- [x] Draft/create/retrieve/list/complete/reopen foundation.
- [x] Reconciliation targets canonical `BankTransaction`, not raw statements.
- [x] Completion requires zero difference.
- [x] Later completed periods block unsafe older-period reopening.
- [ ] Add reconciliation reporting/export and final UX.

### Phase 9 — Deposits and clearing

- [x] Prisma foundation for deposits/items exists.
- [ ] Use the existing `UNDEPOSITED_FUNDS` account type rather than inventing a
  parallel clearing concept.
- [ ] Implement deposit batching only where existing Payment/BankTransaction
  semantics can be preserved without double-booking.

### Phase 10 — SDK and product UI

- [ ] Finish `@876/billing` resources for statement import/line, rules, transfers,
  deposits, and reconciliations.
- [ ] Replace mutable statement-workflow usage of `BankTransaction.status` in new
  UI while preserving the legacy field for compatibility.
- [ ] Build account creation flow: country -> bank -> branch -> account details.
- [ ] Build statement upload/mapping/preview flow before any feed-connect UX.
- [ ] Build Banking inbox filters and transaction resolution UI in Billing only.
- [ ] Keep data loading/guards in host composition; shared panels render only.

### Phase 11 — Additional statement formats

After CSV/TSV is stable:

- [ ] OFX
- [ ] QIF
- [ ] CAMT.053 / CAMT.054
- [ ] MT940
- [ ] PDF only after deterministic formats are production-safe; do not make OCR
  a prerequisite for Banking usefulness.

### Phase 12 — Optional feed-provider boundary (deferred)

This is deliberately **not** an MVP phase.

- [ ] Review existing finance/provider connection infrastructure before adding a
  `BankConnection` abstraction.
- [ ] Add provider-neutral connection/account mapping only when a real provider
  is selected.
- [ ] Normalize provider transactions into the same `BankStatementLine` path.
- [ ] Never require a feed to create, import, reconcile, or use a bank account.

### Phase 13 — Verification and review

- [ ] Add focused tests for Core country/bank/branch ownership semantics.
- [ ] Add focused Billing tests for tenant isolation, import dedupe, matching,
  rules, reconciliation, and AR non-mutation invariants.
- [ ] Validate both Prisma schema sets and migration drift locally.
- [ ] Review complete diff for duplicate abstractions, compatibility residue,
  swallowed errors, unsafe casts, and cross-service ownership leaks.
- [ ] Write final GPT-Web report with exact local verification state.

## Explicit compatibility decisions

### `BankTransaction.status`

`BankTransaction.status` currently exposes `UNCATEGORIZED | CATEGORIZED |
MATCHED | EXCLUDED`. Existing API/SDK callers may depend on that public field.
This run will not silently rename or remove it. New statement workflows use
`BankStatementLine.status`; the old field remains a compatibility surface until
all first-party consumers migrate.

### Existing Core directory records

The current financial directory is Jamaica-oriented. The country-aware migration
may backfill existing bank rows to `JM`, but the steady-state schema/API must not
assume every bank is Jamaican.

### Core vs Billing bank accounts

The existing Core directory `BankAccount` and Billing financial `BankAccount`
serve different domains. Do not merge them as part of this work. Core owns
shared directory/reference resources; Billing owns an organization's financial
ledger account. Billing may reference the Core bank/branch IDs.

## Known dependencies / deferred scope

- Canonical Expense CRUD remains outstanding; Banking must not create a private
  Expense subsystem.
- Sensitive bank account-number storage/display needs an explicit data-security
  decision before full account numbers are broadly exposed.
- Live feed provider selection is deferred. Do not block MVP on Plaid or another
  aggregator.
- Jamaica catalog completeness should come from authoritative source ingestion,
  not guessed branch lists.

## Orchestrator resume order

When the local orchestrator pulls `feature/banking`, continue in this order:

1. Read this plan and current branch diff against `main`.
2. Validate/fix the partially implemented Core `Bank`/`Country` Prisma changes.
3. Complete the Core country-aware financial-directory migration/API contracts.
4. Fix bank/branch ownership validation in Core directory bank-account writes.
5. Add versioned Jamaica institution/branch catalog and idempotent seed path.
6. Wire Billing bank accounts to opaque Core bank/branch IDs.
7. Finish raw CSV/TSV upload -> mapping -> preview -> normalized import.
8. Finish `@876/billing` resources and Billing UI.
9. Run all local Prisma/type/lint/test/build/contract checks and repair any
   connector-authored TypeScript/schema issues before merge.

## Verification commands

These have **not** been executed by GPT-Web. The local orchestrator must run the
repo-approved equivalents. At minimum:

```bash
# Core API
pnpm --filter @876/api typecheck
pnpm --filter @876/api lint
pnpm --filter @876/api test
pnpm --filter @876/api build

# Billing API
pnpm --filter @876/billing-api typecheck
pnpm --filter @876/billing-api lint
pnpm --filter @876/billing-api boundaries
pnpm --filter @876/billing-api test
pnpm --filter @876/billing-api build
pnpm --filter @876/billing-api db:validate
pnpm --filter @876/billing-api db:drift
pnpm --filter @876/billing-api api:contract:check

# Billing SDK
pnpm --filter @876/billing typecheck
pnpm --filter @876/billing test
```

Also run the actual Core Prisma validate/drift/migration commands defined by the
current package scripts; do not infer command names from this plan if they differ.
Apply both hand-written migrations to a disposable/local database before merge.

## Reports

| Report | Status |
| --- | --- |
| `reports/gpt-web/2026-09-12-banking-foundation.md` | pending |

## Handoff state

Work is active on `feature/banking`. No PR should be opened by GPT-Web.

The branch contains substantial connector-authored code that has **not** had
local typecheck, Prisma generation/validation, migration application, test, lint,
or build verification. Treat the code as implementation-in-progress until the
local orchestrator completes those checks and records the results.