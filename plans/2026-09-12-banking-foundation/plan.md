# Implementation Plan: 876 Banking Engine

**Run ID:** `2026-09-12-banking-foundation`  
**Branch:** `feature/banking`  
**Status:** IN_PROGRESS  
**Direction:** statement-first, country-aware banking; live feeds deferred

## Objective

Build Banking as a Billing-owned financial subsystem that is fully useful from uploaded bank statements, while anchoring tenant bank accounts to Core-owned country-aware bank and branch reference data.

The Caribbean/Jamaica MVP must not depend on Plaid-style live aggregation. CSV/TSV upload, normalization, matching, categorization, and reconciliation are first-class product paths. A future provider feed is only another source of `BankStatementLine` evidence.

## Bounded-context contract

### Core API owns reusable financial-institution reference data

```text
Country
  -> Bank
      -> BankBranch
```

Core owns canonical institution/branch identity, country, clearing-system metadata, routing/transit attributes, addresses, and future versioned reference catalogs. `Bank.bankCode` is country-scoped rather than globally unique.

### Billing owns tenant financial accounts and financial activity

```text
Tenant BankAccount
  -> optional opaque Core bank id
  -> optional opaque Core branch id
  -> BankTransaction booked-cash evidence
  -> BankStatementLine external evidence
  -> matches / categorization / rules / reconciliation
```

Billing never creates a database FK into Core. Core IDs are opaque strings. Branch is optional because not every account type/country uses physical branches.

### Statement evidence is separate from booked cash

- `BankTransaction` is canonical internally booked cash evidence.
- `BankStatementLine` is immutable external evidence from file/feed/API.
- Matching links evidence to existing booked cash; it never recreates Payments, Refunds, Sales Receipts, transfers, or ledger entries.
- Categorization creates the missing canonical financial operation exactly once, then links the statement line to its resulting booked cash.
- Reconciliation is period-level and operates on canonical `BankTransaction` rows.

## Financial invariants

1. Importing a statement line does not create AR, customer credit, or booked cash.
2. Matching/unmatching never mutates customer AR.
3. Matching an existing payment never creates another payment or ledger entry.
4. Categorization creates canonical accounting evidence exactly once.
5. Bank-supplied statement facts remain immutable after ingestion.
6. Undoing an import never silently destroys matched/categorized accounting evidence.
7. Reconciliation completion requires zero difference.
8. Money remains integer minor units; parsing must not use floating point.
9. File imports and future feeds converge on the same statement-line pipeline.
10. Billing never owns/copies canonical institution or branch reference data.
11. If a branch is selected, it must belong to the selected bank.
12. Country-specific routing rules stay in the reference/catalog layer.
13. A missing feed integration must never make Banking unusable.

## Current landed state

### Billing Banking engine

- [x] `BankStatementImport` / `BankStatementLine`.
- [x] `BankStatementMatch` / match items.
- [x] `BankRule`, conditions, account targeting, recognition provenance.
- [x] `BankReconciliation` / reconciliation items.
- [x] `BankTransfer`, `BankDeposit`, `BankDepositItem` foundations.
- [x] Additive Billing banking-engine migration.
- [x] Books balance vs external bank balance metadata.
- [x] Opening balance participates in Books balance projection.
- [x] Account deletion/currency-change guards when history exists.
- [x] Deterministic dedupe/fingerprinting.
- [x] Deterministic match scoring and serializable remaining-amount re-check.
- [x] Match, multi-match, unmatch, exclude, restore.
- [x] Manual cash categorization foundation.
- [x] Same-currency transfer foundation.
- [x] Reconciliation draft/complete/reopen foundation.
- [x] Rule CRUD and recognize-only execution foundation.

### Core financial directory

- [x] `Bank` is country-aware in Prisma.
- [x] Added `countryCode`, `clearingSystem`, and `institutionType`.
- [x] `Country` relates to banks.
- [x] Bank-code uniqueness changed to `(countryCode, bankCode)`.
- [x] Hand-written Core migration added with Jamaica backfill and index replacement.
- [x] Directory Zod contracts, serializer, repository, and service updated for country-aware bank fields.
- [x] Duplicate bank-code checks are country-scoped.
- [x] Core directory bank-account create/update validates that selected branch belongs to selected bank.
- [x] Focused service tests added for country-scoped codes and branch ownership. **Not run locally yet.**
- [ ] `bankListQuerySchema` exists, but `/directory/banks` still needs to use it before `country_code` filtering is live.

### Billing -> Core directory association

- [x] Billing `BankAccount` stores optional opaque `directoryBankId` / `directoryBranchId`.
- [x] No cross-database foreign keys.
- [x] Additive Billing migration added for opaque directory references.
- [x] Billing API serializer/create/update contracts expose the directory IDs.
- [x] Billing SDK bank-account contracts expose the directory IDs.
- [x] Updating a bank without an explicit compatible branch clear/change is rejected.
- [ ] Authoritative remote Core lookup/validation is intentionally not wired yet; add a dedicated bounded Core-directory client rather than overloading the identity gateway.

