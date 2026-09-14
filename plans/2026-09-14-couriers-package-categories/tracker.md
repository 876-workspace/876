# Tracker: Couriers package categories

- Run ID: `2026-09-14-couriers-package-categories`
- Active branch: `feature/couriers-package-categories-v2`
- Base: `main` @ `debb9b1e97f794802001db4923dafb3ea2430c94`
- Status: `HANDOFF_READY`
- Last updated: 2026-09-14
- Handoff owner: local orchestrator

> **Branch note:** continue only on `feature/couriers-package-categories-v2`. The older `feature/couriers-package-categories` branch is an unused branch that still points at the original base and contains none of this implementation.

## Handoff summary

The backend/API/SDK/provisioning foundation for flat tenant-owned Couriers package categories is implemented. The root Packages area has also been moved off the placeholder `packages={[]}` page and onto the shared list/detail architecture with real package data, category presentation, package detail, and a create flow.

The orchestrator should now finish the remaining presentation/settings work, add the missing app-layer tests, run the repository verification suite locally, reconcile any drift from `main`, and complete the closeout report before merge.

The architectural boundary remains binding:

- `Package.packageType` = physical container (`CARTON`, `ENVELOPE`, `BAG`, `PALLET`, `OTHER`).
- `Package.categoryId` = one flat primary contents category.
- `Package.description` = human-readable description of the contents.
- Couriers categories are deliberately **not hierarchical**. Rich product taxonomy belongs to 876 Commerce.
- Provisioned defaults use stable `provisioningKey` identity and `create_missing` reconciliation. Never overwrite tenant renames/order/active state during reconciliation.

## Completed — schema, API and errors

- [x] Read binding repo and GPT Web rules before implementation.
- [x] Re-audit current package/category/provisioning surfaces from the fresh `main` base.
- [x] Restore `PackageCategory` as a Prisma model over the existing baseline `package_categories` table.
- [x] Bind the existing `Package.categoryId` to the category relation and add the tenant relation.
- [x] Add the additive migration for provisioning identity, description, sort order, archive timestamp, and indexes.
- [x] Make tenant category slug/provisioning identity compatible with archived rows.
- [x] Add canonical Couriers package-category errors to `@876/core`.
- [x] Add tenant-scoped package-category list/retrieve/create/update/archive API.
- [x] Ensure package-category routes use the normal Couriers admin guard chain.
- [x] Add the dedicated admin reconciliation endpoint.
- [x] Implement `create_missing` category reconciliation that preserves tenant customization and can adopt an existing same-slug tenant row.
- [x] Add API/reconciliation coverage for category CRUD, validation, soft archive, provisioning preservation/adoption/creation, and reconciliation authentication.
- [x] Extend Package API schemas with `category_id` and the lightweight `{ id, name, slug }` category reference.
- [x] Add `category_id` package list filtering before pagination.
- [x] Validate active tenant-owned categories on package create/update.
- [x] Migrate touched Package expected failures to registered error results.

## Completed — SDK and provisioning

- [x] Add `@876/couriers` package-category schemas and admin resources.
- [x] Wire `packageCategories` into the Couriers admin/operator client and public admin exports.
- [x] Extend the canonical Package SDK schema/body/query contracts with category fields/filtering.
- [x] Add SDK coverage for package-category CRUD/reconciliation and package category fields/filtering.
- [x] Register `package_category` in the Core application provisioning catalog for `876-couriers`.
- [x] Add the flat 26-category Couriers bootstrap catalog.
- [x] Build those defaults into the `876-couriers` application provisioning manifest.
- [x] Add the server-only published-manifest loader used by Couriers onboarding.
- [x] Reconcile published package-category defaults into both newly created and already-existing Couriers tenants during onboarding completion.
- [x] Preserve tenant-owned values during repeat reconciliation.
- [x] Add registered onboarding errors for unavailable/failed package-category provisioning.
- [x] Add manifest-loader/onboarding coverage for success, retry/idempotent existing-tenant behavior, missing config, malformed config, and reconciliation failure.

## Completed — root Packages presentation

- [x] Replace the root Packages placeholder data source with real Couriers package data.
- [x] Move `/[orgSlug]/packages` onto the shared `ListDetailSection` pattern used by the modernized resource pages.
- [x] Add streaming/skeleton-backed package list loading.
- [x] Resolve package customer identity and branch names for the list without creating a second Package domain contract.
- [x] Show package category in the full Packages table.
- [x] Add condensed `ListPane` rendering while a package/create route is open.
- [x] Add `/packages/[id]` detail card/layout with package/category/customer/routing/weight/quantity/status/lifecycle information.
- [x] Add server-side Package detail resolution helpers.
- [x] Add `/packages/new` using the shared detail-column create pattern.
- [x] Add the shared Package form with customer, category, branch, status, physical package type, quantity, weight, tracking number, and description.
- [x] Load active package categories for package create/edit option data.
- [x] Add same-origin managed Package create and update BFF routes using the canonical `@876/couriers/admin` request schemas.

