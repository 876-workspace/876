# Implementation Plan: 876 Banking Engine

**Run ID:** `2026-09-12-banking-foundation`  
**Branch:** `feature/banking`  
**Status:** IMPLEMENTATION_COMPLETE_AWAITING_LOCAL_VERIFICATION  
**Direction:** statement-first, country-aware banking; live feeds deferred

## Objective

Build Banking as a Billing-owned financial subsystem that is useful without Plaid-style aggregation. The Caribbean/Jamaica MVP starts with uploaded statements, normalization, matching, categorization, and reconciliation while tenant accounts reference Core-owned country-aware bank and branch identity.

A future feed is only another source of `BankStatementLine` evidence. It does not define the Banking model.

## Final bounded-context contract

### Core API owns reusable financial-institution reference data

```text
Country
  -> Bank
      -> BankBranch
          -> optional DirectoryAddress
```

Core owns canonical institution/branch identity, country, clearing-system metadata, routing/transit attributes, and future reference catalogs.

Important final distinction: **routing identity is not the same thing as physical location**. A trusted clearing catalog can prove that a branch/transit/routing number exists even when Core does not yet have a structured/geocoded location for it. `BankBranch.addressId` is therefore optional. We do not invent coordinates to satisfy a schema.

`Bank.bankCode` is country-scoped rather than globally unique.

### Billing owns tenant financial accounts and financial activity

```text
Tenant BankAccount
  -> optional opaque Core bank id
  -> optional opaque Core branch id
  -> BankTransaction booked-cash evidence
  -> BankStatementLine external evidence
  -> matches / categorization / rules / reconciliation
```

Billing never creates a database FK into Core. Core IDs remain opaque strings. A branch is optional because not every account type/country uses physical branches.

### Statement evidence is separate from booked cash

- `BankTransaction` is canonical internally booked cash evidence.
- `BankStatementLine` is immutable external evidence from file/feed/API.
- Matching links evidence to existing booked cash; it never recreates Payments, Refunds, Sales Receipts, transfers, or ledger entries.
- Categorization creates a supported missing canonical financial operation, then links the statement line to its resulting booked cash.
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
14. Routing/transit reference data must never require fabricated physical/geocoded location data.
15. An import preview is valid only for the exact file + mapping that produced it.

## Implemented phases

### Phase 0 — Contract and run tracking

- [x] Read repository rules and establish plan/tracker/handoff.
- [x] Work only on user-authorized `feature/banking`.
- [x] Keep verification claims separate from authored code/tests.

### Phase 1 — Country-aware Core financial directory

- [x] `Bank` made country-aware in Prisma.
- [x] Added `countryCode`, `clearingSystem`, and `institutionType`.
- [x] `Country` -> `Bank` relation.
- [x] Bank-code uniqueness changed to `(countryCode, bankCode)`.
- [x] Additive Core migration with compatibility backfill for existing Jamaica-oriented rows.
- [x] Directory Zod contracts, serializers, repository, service, and controller flow updated.
- [x] `/directory/banks` uses `bankListQuerySchema`; `country_code` filtering is live.
- [x] Country-scoped duplicate code handling.
- [x] Bank/branch ownership validation for Core directory bank accounts.
- [x] Existing route test suite updated for the country-aware response/lookup sequence.
- [x] Focused country-code and branch-ownership tests authored.

### Phase 2 — Jamaica routing catalog and reproducible seed

- [x] Versioned catalog at `apps/api/data/financial/jamaica-ach-2026-03.json`.
- [x] Catalog records source revision/provenance.
- [x] Validates Jamaica routing composition: 5-digit branch transit + 3-digit institution code + 1 check digit -> 9-digit ABA/routing value.
- [x] Idempotent Core seed path; never mutates reference data at service boot.
- [x] Tombstoned institutions/branches are preserved.
- [x] Missing routing branches are created on a fresh database.
- [x] Physical `DirectoryAddress` is optional for routing-only branches.
- [x] Additive Core migration makes `bank_branches.address_id` nullable.
- [x] Core API serializes routing-only branches with null address fields.
- [x] Source free-form addresses remain in the versioned catalog and are not coerced into fake coordinates.
- [x] Seed regression tests authored.

