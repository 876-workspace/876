# 876 Banking Implementation Tracker

**Branch:** `feature/banking`  
**Source of truth:** `plans/2026-09-12-banking-foundation/plan.md`  
**Status:** IN_PROGRESS

## Current direction

- Statement upload/import is the MVP path.
- Live bank feeds are deferred and optional.
- Core API owns country-aware `Bank` / `BankBranch` reference data.
- Billing owns tenant financial `BankAccount` records and stores only opaque Core bank/branch IDs; no cross-database foreign keys.
- Jamaica is the first fully populated country profile, not a hard-coded global banking model.
- Preview and import use the same deterministic server parser; import never trusts client-normalized rows.

## Landed

- [x] Billing Banking engine Prisma foundation + additive migration.
- [x] Statement imports/lines/matches foundation.
- [x] Deterministic dedupe and match scoring.
- [x] Serializable remaining-amount validation during matching.
- [x] Exclude/restore/unmatch foundations.
- [x] Manual cash categorization foundation.
- [x] Transfer foundation.
- [x] Rule/recognition foundation.
- [x] Reconciliation foundation.
- [x] Billing bank/books balance split and opening-balance projection.
- [x] Core `Bank` Prisma schema made country-aware.
- [x] Core `Country` relation to banks added.
- [x] Core hand-written country-aware bank migration added.
- [x] Core directory schemas/serializers/repository/service updated.
- [x] Country-scoped duplicate bank-code checks.
- [x] Core bank/branch ownership validation for directory bank accounts.
- [x] Billing opaque `directoryBankId` / `directoryBranchId` persistence + migration.
- [x] Billing API/SDK bank-account contracts expose Core directory IDs.
- [x] Raw CSV/TSV parser + explicit mapping contract.
- [x] Signed amount and debit/credit layouts.
- [x] Date and number-format mapping.
- [x] Currency-precision-aware decimal -> minor-unit conversion without floating point.
- [x] Non-persisting statement preview endpoint.
- [x] File import command re-runs parser server-side before canonical import.
- [x] Invalid file rows block import; no partial persistence.
- [x] Storage file ID/mapping provenance retained without raw-content persistence.
- [x] Banking SDK runtime schemas added.
- [x] Banking SDK resource bundle added and client registration started.
- [x] Plan refreshed for local orchestrator handoff.

## In progress now

- [ ] Finish `@876/billing` package exports for Banking resources/types/schemas.
- [ ] Add focused Banking SDK tests.
- [ ] Add statement parser tests.
- [ ] Reconcile any API/SDK schema mismatches found by local typecheck/contract checks.

## Next

- [ ] Core country-filtered bank listing if it fits directory conventions cleanly.
- [ ] Core tests for country-scoped bank uniqueness and branch ownership.
- [ ] Versioned Jamaica bank/branch catalog + idempotent seed path.
- [ ] Dedicated Core-directory validation client/host boundary for Billing account setup.
- [ ] Billing account setup UI: country -> bank -> branch -> account.
- [ ] Billing statement upload/mapping/preview/import UI.
- [ ] Banking inbox/matching/categorization UI.
- [ ] Reconciliation/reporting UX.
- [ ] Additional deterministic statement formats.

## Deferred

- [ ] Real bank-feed provider integration.
- [ ] PDF/OCR statement ingestion.
- [ ] AI categorization.
- [ ] Expense categorization until canonical Expense CRUD exists.
- [ ] Full bank account number storage/display until sensitive-data policy is explicit.

## Verification

No local verification has been executed from the GPT-Web connector seat.
The local orchestrator must run Prisma generation/validation/drift/migration checks,
typecheck, lint, tests, builds, API contract checks, and disposable-database
migration application before merge.
