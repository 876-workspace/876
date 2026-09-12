# 876 Banking Implementation Tracker

**Branch:** `feature/banking`  
**Source of truth:** `plans/2026-09-12-banking-foundation/plan.md`  
**Status:** IMPLEMENTATION_COMPLETE_AWAITING_LOCAL_VERIFICATION

## Current direction

- Statement upload/import is the MVP path.
- Live bank feeds are deferred and optional.
- Core API owns country-aware `Bank` / `BankBranch` reference data.
- Routing identity and physical/geocoded location are separate concerns. A branch can exist as authoritative routing reference data before a trusted `DirectoryAddress` is available.
- Billing owns tenant financial `BankAccount` records and stores only opaque Core bank/branch IDs; no cross-database foreign keys.
- Jamaica is the first populated country profile, not a hard-coded global banking model.
- Preview and import use the same deterministic server parser; import never trusts client-normalized rows.
- Imported statement evidence stays separate from canonical booked cash until matching/categorization.

## Implemented

### Banking engine

- [x] Billing Banking engine Prisma foundation + additive migration.
- [x] Statement imports/lines/matches foundation.
- [x] Deterministic dedupe and match scoring.
- [x] Serializable remaining-amount validation during matching.
- [x] Exclude/restore/unmatch foundations.
- [x] Manual cash categorization foundation.
- [x] Transfer foundation.
- [x] Rule/recognition foundation.
- [x] Reconciliation foundation with zero-difference completion and guarded reopen.
- [x] Billing bank/books balance split and opening-balance projection.

### Country-aware Core directory

- [x] Core `Bank` Prisma schema made country-aware.
- [x] Core `Country` relation to banks added.
- [x] Core hand-written country-aware bank migration added.
- [x] `bank_code` uniqueness scoped to `(countryCode, bankCode)`.
- [x] Core directory schemas/serializers/repository/service updated.
- [x] `/directory/banks?country_code=JM` uses the bank-specific query schema.
- [x] Country-scoped duplicate bank-code checks.
- [x] Core bank/branch ownership validation for directory bank accounts.
- [x] Existing Core financial-directory route tests updated for the country-aware Bank response and country lookup.
- [x] Focused country/ownership regression tests authored.
- [x] `BankBranch.addressId` made optional so authoritative routing/transit rows do not require invented geocoordinates.
- [x] Bank-branch serialization supports `address_id: null` / `address: null` for routing-only rows.
- [x] Additive migration authored for optional branch location.

### Jamaica reference catalog

- [x] Versioned `jamaica-ach-2026-03.json` catalog retained in Core.
- [x] Catalog validates 3-digit institution code, 5-digit branch transit, 1-digit check digit, and 9-digit composed ABA/routing number.
- [x] Idempotent financial-directory seed path.
- [x] Seed creates missing routing-only branches on a fresh database rather than requiring pre-existing geocoded branch rows.
- [x] Tombstoned banks/branches are preserved rather than silently resurrected.
- [x] Source free-form addresses stay in versioned source data until a trusted structured/geocoded enrichment path is available.
- [x] Focused catalog/seed regression tests authored.

### Billing -> Core directory boundary

- [x] Billing opaque `directoryBankId` / `directoryBranchId` persistence + migration.
- [x] Billing API/SDK bank-account contracts expose Core directory IDs.
- [x] Dedicated Billing API Core-directory provider boundary with bounded timeout/retry behavior.
- [x] Billing directory proxy resources for banks and branches.
- [x] Account create/update remotely validates bank existence and branch ownership.
- [x] Changing a bank while retaining an incompatible branch is rejected.

### Statement ingestion