### Phase 3 — Billing account / Core directory association

- [x] Billing `BankAccount` stores opaque `directoryBankId` / `directoryBranchId` without cross-service FKs.
- [x] Additive Billing migration.
- [x] Billing API and SDK contracts expose directory IDs.
- [x] Branch remains optional in the underlying model.
- [x] Dedicated Billing API Core-directory provider boundary.
- [x] Bounded timeout/retry behavior on outbound Core reads.
- [x] Billing directory proxy endpoints/resources for bank and branch options.
- [x] Account create/update validates bank existence and branch ownership remotely.
- [x] Changing a bank while silently retaining an incompatible branch is rejected.
- [x] Full bank-account number is still not stored by this flow; only last-4 metadata remains until sensitive-data policy is explicit.

### Phase 4 — Statement upload MVP

- [x] UTF-8 CSV/TSV parser.
- [x] Explicit column mapping contract.
- [x] Signed amount and split debit/credit layouts.
- [x] Date format mapping.
- [x] Decimal/thousands separator mapping.
- [x] Positive-direction mapping for reversed sign conventions.
- [x] Currency precision resolved by Billing and converted to minor units without floating point.
- [x] Row-level parse errors.
- [x] Non-persisting preview endpoint.
- [x] Import re-runs the server parser; client-normalized rows are never trusted.
- [x] Parser errors block persistence rather than partially importing.
- [x] Mapping + optional opaque 876 Storage file ID retained as provenance; raw statement content is not stored in Billing.
- [x] Parser tests authored.

### Phase 5 — Matching and statement inbox

- [x] Deterministic candidate scoring.
- [x] Match, multi-match, unmatch.
- [x] Serializable remaining-amount re-check for concurrent matching.
- [x] Exclude/restore.
- [x] Statement workspace exposes evidence separately from booked cash.
- [x] Initial statement evidence is server-loaded; browser reads are used for interaction/refresh rather than first paint.

### Phase 6 — Categorization and transfers

- [x] Manual deposit/withdrawal categorization through canonical Banking commands.
- [x] Same-currency transfer foundation.
- [x] Unsupported canonical-owner actions are not faked inside Banking.

Customer Payment, Refund, bank fee, interest, and Expense actions remain follow-up integrations through their owning financial resources; Banking must not invent parallel accounting records.

### Phase 7 — Rules

- [x] Rule CRUD foundation.
- [x] Priority, ALL/ANY matching, account targeting, recognition provenance.
- [x] Recognize-only behavior available.

Rule authoring/preview UI and broader auto-categorization remain follow-up scope.

### Phase 8 — Reconciliation

- [x] Draft/list/retrieve/complete/reopen API/SDK foundation.
- [x] Reconcile booked cash rather than raw statement lines.
- [x] Zero-difference completion invariant.
- [x] Unsafe older-period reopen guard.
- [x] Billing reconciliation route/workspace added.
- [x] Period transaction selection, human decimal balance parsing without floats, history, complete, and reopen flows.

Reporting/export remains follow-up scope.

### Phase 9 — Deposits / clearing

- [x] Data-model foundation retained.
- [x] Existing `UNDEPOSITED_FUNDS` remains the clearing concept; no duplicate abstraction introduced.

Batching workflows remain follow-up scope until their product requirements are concrete.

### Phase 10 — SDK and Billing product UI