### Statement upload MVP

- [x] Raw UTF-8 CSV/TSV parser.
- [x] Explicit column mapping contract.
- [x] Preview-before-import endpoint.
- [x] Signed-amount layout support.
- [x] Separate debit/credit column layout support.
- [x] Configurable date formats.
- [x] Configurable decimal/thousands separators.
- [x] Positive-direction mapping for signed layouts, including credit-card-style reversed sign semantics.
- [x] Currency decimal precision resolved from Billing currency registry.
- [x] Decimal amounts converted to integer minor units without floating point.
- [x] Row-level preview errors.
- [x] Import command re-runs the same parser server-side before persistence.
- [x] Imports with parser errors are rejected rather than partially persisted.
- [x] Mapping + optional 876 Storage file ID are retained as provenance; raw contents are not stored in Billing.
- [x] Normalized lines converge on the existing dedupe/rule/matching pipeline.
- [x] Focused parser tests added for signed JMD, debit/credit, reversed direction, comma-decimal formatting, quoted CSV, malformed rows, and structural quote errors. **Not run locally yet.**
- [ ] Saved/reusable mapping profiles remain after parser contract stabilizes.
- [ ] Actual Storage upload host flow remains to be wired in Billing UI.

### `@876/billing` SDK

- [x] Banking engine public types.
- [x] Runtime Zod response schemas for Banking engine resources.
- [x] Banking resources for statement imports/lines, matching, transfers, rules, and reconciliations.
- [x] Raw statement `previewFile()` and `importFile()` methods.
- [x] Banking resources registered on `create876Client`.
- [x] Banking type barrel exports added.
- [x] Bank account/transaction create/update now preserve full API resources rather than collapsing to minimal created-resource shapes.
- [x] Focused Banking SDK tests added. **Not run locally yet.**
- [ ] Local typecheck/tests must confirm barrel names, runtime schemas, and request/response parity.

## Phases

### Phase 0 — Contract and run tracking

- [x] Read repository rules and establish this plan/tracker/handoff.
- [x] Work on user-authorized `feature/banking` branch.
- [ ] Add durable Banking architecture ADR after schema/API contracts settle.

### Phase 1 — Country-aware Core financial directory

- [x] Country-aware Prisma model and Core migration.
- [x] API schema/serializer/repository/service parity.
- [x] Country-scoped duplicate bank codes.
- [x] Branch/bank ownership validation.
- [x] Compatibility backfill existing directory bank rows to `JM`.
- [x] Focused new regression tests authored (not yet executed).
- [ ] Wire bank-specific `bankListQuerySchema` into `/directory/banks` without broadening generic directory queries.
- [ ] Update any older financial-directory test fixtures/expectations that still reflect the pre-country Bank response shape.

### Phase 2 — Versioned Jamaica bank/branch catalog

- [ ] Add versioned institution/branch catalog format.
- [ ] Seed Jamaican institutions from authoritative BOJ/APL references.
- [ ] Seed branch transit/routing data with revision/provenance metadata.
- [ ] Keep seeding idempotent and explicit; never mutate reference data at service boot.
- [ ] Do not require other countries to use Jamaica's routing shape.

### Phase 3 — Billing account / Core directory association

- [x] Persist opaque Core bank/branch IDs without FKs.
- [x] Expose IDs through Billing API and SDK.
- [x] Keep branch optional.
- [ ] Add a dedicated bounded Core-directory client/host validation path when account-creation UI lands.
- [ ] Decide full bank-account-number security/storage policy before exposing full numbers; current last-4 metadata remains the compatibility surface.

### Phase 4 — Statement upload MVP

- [x] CSV/TSV parser + mapping.
- [x] Preview workflow.
- [x] Signed and debit/credit layouts.
- [x] Precision-aware minor-unit conversion.
- [x] Server-side reparse on import.
- [x] Storage provenance field supported without raw-content persistence.
- [x] Parser tests authored (not yet executed).
- [ ] Add saved mapping profiles after real statement samples validate the generic mapping shape.
- [ ] Wire Billing UI upload -> optional 876 Storage -> preview -> import.

### Phase 5 — Matching

- [x] Candidate scoring, match, multi-match, unmatch.
- [x] Account/type/amount invariants and concurrent remaining-amount re-check.
- [ ] Add focused API/SDK behavior tests beyond current SDK path tests and tune deterministic scoring only from real statement evidence.

### Phase 6 — Categorization and transfers

- [x] Manual cash categorization foundation.
- [x] Same-currency transfers.
- [ ] Customer-payment categorization must call canonical Payment owner.
- [ ] Add refund/bank-fee/interest handlers only through canonical owners.
- [ ] Leave Expense categorization disabled until canonical Expense CRUD exists.

### Phase 7 — Rules

- [x] Rule CRUD, priority, ALL/ANY matching, account targeting, recognition provenance.
- [ ] Auto-categorization only through canonical command handlers.
- [ ] Rule preview/test UX before bulk application.