## Remaining — highest priority for local orchestrator

- [ ] **Implement `/[orgSlug]/packages/[id]/edit`.** Reuse `PackageForm`; resolve the package plus customer/category/branch options; preserve the current list/detail/takeover behavior defined by repo rules. The update BFF already exists at `apps/couriers/src/app/api/manage/packages/[id]/route.ts`.
- [ ] **Finish Package actions/navigation.** Ensure the detail card exposes Edit in the repo-standard detail action placement and that successful edits return/refresh consistently with other Couriers resources.
- [ ] **Replace the Package Categories settings placeholder** at `apps/couriers/src/app/[orgSlug]/settings/customization/package-categories/page.tsx` with real tenant category management through `couriersOperator.packageCategories` / the canonical SDK.
- [ ] Add same-origin management routes/actions needed by the Package Categories settings UI rather than calling the Couriers API directly from client components.
- [ ] Settings must support at minimum: list, add custom category, rename/edit description/order/active state, and archive. `provisioningKey` must never be user-editable.
- [ ] Keep inactive/archived categories historically resolvable, but only active non-deleted categories selectable for new Package assignment.
- [ ] **Add category filtering to the Packages UI** using the existing API/SDK `category_id` filter. Preserve the current status filter and URL-driven list/detail behavior.
- [ ] **Portal:** audit `apps/couriers/src/app/portal/(tenant)/(portal)/packages/[id]/page.tsx` and show the canonical package category where appropriate. The portal Package contract now carries category data; do not add a portal-only category model.

## Remaining — tests and hardening

- [ ] Add app-layer tests for Package list data mapping, category rendering, list/detail route behavior, create form submission, update/edit form submission, and BFF authorization/error propagation.
- [ ] Add Package Categories settings/BFF tests covering admin authorization, validation, create/update/archive behavior, inactive handling, and registered-error propagation.
- [ ] Re-audit `PackageForm` for null/clearing semantics on optional fields during edit (`category_id`, `branch_id`, tracking, description, weight) so `undefined` does not accidentally mean "keep old value" when the UI intends to clear it.
- [ ] Re-audit pagination/list loading for tenants with more than 100 packages/customers/categories; do not silently stop at one page where the UI expects the full selectable set.
- [ ] Confirm customer identity resolution remains bounded/chunked and does not regress into N+1 registry calls.
- [ ] Confirm package-category archive semantics do not break historical Package serialization through the Prisma relation.
- [ ] Review all new app/API paths for hand-written terminal errors. All terminal expected failures must resolve through registered catalogs.

## Local verification required before merge

GPT Web did not execute repository commands. The orchestrator must run the repo-prescribed verification locally after syncing the branch with current `main`:

- [ ] Re-read the current `CLAUDE.md` and applicable `.claude/rules/**` after rebasing/merging current `main`; resolve any newly landed rule changes before editing further.
- [ ] Check the branch against the latest `main` and reconcile concurrent Couriers modernization changes rather than overwriting them.
- [ ] Run Prisma format/validation/generation required by the Couriers API workspace.
- [ ] Inspect/apply the new Couriers migration against a disposable/local database and verify no existing non-null `packages.category_id` rows are orphaned.
- [ ] Run the scoped Couriers API tests, `@876/couriers` SDK tests, Core provisioning tests, and Couriers app tests.
- [ ] Run the relevant typecheck, lint, and build commands required by repository rules.
- [ ] Verify onboarding for both: (a) a new tenant and (b) an existing tenant with customized provisioned categories.
- [ ] Verify the 26 defaults materialize once, repeat reconciliation is idempotent, and tenant customizations are not reset.
- [ ] Verify package create/edit rejects cross-tenant or inactive category IDs and permits clearing an optional category.
- [ ] Verify the Package list/detail/create/edit experience manually at desktop and mobile widths.

## Closeout

- [ ] Review the branch diff for duplicate local types, stale category helpers, compatibility residue, accidental nested-taxonomy concepts, and raw/unregistered errors.
- [ ] Remove or ignore the unused `feature/couriers-package-categories` branch; do not merge it.
- [ ] Add the final implementation report under `plans/2026-09-14-couriers-package-categories/` with exact changed files, migration/provisioning notes, tests run, results, and any remaining limitations.
- [ ] Update this tracker with actual local verification results.
- [ ] Mark the tracker `COMPLETE` only after verification passes and the scoped implementation is ready for review/merge.

## Verification state at handoff

No typecheck, lint, test, build, Prisma validation/generation, migration apply, provisioning import, or drift check is claimed as passing from the GPT Web session. All such verification remains explicitly owned by the local orchestrator.
