# Review / Orchestrator Handoff — 876 Banking

Read `plan.md` first, then `tracker.md`.

## Branch and status

`feature/banking`

**Status:** implementation complete; local verification remains the merge gate.

Do not open a PR on behalf of GPT-Web. The local orchestrator owns Prisma generation/validation, migration application, typecheck, lint, tests, builds, contract checks, final repair, review, and eventual PR/merge decisions.

## Architecture to preserve

This is a statement-first Banking implementation. The Jamaica/Caribbean path must work with uploaded statements even when no live bank feed exists.

Core API owns country-aware financial-institution reference data. Billing owns each organization's financial accounts and banking workflows. Billing stores opaque Core bank/branch IDs only; do not add cross-database foreign keys or copy Core institution/branch rows into Billing.

Routing identity and physical location are separate concerns. A trusted routing catalog can establish a branch/transit/routing identity before Core has a trusted structured/geocoded physical address. `BankBranch.addressId` is optional for that reason. Do not invent coordinates just to persist routing data.

Keep external statement evidence separate from canonical booked cash. Matching links the two; it does not recreate payments or mutate receivables. Reconciliation operates on booked cash for a statement period.

## Implemented on the branch

### Core financial directory

- `Bank` is country-aware with `countryCode`, `clearingSystem`, and `institutionType`.
- bank-code uniqueness is `(countryCode, bankCode)` and existing Jamaica-oriented rows are backfilled to `JM` by the migration.
- `/directory/banks` uses the bank-specific query schema and supports `country_code` filtering.
- directory schemas, serializers, repository, service, and tests use the country-aware Bank shape.
- branch ownership is validated when directory bank accounts are written.
- `BankBranch.addressId` and nested address are nullable for routing-only reference rows.
- an additive Core migration drops the `bank_branches.address_id` NOT NULL requirement.
- routing-only branches serialize with null address fields.

### Versioned Jamaica reference catalog

- `apps/api/data/financial/jamaica-ach-2026-03.json` is the versioned routing catalog.
- catalog validation covers the Jamaica composition of 5-digit transit + 3-digit institution code + 1 check digit -> 9-digit routing value.
- the seed is explicit/idempotent and never runs as an implicit service-start mutation.
- missing routing branches are created on a fresh Core database without requiring pre-existing geocoded addresses.
- source free-form addresses remain source evidence until a trusted structured/geocoded enrichment flow exists.
- tombstoned banks/branches stay tombstoned.
- focused catalog/seed tests were authored but not executed from the connector seat.

### Billing / Core directory boundary

- Billing `BankAccount` stores optional opaque `directoryBankId` and `directoryBranchId` fields plus an additive migration.
- Billing API and SDK contracts expose those references.
- a dedicated bounded Core-directory provider handles bank/branch reads rather than overloading the identity gateway.
- account create/update validates bank existence and branch ownership through Core.
- changing a bank while silently retaining an incompatible branch is rejected.

### Statement import and Banking UI

- deterministic CSV/TSV parser with preview-before-import and server-side reparse.
- signed amount and split debit/credit layouts.
- date format, decimal separator, thousands separator, positive direction, description, payee, reference, external transaction ID, and running-balance mapping.
- exact minor-unit conversion without floating point.
- invalid rows block persistence instead of partially importing.
- changing file or mapping invalidates the prior preview.
- optional Storage file ID/source metadata are supported without persisting raw statement text in Billing.
- account create/edit server-loads initial bank options; browser lookup is limited to the dependent bank -> branch interaction.
- statement evidence is server-loaded on the account page and supports match/unmatch/categorize/exclude/restore interactions.
- the previously dangling `/banking/:accountId/reconcile` action now has a real page/workspace using the existing reconciliation API.
- reconciliation selects booked transactions by period, parses balances using exact minor-unit arithmetic, and exposes history/complete/reopen flows while the server enforces its invariants.

### SDK

- Banking engine types/runtime schemas/resources are registered on `create876Client`.
- Banking account and manual transaction create/update methods retain their full returned resources.
- focused SDK tests were authored but not executed locally.

## Local verification priorities

1. Generate/validate both Prisma clients and run drift checks.
2. Apply the Core country-aware-bank migration, Core optional-branch-location migration, and Billing Banking migrations to disposable databases.
3. Run Core API typecheck/lint/tests/build, including the financial-directory route, country/ownership, and catalog/seed tests.
4. Run Billing API typecheck/lint/boundaries/tests/build/API contract checks.
5. Run `@876/billing` typecheck/tests.
6. Run Billing app typecheck/lint/build and smoke `/banking/new`, account edit/detail, statement import/workspace, and reconciliation.
7. Fix only demonstrated failures and preserve the bounded contexts above.
8. Record exact command results before merge.

## Deliberately deferred, not merge blockers for this run

Live feeds, PDF/OCR, additional deterministic statement formats, saved mapping profiles, Storage upload of the original statement binary, trusted geocoded branch enrichment, other-country catalogs/selector UI, additional canonical-owner categorization actions, rule authoring UI, reconciliation export/reporting, and full bank-account-number storage remain follow-up work.

## Verification honesty

GPT-Web did not run Prisma generation/validation, migrations, typecheck, lint, tests, builds, or API contract checks. Tests present in the branch are authored coverage, not passing-test claims.

No PR was opened by GPT-Web.
