# Brief — Couriers package categories

Read `.agents/rules/gpt-web-operating-rules.md` first, then `CLAUDE.md` and every rule required by the touched layers.

## Goal

Implement a simple, flat, tenant-owned package-category system for 876 Couriers and thread it end to end through Prisma, provisioning, Couriers API, `@876/couriers`, and the Couriers package UI where the current route architecture safely permits it.

## Binding product rules

- `PackageType` = physical container only.
- `PackageCategory` = one primary contents category.
- `Package.description` = free-form human-readable contents description.
- No nested taxonomy, parent/child category hierarchy, Commerce product types, collections, browse nodes, or merchandising concepts.
- Provisioned defaults are editable tenant data keyed by immutable `provisioningKey`.
- Reconciliation adds missing defaults and never overwrites tenant edits.
- Inactive/archived categories remain resolvable historically but cannot be newly assigned.
- Every expected public error must come from a registered catalog.

## Premises to verify before editing

1. `apps/couriers-api/prisma/schema/package.prisma` still has nullable `categoryId` with no relation/model.
2. Current package API schemas do not expose category.
3. Current Couriers root package UI is still placeholder/unwired.
4. Existing provisioning infrastructure already supports per-application resources and create-missing reconciliation in at least one product.
5. `@876/couriers` is the canonical domain SDK and must own exported package/category contracts.

If any premise is false, stop that phase and record the contradiction in the report rather than inventing around it.

## Rules to read

Minimum:

- `.agents/rules/ai-code-quality.md`
- `.agents/rules/naming.md`
- `.agents/rules/types.md`
- `.agents/rules/code-style.md`
- `.agents/rules/testing.md`
- `.agents/rules/error-handling.md`
- `.agents/rules/express-api.md`
- `.agents/rules/api-backend.md`
- `.agents/rules/stripe-api-pattern.md`
- `.agents/rules/sdk-conventions.md`
- `.agents/rules/app-structure.md`
- `.agents/rules/app-layout.md`
- `.agents/rules/data-fetching.md`
- `.agents/rules/module-settings.md`
- `.agents/rules/implementation-tracker.md`
- `.agents/rules/git.md`

## Phase 1 — database + provisioning foundation

Implement:

- `PackageCategory` Prisma model with tenant ownership, nullable immutable `provisioningKey`, editable name/slug/description/order/active state, timestamps, soft deletion, package relation.
- Proper relation from existing `Package.categoryId`.
- Additive migration SQL. Inspect migration history/legacy data assumptions first; do not guess away existing `category_id` values.
- Couriers provisioning payload/reconciliation support using the existing application provisioning architecture.
- `package_category` default resources in `application/876-couriers` using the category list in `plan.md`.
- Registered package-category errors.

Test floor: add at least 8 focused `it()` cases across schema/service/reconciliation/error behavior, counting literally.

## Phase 2 — API + SDK

Implement standard resource methods and legacy-v1-compatible package integration:

- package-category `list`, `retrieve`, `create`, `update`, `delete` (archive semantics);
- package create/update category validation;
- package response `category_id` and lightweight category reference where detail expansion fits the existing contract;
- list filter by `category_id`;
- `couriers.packageCategories.*` in `@876/couriers` and category-aware package types/params.

Use the established service error style for Couriers' current migration state. Do not invent an alternate result/throw boundary.

Test floor: add at least 12 focused `it()` cases across route/service/SDK behavior, including tenant isolation, inactive/deleted assignment rejection, archived historical resolution, duplicate slug/provisioning-key handling, and exact wire shape.

## Phase 3 — Couriers app

Re-read current package/settings routes immediately before touching them because concurrent modernization may have landed.

If root package UI is still placeholder:

- wire it to the canonical Couriers service;
- add category display/filter where the current shared UI patterns support it;
- add create/detail/edit routes only using the repository's current `ListDetailShell`/`DetailCard` pattern, never a parallel bespoke layout;
- add category selection from active tenant categories;
- add category settings CRUD only if the current settings architecture has a clear canonical extension point.

If modernization has changed the package route structure, adapt to the new owner rather than reintroducing the old page shape.

Test floor: add at least 6 focused UI/data-loading `it()` cases if app UI is changed.

## Report

Write `plans/2026-09-14-couriers-package-categories/reports/gpt-web/2026-09-14-package-categories.md` with:

- phase status table;
- literal `it()` counts added;
- every changed file and why;
- full migration SQL;
- decisions made;
- unverified items;
- deliberate gaps and risks;
- orchestrator verification commands.

Do not claim any test/typecheck/lint/build execution from GPT Web.