- [x] Raw CSV/TSV parser + explicit mapping contract.
- [x] Signed amount and debit/credit layouts.
- [x] Configurable date formats.
- [x] Configurable decimal/thousands separators.
- [x] Currency-precision-aware decimal -> minor-unit conversion without floating point.
- [x] Non-persisting statement preview endpoint.
- [x] File import command re-runs parser server-side before canonical import.
- [x] Invalid file rows block import; no partial persistence.
- [x] Optional Storage file ID/mapping provenance retained without raw-content persistence.
- [x] Statement upload UI supports date, amount layout, decimal/thousands separators, description, payee, reference, external transaction ID, and running balance mapping.
- [x] Changing a file or mapping invalidates the old preview so an unpreviewed mapping cannot be imported accidentally.
- [x] Focused statement parser tests authored.

### SDK and Billing UI

- [x] Banking SDK runtime schemas/resources/types registered on `create876Client`.
- [x] Bank account/transaction create/update SDK parsing preserves full API resources.
- [x] Focused Banking SDK resource tests authored.
- [x] Bank-account setup UI uses Core directory bank/branch references.
- [x] Initial bank options are server-loaded; browser requests are limited to dependent bank -> branch interaction.
- [x] Edit account server-primes current bank and branch options.
- [x] Statement evidence workspace is server-primed and supports match/categorize/exclude/restore/unmatch actions.
- [x] Reconciliation route/workspace exists and no longer leaves the account-page `Reconcile` action pointing at a missing route.
- [x] Reconciliation UX selects booked transactions for a period, parses balances without floating point, and exposes complete/reopen through the canonical API.

### Documentation

- [x] Banking model documentation separates external statement evidence from booked cash.
- [x] Plan/tracker/handoff refreshed to match the actual branch state.
- [x] Final GPT-Web implementation report authored.

## Authored but not executed from this connector seat

- [ ] Core Prisma generation/validation/drift checks.
- [ ] Core migration application to a disposable database.
- [ ] Core typecheck/lint/tests/build.
- [ ] Billing API Prisma generation/validation/drift checks.
- [ ] Billing API migration application to a disposable database.
- [ ] Billing API typecheck/lint/boundaries/tests/build/API contract checks.
- [ ] `@876/billing` typecheck/tests.
- [ ] Billing app typecheck/lint/build and route smoke tests.

The repository GPT-Web rules prohibit claiming those checks from this connector environment. Presence of tests in the branch does **not** mean they pass.

## Deliberately deferred / follow-up scope

These are not blockers for the statement-first Jamaica MVP:

- [ ] Real bank-feed provider integration.
- [ ] PDF/OCR statement ingestion.
- [ ] OFX/QIF/CAMT/MT940 adapters after real samples justify them.
- [ ] Saved/reusable statement mapping profiles.
- [ ] Persisting the original statement file through 876 Storage from the host UI; the API already accepts an opaque `sourceFileId`.
- [ ] Trusted structured/geocoded branch-location enrichment from authoritative location data.
- [ ] Customer-payment/refund/fee/interest categorization actions through their canonical resource owners.
- [ ] Expense categorization until canonical Expense CRUD exists.
- [ ] Rule authoring/preview UI and any auto-categorization rollout.
- [ ] Reconciliation reporting/export.
- [ ] Full bank account number storage/display until sensitive-data policy is explicit.
- [ ] Additional country catalogs and a multi-country selector once those catalogs exist.

## Local verification order

1. Generate/validate both Prisma clients and check migration drift.
2. Apply the Core country-aware bank migration, Core optional-branch-location migration, and Billing banking migrations to disposable databases.
3. Run Core API typecheck/lint/tests/build, including `financial.test.ts`, `financial-country.test.ts`, and `financial-directory.test.ts`.
4. Run Billing API typecheck/lint/boundaries/tests/build/API contract checks.
5. Run `@876/billing` typecheck/tests.
6. Run Billing app typecheck/lint/build plus route smoke tests for account create/edit, statement import, account workspace, and reconciliation.
7. Fix only failures demonstrated by those checks; preserve the statement-first/Core-directory architecture.
8. Record exact command results in the run report before merge.

## PR state

No PR was opened by GPT-Web.
