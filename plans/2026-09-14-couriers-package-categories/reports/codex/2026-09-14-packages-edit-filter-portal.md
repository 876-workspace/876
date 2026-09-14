# Packages edit, category filter, and portal category

## Files changed

- `apps/couriers/src/lib/client/packages.ts` and `src/lib/client/index.ts` add the typed package create/update browser client and expose it through `client.packages`.
- `apps/couriers/src/app/[orgSlug]/packages/_components/package-form.tsx` uses that client, retains rendered form errors, sends cleared optional values as `null`, and keeps edit mutations free of `customer_id`.
- `apps/couriers/src/app/[orgSlug]/packages/[id]/edit/page.tsx` resolves the existing package and form options under Suspense, preserves an assigned inactive category option, and reuses `PackageForm`.
- `apps/couriers/src/app/[orgSlug]/packages/_components/{packages-section,packages-toolbar-data,package-status-filter,package-category-filter}.tsx` move the toolbar data load to an RSC boundary and add the compact URL-driven category selector. It retains `status` and clears pagination cursors when category changes.
- `apps/couriers/src/app/[orgSlug]/packages/_lib/package-form-data.ts` loads active tenant category options for the toolbar.
- `apps/couriers/src/app/[orgSlug]/packages/_components/packages-list-data.tsx` accepts a category ID and passes it to the operator list as `category_id`; filtering is performed by the service, not against rows in the browser.
- `packages/couriers/src/types/portal-package.schema.ts`, `apps/couriers/src/lib/portal/client.ts`, and the portal detail page preserve and display the serialized package category (or an em dash).
- `packages/couriers/src/{resources/portal.test.ts,client.test.ts}` and `apps/couriers/src/lib/portal/client.test.ts` update portal transport fixtures and prove category parsing/mapping.
- New tests cover the package browser client, create/update BFF routes, package form, and list-data category query.

## Decisions

- Confirmed `apps/couriers-api/src/modules/portal/portal.service.ts` delegates portal list/retrieve to package operations whose serializer includes `category`; no API changes were made.
- The category selector uses `Select` because the active-category option list is not known to exceed 50 entries.
- The existing packages list/detail layout retains its client URL status handling. The new server list helper accepts the selected category and makes the required server-side `category_id` operator query; changing a category preserves status and drops `after`/`before`.

## Test cases

- `apps/couriers/src/lib/client/packages.test.ts`: 4 `it()` cases.
- `apps/couriers/src/app/api/manage/packages/route.test.ts`: 8 `it()` cases.
- `apps/couriers/src/app/api/manage/packages/[id]/route.test.ts`: 8 `it()` cases.
- `apps/couriers/src/app/[orgSlug]/packages/_components/package-form.test.tsx`: 5 `it()` cases.
- `apps/couriers/src/app/[orgSlug]/packages/_components/packages-list-data.test.tsx`: 3 `it()` cases.
- `apps/couriers/src/lib/portal/client.test.ts`: 4 `it()` cases.
- `packages/couriers/src/resources/portal.test.ts`: 3 `it()` cases; `packages/couriers/src/client.test.ts`: 10 `it()` cases.

## Verification

- `pnpm --filter @876/couriers-app typecheck` — exit 0.
- `pnpm --filter @876/couriers-app lint` — exit 0, with 13 pre-existing warnings outside this change.
- `cd apps/couriers && npx vitest run src/app/[orgSlug]/packages src/app/api/manage/packages src/lib/client/packages.test.ts src/lib/portal` — exit 0; 18 files, 116 tests passed.
- `pnpm --filter @876/couriers test -- src/resources/portal.test.ts` — exit 0; package suite selected by its Vitest config, 14 files and 156 tests passed.
- `node scripts/check-app-structure.mjs` — exit 0.

## Not done

Nothing intentionally omitted. Concurrent Package Categories settings/BFF/client files were left untouched.