### Phase 8 — Reconciliation

- [x] Draft/list/retrieve/complete/reopen.
- [x] Reconcile booked cash, not raw statement lines.
- [x] Zero-difference completion invariant.
- [x] Unsafe older-period reopen guard.
- [ ] Reporting/export + final UX.

### Phase 9 — Deposits / clearing

- [x] Data-model foundation exists.
- [ ] Use existing `UNDEPOSITED_FUNDS`; do not invent another clearing abstraction.
- [ ] Implement batching only without double-booking Payment/BankTransaction semantics.

### Phase 10 — SDK and Billing product UI

- [x] Banking SDK resources/types wired in code; local verification pending.
- [x] Focused SDK tests authored; local execution pending.
- [ ] Build account creation flow: country -> bank -> branch -> account details.
- [ ] Build statement upload/mapping/preview/import UI before any feed-connect UX.
- [ ] Build Banking inbox and match/categorize/exclude flows.
- [ ] Build reconciliation UI.
- [ ] Keep data fetching/guards in Billing host composition; shared UI remains presentation-only.

### Phase 11 — Additional deterministic formats

After CSV/TSV is proven:

- [ ] OFX
- [ ] QIF
- [ ] CAMT.053 / CAMT.054
- [ ] MT940
- [ ] PDF/OCR only later; never make OCR a Banking prerequisite.

### Phase 12 — Optional live-feed boundary

Deferred from MVP.

- [ ] Review existing finance/provider connection infrastructure before creating any new connection abstraction.
- [ ] Add provider-neutral connection/account mapping only when a real provider is selected.
- [ ] Normalize feed transactions into the same `BankStatementLine` pipeline.

### Phase 13 — Verification and review

- [x] New Core service regression tests authored. **Not run.**
- [x] New parser tests authored. **Not run.**
- [x] New Banking SDK tests authored. **Not run.**
- [ ] Validate both Prisma schema sets and migration drift.
- [ ] Apply both new hand-written migrations to a disposable database.
- [ ] Run Core/Billing/SDK typecheck, lint, tests, builds, and API contract checks.
- [ ] Repair older Core financial test fixtures that expect the previous Bank response shape if the suite fails there.
- [ ] Review diff for unsafe casts, swallowed errors, duplicated abstractions, accidental cross-service coupling, and compatibility residue.
- [ ] Write final GPT-Web report with exact verification state.

## Explicit compatibility decisions

### `BankTransaction.status`

Keep the existing `UNCATEGORIZED | CATEGORIZED | MATCHED | EXCLUDED` public field for compatibility. New external-evidence workflow uses `BankStatementLine.status`.

### Core directory vs Billing bank accounts

Do not merge these models. Core directory `BankAccount` is shared directory/reference data; Billing `BankAccount` is the tenant's financial account. Billing references Core `Bank` / `BankBranch` via opaque IDs only.

### Existing Jamaica-oriented directory data

Existing Core bank rows are backfilled to `JM`, but all steady-state contracts remain country-aware.

## Known dependencies / deferred scope

- Canonical Expense CRUD is still required before expense categorization.
- Full bank-account-number storage/display requires an explicit sensitive-data decision.
- Live-feed provider selection is deferred.
- Jamaica catalog completeness must come from authoritative source ingestion, not guessed branch lists.

## Local orchestrator resume order

1. Read this plan, `tracker.md`, and `review-handoff.md`.
2. Diff `feature/banking` against `main`; preserve all landed work.
3. Run Core + Billing Prisma generation/validate/drift checks first and repair connector-authored schema/type errors.
4. Apply both new migrations to a disposable database.
5. Run Core API typecheck/lint/tests/build; update the older `financial.test.ts` fixtures for the new country-aware Bank shape if needed.
6. Run Billing API typecheck/lint/boundaries/tests/build/contract checks, including the new statement parser tests.
7. Run `@876/billing` typecheck/tests, including the new Banking resource tests.
8. Wire `bankListQuerySchema` to `/directory/banks` if the bank selector is being built in this phase.
9. Add the versioned Jamaica catalog + idempotent seed path.
10. Build Billing account setup + statement upload/mapping/preview/import UI.
11. Only after statement-first MVP is stable, consider additional formats and live feeds.

## Verification commands

These have **not** been executed by GPT-Web. Use the current repo scripts as authority if names differ.

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

Also run the actual Core Prisma validate/drift/migration scripts defined in `apps/api/package.json`. Apply both new migrations to a disposable/local database before merge.

## Reports

| Report | Status |
| --- | --- |
| `reports/gpt-web/2026-09-12-banking-foundation.md` | pending |

## Handoff state

Work remains active on `feature/banking`. GPT-Web must not open a PR.

Substantial connector-authored code has **not** had local Prisma generation/validation, migration application, typecheck, lint, tests, build, or API contract verification. Tests being present in the branch does not mean they pass. Treat the branch as implementation-in-progress until the local orchestrator runs the verification matrix and records/fixes the results.