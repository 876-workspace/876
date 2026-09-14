# Tracker: Couriers package categories

- Run ID: `2026-09-14-couriers-package-categories`
- Branch: `feature/couriers-package-categories-v2`
- Base: `main` @ `debb9b1e97f794802001db4923dafb3ea2430c94`
- Status: `IN_PROGRESS`
- Last updated: 2026-09-14

## Completed

- [x] Read binding repo and GPT Web rules before implementation.
- [x] Re-audit current package/category/provisioning surfaces from the fresh `main` base.
- [x] Restore `PackageCategory` as a Prisma model over the existing baseline `package_categories` table.
- [x] Bind `Package.categoryId` to the category relation and add tenant relation.
- [x] Add additive migration for provisioning identity, description, sort order, archive timestamp, and indexes.
- [x] Make tenant category slug/provisioning identity compatible with archived rows.
- [x] Add canonical Couriers category error definitions to `@876/core`.
- [x] Add tenant-scoped category list/retrieve/create/update/archive API.
- [x] Implement create-missing category reconciliation that preserves tenant customization and can adopt an existing same-slug tenant row.
- [x] Add package-category API/reconciliation test coverage, including the admin reconciliation route.
- [x] Extend Package API schemas with `category_id` and lightweight category reference.
- [x] Add `category_id` package list filter.
- [x] Validate active tenant-owned categories on package create/update.
- [x] Migrate touched expected package failures to registered error values/results.
- [x] Add `@876/couriers` package-category schema and admin resource implementation.
- [x] Extend the canonical admin Package SDK schema with category fields.
- [x] Wire `packageCategories` into the Couriers admin client and public admin exports.
- [x] Add SDK tests for package category CRUD, reconciliation, package category fields, and filtering.
- [x] Register `package_category` in the Core application provisioning catalog for `876-couriers`.
- [x] Add a 26-category flat Couriers bootstrap catalog and build it into the one-time Couriers application manifest import.
- [x] Preserve `create_missing` / tenant-override semantics in provisioning resource construction.
- [x] Add provisioning builder/catalog coverage for the Couriers category defaults.
- [x] Add a server-only Couriers provisioning manifest loader from the published platform application manifest.
- [x] Add a dedicated package-category provisioning reconciliation API + SDK contract.
- [x] Reconcile published package-category defaults into new and existing Couriers tenants during onboarding.
- [x] Add registered onboarding errors for unavailable/failed package-category provisioning.
- [x] Add onboarding and manifest-loader tests for provisioning success, retry/idempotent existing-tenant behavior, missing config, malformed config, and reconciliation failure.

## In progress

- [ ] Re-audit the current root `/packages` and Package Categories settings UI against the fresh branch base before wiring presentation.
- [ ] Replace the Package Categories settings placeholder with tenant category management using the canonical SDK.
- [ ] Wire package list/category presentation without introducing another app-local category contract.

## Remaining UI work

- [ ] Replace the empty root package table data source with real Couriers SDK data.
- [ ] Add category display/filter to the package list.
- [ ] Add/create package detail and edit surfaces using the current shared list/detail route pattern.
- [ ] Add category selection to package create/edit.
- [ ] Surface package category in portal package views where supported by the canonical portal contract.

## Closeout

- [ ] Review the branch diff for duplicate local types, stale category helpers, compatibility residue, and raw/unregistered errors.
- [ ] Add the GPT Web implementation report with exact changed files and test cases.
- [ ] Record orchestrator verification commands and any expected migration/provisioning steps.
- [ ] Mark plan/tracker complete only after scoped implementation is committed.

## Verification state

GPT Web cannot execute repository commands. No typecheck, lint, test, build, Prisma validation, migration apply, provisioning import, or drift check is claimed as passing yet. Those must be run by the orchestrator before merge.
