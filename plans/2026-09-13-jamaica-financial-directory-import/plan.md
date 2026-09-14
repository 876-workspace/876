# Implementation Plan: Jamaica financial directory import (banks, branches, credit unions)

- Run ID: `2026-09-13-jamaica-financial-directory-import`
- Status: COMPLETED
- Base: `main` @ `fbf4a0e0d`
- Branch: `feature/jamaica-financial-directory-import`
- Origin: Codex session `01a0988a-0efe-7a92-88e5-2fbf85c4fcae` (plan mode, 2026-09-13), reviewed against the
  repository before implementation. Follows the `plans/2026-09-12-banking-foundation/` directory work
  (country-aware `Bank`/`BankBranch`, versioned Jamaica ACH catalog, idempotent `financialDirectory` seed).

## Objective

Import the complete Jamaican financial-institution directory — commercial banks, building societies,
merchant banks, their branches, and credit unions with their branches — through the existing versioned
catalog + explicit seed pipeline, and expose the newly captured public contact/provenance data through the
existing directory API.

The schema, seed and API work lands in this run; **branch-level enrichment and credit-union branch data
are data tasks whose progress the catalog and a completeness audit report make explicit** (see
"Data honesty" below).

## Scope

| Area          | Change                                                                                                                                        |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Schema        | `Bank`, `BankBranch`, `CreditUnion`, `CreditUnionBranch` gain contact/provenance columns; `DirectoryAddress` coordinates become nullable      |
| Migration     | One additive, hand-written migration (`apps/api`), no destructive change                                                                      |
| Catalog       | `apps/api/data/financial/jamaica-directory-2026-09.json` (schema_version 2) carrying banks, branches, credit unions and credit-union branches |
| Seed          | Extended validation + idempotent upserts + summary counts + `auditFinancialDirectoryCatalog` completeness report                              |
| Directory API | New fields on bank, bank-branch, credit-union and credit-union-branch contracts (schemas, serializers, repository, service)                   |
| CLI           | `pnpm --filter @876/api node:seed --report` prints the catalog completeness audit without writing to the database                             |
| Tests         | Catalog validation, seed upsert/tombstone behavior, audit output, API serialization of the new fields                                         |

Explicitly out of scope: live scraping, recurring sync, geocoding/invented coordinates, a generic
"institution" table, Billing client changes, and any new endpoint. The existing directory routes carry the
new fields.

## Key decisions

1. **Controlled values live in one place.** `src/platform/financial-directory-vocabulary.ts` owns the
   institution types, bank/credit-union branch types and location statuses; both the catalog validator
   (seed) and the API Zod schemas import them. A seed-local copy would drift from the wire contract.
2. **`source_as_of` is a source date, `last_verified_at` is an app timestamp.** `source_as_of` is a
   `VarChar(10)` ISO `YYYY-MM-DD` copied from the source; `last_verified_at` is Unix seconds
   (`BigInt`), matching the repository's timestamp contract. The catalog stores both as ISO dates and the
   seed converts verification dates to Unix seconds.
3. **Credit unions get a stable identity key.** `CreditUnion.code` and `CreditUnionBranch.code` are
   nullable-unique varchar columns; the catalog requires them (lowercase slugs) so the seed upserts by a
   deterministic key instead of matching names. Nullable keeps the migration additive for any existing
   rows.
4. **Coordinates are never written by the seed.** `DirectoryAddress.latitude/longitude` become nullable so
   a verified street address can be stored before trusted geocoding exists. The catalog stores structured
   addresses without coordinates.
5. **One catalog, not two.** The v1 `jamaica-ach-2026-03.json` routing rows are carried into
   `jamaica-directory-2026-09.json` unchanged and the ACH source stays cited; the v1 file is removed so
   there is exactly one reviewed snapshot.
6. **Tombstones are preserved, never resurrected.** Upserts keep the existing behavior: a soft-deleted
   row is reported in the summary and left alone.
7. **Billing client untouched.** Billing selects banks/branches by id and label only; the new fields are
   available through the API for future use and do not need a Billing contract change.

## Data honesty

The code is complete after this run; the data is not. The catalog must never carry invented values, so:

- Bank contact/provenance fields are populated only for institutions verified from official sources
  (bank websites, Bank of Jamaica, DCFS/JCCUL for credit unions) and carry `source_url`.
- Existing ACH routing rows keep their routing identity and stay routing-only until a trusted source
  publishes branch-level contact, hours or a structured address. `branch_type`/`status`/`phone`/`hours`
  remain `null` rather than guessed.
- Credit-union branches are populated only as far as an authoritative source is reviewed; where none is
  captured yet, `credit_union_branches` is empty and the completeness audit reports the gap against the
  institutions.
- `auditFinancialDirectoryCatalog` reports: institutions/branches missing contact, provenance or
  structured location, credit unions without branches, and statuses that are not `active`.

## Checklist

- [x] Vocabulary module + catalog v2 types and validation (`schema_version: 2`)
- [x] Prisma schema changes (`bank`, `bank-branch`, `credit-union`, `credit-union-branch`, `directory-address`)
- [x] Hand-written additive migration
- [x] Seed repository upserts (bank enrichment, branch enrichment + address, credit unions, credit-union branches)
- [x] Seed orchestration, summary counts, completeness audit
- [x] Catalog v2 data file (ACH baseline carried over + reviewed enrichment + credit unions)
- [x] Seed CLI `--report` mode
- [x] Directory API schemas, serializers, repository and service
- [x] Tests: catalog validation, seed behavior, audit, API serialization
- [x] Verification: `typecheck`, `lint`, `boundaries`, `test` for `@876/api`

## Verification commands

```bash
pnpm --filter @876/api typecheck
pnpm --filter @876/api lint
pnpm --filter @876/api boundaries
pnpm --filter @876/api test
pnpm --filter @876/api db:validate
```

## Review (orchestrator, 2026-09-14)

Codex `gpt-5.6-terra` (low) fixes, brief `briefs/codex/2026-09-13-seed-review-fixes.md`:

1. Seed adopts a pre-existing codeless credit union / credit-union branch by case-insensitive name; ambiguous matches throw.
2. Updates skip null enrichment/contact/provenance catalog values, so scraped or operator-entered data is never cleared by a reseed.

Verified: typecheck, lint (0 errors), full suite 2320 passed, db:validate. `boundaries` has 18 pre-existing errors identical on the untouched tree, none in directory/seeds.

Shared DB state: migration `20260913210000_financial_directory_enrichment` is already applied; 9 banks, 188 bank branches, 23 credit unions (all coded). 28 Bank of Nova Scotia branches (transit 99001–99028) exist in the DB with no source_url and are not in the catalog; the seed leaves them untouched pending a decision.

## Handoff state

- Branch cut from `main` before any change; nothing committed yet.
- No database is available in this environment, so migration application and a live seed run remain
  operator verification steps; the seed and API are covered by mocked unit tests.
