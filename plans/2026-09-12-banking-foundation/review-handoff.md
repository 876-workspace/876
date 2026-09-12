# Review / Orchestrator Handoff — 876 Banking

Read `plan.md` first, then `tracker.md`.

## Branch

`feature/banking`

Do not open a PR on behalf of GPT-Web. The local orchestrator owns verification,
repair, commit consolidation/review, and eventual PR/merge decisions.

## Product / architecture direction

This is a **statement-first Banking implementation**. Caribbean/Jamaican
businesses must be able to use Banking end-to-end with downloaded/uploaded bank
statements even when no live feed exists.

Core API owns the shared country-aware bank/branch directory. Billing owns an
organization's financial `BankAccount` and Banking workflows. Billing stores
opaque Core bank/branch IDs only; do not add cross-database foreign keys or copy
Core institution/branch rows into Billing.

## Accounting boundary

Do not collapse these:

- `BankStatementLine`: immutable external bank evidence.
- `BankTransaction`: canonical internally booked cash evidence.
- match: links external evidence to already-booked cash.
- categorization: creates a missing canonical financial operation, then matches.
- reconciliation: statement-period agreement over canonical booked cash.

Matching/unmatching must never duplicate a Payment or mutate customer AR.

## What is now implemented on the branch

### Core financial directory

- `Bank` is country-aware (`countryCode`, `clearingSystem`, `institutionType`).
- bank code uniqueness is `(countryCode, bankCode)`.
- `Country` relates to banks.
- hand-written Core migration exists with existing-bank backfill to `JM`.
- Core financial directory wire schemas, serializer, repository and service are
  updated to the country-aware shape.
- duplicate bank-code checks are country-scoped.
- directory bank-account create/update validates branch ownership by bank.
- `bankListQuerySchema` exists for future country-filtered listing, but the route
  still needs to be switched from the generic list schema before claiming the
  filter is live.

### Billing -> Core references

- Billing `BankAccount` now has optional opaque `directoryBankId` and
  `directoryBranchId` fields plus an additive migration.
- there are no Core foreign keys.
- Billing API/serializers and `@876/billing` bank-account contracts expose the
  IDs.
- updating the bank while retaining an unspecified old branch is guarded so the
  account cannot silently keep an incompatible branch reference.
- there is intentionally no remote Core lookup in the Billing identity gateway;
  add a dedicated bounded Core-directory client/host validation path when the
  account-setup UI is built.

### Statement upload MVP

- deterministic UTF-8 CSV/TSV parser.
- explicit column mapping.
- signed-amount and separate debit/credit layouts.
- configurable date formats, decimal separators, and thousands separators.
- configurable positive direction for credit-card-style statements.
- currency precision comes from Billing's enabled currency registry.
- decimal values convert to integer minor units without floating point.
- preview returns normalized lines plus row-level errors without persistence.
- import re-runs the same server parser and rejects the whole import when any row
  is invalid.
- normalized rows then enter the existing statement-import/dedupe/rule/matching
  pipeline.
- optional 876 Storage file ID + source name + mapping are retained as
  provenance; raw file text is not stored in Billing.
- focused parser tests were added but have not been executed locally.

### Billing SDK

- Banking engine types and runtime response schemas exist.
- Banking resources are registered on `create876Client`:
  `bankStatementImports`, `bankStatementLines`, `bankTransfers`,
  `bankReconciliations`, and `bankRules`.
- raw file preview/import methods are available through the SDK.
- full Banking account and manual transaction create/update responses now parse
  through their full schemas instead of collapsing to minimal `{ object, id }`
  shapes.
- focused Banking SDK tests were added but have not been executed locally.

## Local review priorities

1. Run Prisma generation/validation first for both Core and Billing. Repair any
   relation/type errors before touching UI.
2. Apply both new hand-written migrations to a disposable database and inspect
   the resulting indexes/FKs/defaults/backfills.
3. Run Core API typecheck/lint/tests/build and add tests for country-scoped bank
   uniqueness + branch ownership.
4. Run Billing API typecheck/lint/boundaries/tests/build/contract checks. Pay
   special attention to parser types, bigint transforms, Banking engine Prisma
   transaction types, and response schema alignment.
5. Run `@876/billing` typecheck/tests. Verify the Banking barrel exports and the
   new resource response schemas.
6. Wire the existing `bankListQuerySchema` to the `/directory/banks` route only
   if desired; do not add `country_code` to every directory resource query.
7. Add the versioned Jamaica institution/branch catalog from authoritative
   BOJ/APL data before building the final account selector UI.
8. Build account setup and statement upload/preview/import UX before considering
   live-bank-feed UX.

## Jamaica model

Use generic Core fields:

- institution/bank code -> `Bank.bankCode`;
- branch/transit code -> `BankBranch.transitNumber`;
- full domestic routing number where published -> `BankBranch.routingNumber`;
- clearing profile/network -> bank/catalog metadata.

Do not put Jamaican routing/check-digit composition logic inside generic Billing
code. Country/clearing-system rules belong to the reference catalog layer.

## Known unverified areas

All connector-authored implementation remains locally unverified. In particular,
review:

- Core and Billing Prisma schema validity after generation;
- hand-written migration SQL and constraint/index names;
- API route/schema response alignment;
- Billing SDK barrel exports/resource schemas;
- statement parser tests and date/number edge cases;
- match/reconciliation bigint and Prisma transaction typing;
- exact Core migration assumptions for existing Jamaican bank rows.

Run the repository-approved verification commands listed in `plan.md`, repair all
failures, and record actual results in `tracker.md` before merge.
