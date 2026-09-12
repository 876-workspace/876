# 876 Banking Implementation Tracker

**Branch:** `feature/banking`  
**Source of truth:** `plans/2026-09-12-banking-foundation/plan.md`  
**Status:** IN_PROGRESS

## Current direction

- Statement upload/import is the MVP path.
- Live bank feeds are deferred and optional.
- Core API owns country-aware `Bank` / `BankBranch` reference data.
- Billing owns tenant financial `BankAccount` records and stores only opaque Core
  bank/branch IDs; no cross-database foreign keys.
- Jamaica is the first fully populated country profile, not a hard-coded global
  banking model.

## Landed

- [x] Billing Banking engine Prisma foundation.
- [x] Hand-written Billing Banking migration.
- [x] Statement imports/lines/matches foundation.
- [x] Deterministic dedupe/match scoring.
- [x] Serializable remaining-amount validation during matching.
- [x] Exclude/restore/unmatch foundations.
- [x] Basic manual categorization foundation.
- [x] Transfer foundation.
- [x] Rule/recognition foundation.
- [x] Reconciliation foundation.
- [x] Billing bank/books balance split and opening-balance projection.
- [x] Initial Billing SDK Banking contract work.
- [x] Core `Bank` Prisma schema made country-aware.
- [x] Core `Country` relation to banks added.
- [x] Plan updated for Caribbean statement-first direction.

## In progress now

- [ ] Core migration for country-aware bank directory.
- [ ] Core directory API schema/serializer/repository/service parity.
- [ ] Bank/branch ownership validation for Core directory bank accounts.
- [ ] Billing opaque Core bank/branch references.

## Next

- [ ] Versioned Jamaica bank/branch catalog + idempotent seed path.
- [ ] CSV/TSV raw parser, mapping, preview, commit workflow.
- [ ] Finish Billing SDK resources/exports.
- [ ] Billing account setup and statement inbox UI.
- [ ] Reconciliation/reporting UX.
- [ ] Additional deterministic statement formats.

## Deferred

- [ ] Real bank-feed provider integration.
- [ ] PDF/OCR statement ingestion.
- [ ] AI categorization.
- [ ] Expense categorization until canonical Expense CRUD exists.

## Verification

No local verification has been executed from the GPT-Web connector seat.
The local orchestrator must run Prisma validation/drift/migration checks,
typecheck, lint, tests, builds, API contract checks, and disposable-database
migration application before merge.
