# Review / Orchestrator Handoff — 876 Banking

Read `plan.md` first, then `tracker.md`.

## Branch

`feature/banking`

Do not open a PR on behalf of GPT-Web. The local orchestrator owns verification,
repair, commit consolidation/review, and eventual PR/merge decisions.

## Important architectural decision

This is now a **statement-first Banking implementation**. Caribbean/Jamaican
businesses must be able to use Banking end-to-end with downloaded/uploaded bank
statements even when no live feed exists.

Core API owns the shared country-aware bank/branch directory. Billing owns an
organization's ledger bank account and Banking workflows. Billing must store
opaque Core bank/branch IDs only; do not add cross-database FKs or duplicate Core
institution/branch records.

## Accounting boundary

Do not collapse these:

- `BankStatementLine`: immutable external bank evidence.
- `BankTransaction`: canonical internally booked cash evidence.
- match: links external evidence to already-booked cash.
- categorization: creates missing canonical accounting operation, then matches.
- reconciliation: statement-period agreement over canonical cash movements.

Matching an existing payment must never create a second payment or mutate AR.

## Partial Core work to review first

`apps/api/prisma/schema/bank.prisma` has already been changed to add
`countryCode`, `clearingSystem`, and `institutionType`, and to scope `bankCode`
uniqueness by country. `Country` now relates to `Bank`.

Before treating that work as complete:

1. review Prisma naming/relations against repo rules;
2. add/validate a hand-written migration;
3. bring Core financial-directory schemas/serializers/repository/service into
   parity;
4. scope duplicate bank-code lookup by country;
5. fix directory bank-account writes so `branchId`, when present, must belong to
   the selected `bankId`.

## Jamaica model

Use generic Core fields:

- Bank institution/bank code -> `Bank.bankCode`;
- branch/transit code -> `BankBranch.transitNumber`;
- full domestic routing number where published -> `BankBranch.routingNumber`;
- clearing network/profile -> bank/catalog metadata.

Do not put Jamaican check-digit/routing composition logic inside generic Billing
code. Treat it as country/clearing-system reference-data behavior.

## Known unverified areas

All connector-authored implementation is unverified locally. In particular,
review:

- Billing Prisma relation validity and migration SQL;
- API route/schema response alignment;
- Billing SDK exports/resource schemas;
- match/reconciliation bigint and Prisma typing;
- migration constraint/index names;
- Core Bank country migration/backfill assumptions.

Run the repository-approved verification commands listed in `plan.md` and update
`tracker.md` with actual results.
