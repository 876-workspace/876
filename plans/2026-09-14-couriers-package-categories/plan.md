# Implementation Plan: Couriers package categories

- Run ID: `2026-09-14-couriers-package-categories`
- Branch: `feature/couriers-package-categories-v2`
- Base: `main` @ `debb9b1e97f794802001db4923dafb3ea2430c94`
- Status: `IN_PROGRESS`

## Overview

Add a simple, flat, tenant-owned package category system to 876 Couriers. Categories classify the primary contents of a package and remain distinct from `PackageType`, which describes the physical container. Platform defaults are provisioned through the existing application provisioning control plane and materialized into Couriers tenants without overwriting tenant customization.

The Couriers category model is intentionally one level deep. Hierarchical product taxonomy remains owned by 876 Commerce and is out of scope.

## Objectives

1. Add a first-class `PackageCategory` model and bind the existing `Package.categoryId` field to it.
2. Add a tenant-scoped package-category API with registered errors and soft-archive semantics.
3. Thread `categoryId` and a lightweight category reference through the Package API contract and `@876/couriers` SDK.
4. Provision a useful default flat category catalog for every Couriers tenant and reconcile missing defaults without resetting tenant changes.
5. Wire categories into package create/edit/detail/list surfaces once the backend contract is available.
6. Keep the implementation compatible with the current Couriers error-catalog rules and existing v1 package wire contract.

## Architectural scope

Primary paths:

- `apps/couriers-api/prisma/schema/`
- `apps/couriers-api/prisma/migrations/`
- `apps/couriers-api/src/modules/package-categories/`
- `apps/couriers-api/src/modules/packages/`
- `apps/couriers-api/src/modules/tenants/` / provisioning entrypoints as required
- `apps/api/src/services/provisioning-catalog.ts` and provisioning seed paths
- `packages/couriers/`
- `apps/couriers/src/app/[orgSlug]/packages/`
- `apps/couriers/src/app/[orgSlug]/settings/` only if the current settings structure supports a package-category settings resource cleanly

## Binding design decisions

- `PackageType` remains the physical container: carton, envelope, bag, pallet, other.
- `PackageCategory` is the single primary contents category exposed to operators/customers.
- `Package.description` remains free-form human-readable text.
- No parent/child category tree, browse path, product type, collection, or Commerce taxonomy is introduced.
- Provisioned defaults are bootstrap data, not enum contracts.
- `provisioningKey` is stable/immutable; tenant-owned `name`, `slug`, description, order, and active state may be customized.
- Reconciliation is create-missing: it adds absent platform defaults and never resets tenant edits or deletes tenant-created categories.
- Historical packages may continue referencing inactive categories. New assignments require an active, non-deleted category owned by the same tenant.
- Used categories are archived/soft-deleted rather than physically removed.
- Existing v1 package snake_case wire fields remain unchanged; category fields added to that legacy contract follow the established v1 shape rather than opportunistically renaming the whole endpoint.
- Public errors come only from registered catalogs; call sites do not restate messages or statuses.

## Initial platform defaults

`apparel-clothing`, `footwear`, `fashion-accessories`, `electronics`, `phones-accessories`, `computers-accessories`, `appliances`, `health-supplements`, `beauty-personal-care`, `medical-supplies`, `home-kitchen`, `household`, `furniture`, `sports-fitness`, `toys-games`, `baby-kids`, `automotive`, `tools-hardware`, `office-school`, `food-grocery`, `pet-supplies`, `books-media`, `documents-mail`, `business-industrial`, `personal-items`, `other`.

Display names remain tenant-editable.

## Dispatched briefs

| Delegate | Brief | Status |
| --- | --- | --- |
| GPT Web | [`briefs/gpt-web/2026-09-14-package-categories.md`](./briefs/gpt-web/2026-09-14-package-categories.md) | HANDED OFF (see tracker.md) |
| Codex gpt-5.6-terra medium | [`briefs/codex/2026-09-14-packages-edit-filter-portal.md`](./briefs/codex/2026-09-14-packages-edit-filter-portal.md) | IN_PROGRESS |
| Codex muse profile | [`briefs/codex-muse/2026-09-14-package-categories-settings.md`](./briefs/codex-muse/2026-09-14-package-categories-settings.md) | IN_PROGRESS |
| Cline | [`briefs/cline/2026-09-14-package-categories-docs.md`](./briefs/cline/2026-09-14-package-categories-docs.md) | QUEUED |