- [x] Banking SDK resources/types/runtime schemas wired to `create876Client`.
- [x] Focused SDK tests authored.
- [x] Bank-account create/edit flow uses Core directory IDs.
- [x] Initial Jamaica bank options server-loaded according to host data-loading rules.
- [x] Bank -> branch remains an interactive dependent request.
- [x] Edit flow server-primes current branch options.
- [x] Statement upload/mapping/preview/import UI.
- [x] Mapping UI covers number format and external transaction ID fields supported by the server contract.
- [x] File/mapping changes invalidate an old preview before import.
- [x] Statement inbox/match/categorize/exclude/restore/unmatch UI.
- [x] Reconciliation UI.
- [x] Host owns auth/transport/data loading; shared UI remains presentation-focused.

## Deliberately deferred phases

The following are **not blockers** for the statement-first Jamaica MVP and should not be treated as unfinished work from this run.

### Additional deterministic formats

- [ ] OFX
- [ ] QIF
- [ ] CAMT.053 / CAMT.054
- [ ] MT940
- [ ] PDF/OCR only later; OCR must never become a Banking prerequisite.

### Optional live-feed boundary

- [ ] Select a real provider only when product/business access exists.
- [ ] Reuse existing provider/connection infrastructure before creating any new connection abstraction.
- [ ] Normalize feed transactions into the same `BankStatementLine` pipeline.

### Product follow-ups

- [ ] Saved/reusable statement mapping profiles based on real statement samples.
- [ ] Billing host upload of original statement files into 876 Storage and passing returned `sourceFileId`.
- [ ] Trusted structured/geocoded branch-location enrichment from an authoritative location source.
- [ ] Additional country catalogs and country-selection UX after those catalogs exist.
- [ ] Customer-payment/refund/fee/interest categorization through canonical owners.
- [ ] Expense categorization after canonical Expense CRUD exists.
- [ ] Rule authoring/preview UI and carefully gated auto-categorization.
- [ ] Reconciliation reporting/export.
- [ ] Full bank account number handling after an explicit sensitive-data policy.

## Verification phase — still required locally

GPT-Web did **not** execute Prisma generation/validation, migrations, typecheck, lint, tests, builds, or API contract checks because the repository operating rules prohibit those claims from this connector seat.

Authored coverage includes:

- Core financial-directory route regression tests updated for country-aware banks.
- Focused country-scoped bank/branch-ownership tests.
- Financial-directory catalog/seed tests, including routing-only branch creation and tombstone preservation.
- Statement parser tests.
- Banking SDK resource tests.

### Local verification order

1. Read this plan, `tracker.md`, and `review-handoff.md`.
2. Diff `feature/banking` against `main`; preserve the architecture above.
3. Generate/validate both Prisma clients and run migration drift checks.
4. Apply the Core country-aware bank migration, Core optional-branch-location migration, and Billing banking migrations to disposable databases.
5. Run Core API typecheck/lint/tests/build.
6. Run Billing API typecheck/lint/boundaries/tests/build/API contract checks.
7. Run `@876/billing` typecheck/tests.
8. Run Billing app typecheck/lint/build and smoke the routes below.
9. Repair only demonstrated failures; do not collapse statement evidence into booked cash or duplicate Core reference data in Billing.
10. Record exact command results before merge.

### Route smoke matrix

- `/banking`
- `/banking/new`
- `/banking/:accountId`
- `/banking/:accountId/edit`
- `/banking/:accountId/statements/new`
- `/banking/:accountId/transactions/new`
- `/banking/:accountId/transactions/:transactionId/edit`
- `/banking/:accountId/reconcile`

## Suggested verification commands

Use current package scripts as authority if names differ.

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

Also run the actual Core Prisma validate/drift/migration scripts defined in `apps/api/package.json` and the Billing app's current typecheck/lint/build scripts.

## Reports

| Report | Status |
| --- | --- |
| `reports/gpt-web/2026-09-12-banking-foundation.md` | authored |

## Handoff state

The implementation pass is complete on `feature/banking`; local verification is the remaining merge gate. No PR was opened by GPT-Web.