## Execution reports

| Delegate | Report | Status |
| --- | --- | --- |
| GPT Web | `reports/gpt-web/2026-09-14-package-categories.md` | Pending |

## Phase checklist

### Phase 0 — Verify current state

- [x] Read `CLAUDE.md` and `.agents/rules/gpt-web-operating-rules.md` on the branch.
- [x] Confirm latest `main` base SHA before branch creation.
- [x] Confirm `Package.categoryId` exists without a Prisma relation/model.
- [x] Confirm root Couriers package UI is still not wired to real package data and has no split-view layout.
- [ ] Inspect current provisioning, Couriers module, SDK, and settings patterns before editing.

### Phase 1 — Database and provisioning foundation

- [ ] Add `PackageCategory` Prisma model and tenant/package relations.
- [ ] Add additive migration with data-safety handling for pre-existing non-null `category_id` values.
- [ ] Add Couriers provisioning payload/reconciliation support for package categories.
- [ ] Add `package_category` resources to `application/876-couriers` defaults.
- [ ] Add registered category errors and tests.

### Phase 2 — Couriers API and SDK

- [ ] Add package-category list/retrieve/create/update/delete(archive) API.
- [ ] Add category validation to package create/update.
- [ ] Expose `category_id` / category reference through package list/retrieve contracts without breaking v1 naming.
- [ ] Add `category_id` list filter.
- [ ] Add `couriers.packageCategories.*` SDK resource and extend package types/params.
- [ ] Add service/route/SDK contract tests.

### Phase 3 — Couriers app UI

- [ ] Re-audit package routes after backend work in case concurrent modernization landed.
- [ ] Wire package list to real data and category display.
- [ ] Add package create/detail/edit routes using current shared list/detail patterns where available.
- [ ] Add category selection to create/edit.
- [ ] Add category settings CRUD if it fits the current settings architecture without duplicating a pending modernization surface.
- [ ] Surface category in the customer portal package detail/list where the canonical portal contract supports it.

### Phase 4 — Closeout

- [ ] Review diff for duplicate types/helpers, compatibility residue, swallowed errors, and out-of-scope taxonomy.
- [ ] Write GPT Web report with exact test-case counts and migration SQL.
- [ ] Record commands for orchestrator verification.
- [ ] Mark plan complete only after all scoped implementation is committed.

## Verification commands for orchestrator

GPT Web cannot execute these. The orchestrator should run at minimum:

```bash
pnpm --filter @876/couriers-api typecheck
pnpm --filter @876/couriers-api lint
pnpm --filter @876/couriers-api boundaries
pnpm --filter @876/couriers-api test
pnpm --filter @876/couriers-api build
pnpm --filter @876/couriers typecheck
pnpm --filter @876/couriers test
pnpm --filter @876/couriers-app typecheck
pnpm --filter @876/couriers-app test
```

Also run the repository error-contract guard and Prisma validation/drift commands prescribed by current package scripts/rules.

## Handoff state

Work started from fresh `main` at `debb9b1e97f794802001db4923dafb3ea2430c94`. No implementation code has been changed yet. Current known gaps: `Package.categoryId` is an unbound scalar; the Package API contract exposes only a reduced subset; root Couriers `/packages` still passes an empty array and its layout is not a `ListDetailShell`.

Next step: inspect current Couriers provisioning/resource patterns, then implement Phase 1 additively.

## PR preparation summary

Pending implementation and verification.

## Orchestrator verification of the GPT Web handoff (2026-09-14)

- `feature/couriers-package-categories` had zero commits beyond `main`; deleted. All work is on `-v2`, 0 behind `main`.
- Found and fixed: Prisma client could not generate (partial indexes need the `partialIndexes` preview feature); checked-in client regenerated; category validation test asserted the registry default instead of the Zod message; OpenAPI snapshot out of date (additions only: 6 operations + `category_id`); two couriers-app type errors (Select null, readonly status options).
- Security fix: managed package create/update routes lacked the admin/super-admin role check every other manage mutation route enforces.
- Green after fixes: couriers-api typecheck/lint/boundaries/test (356), `@876/couriers` test (155), `@876/core` test (1148), `@876/api` typecheck, couriers-app typecheck, app-structure.
- Pre-existing on `main`, not this branch: `@876/core` lint errors in `access/*.weird.test.ts`; couriers-app `api-envelope-routes.test.ts` failures for `manage/items` routes.
