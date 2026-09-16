# Brief (Codex muse profile): fix the Packages category filter and unblock the toolbar

Repo /root/projects/876, branch `feature/couriers-package-categories-v2` (checked out). Do NOT commit, branch,
push, or use worktrees. Scope is ONLY the files listed below. Do not touch
`src/app/[orgSlug]/settings/**`, `src/app/api/manage/package-categories/**`, `src/lib/client/package-categories*`.

Read first: `.claude/rules/app-layout.md` §5a ("A layout receives no searchParams"), `.claude/rules/data-loading.md`
(page chrome renders before live I/O; server-started promises adopted in a client component), `CLAUDE.md`
"Loading States & Suspense Placement", `.claude/rules/testing.md`.

All paths below are under `apps/couriers/src/app/[orgSlug]/packages/`.

## Verified defects (orchestrator review of the previous run)

1. **The category filter does nothing.** `_components/package-category-filter.tsx` writes `?category=<id>`, but
   `layout.tsx` renders `<PackagesListData orgSlug={orgSlug} />` with no `categoryId` — a layout cannot read
   `searchParams`, so the server-side `categoryId` parameter added to `PackagesListData`/`listAllPackages` is
   never set.
2. **The toolbar is blocked on live I/O.** `_components/packages-section.tsx` now renders the async server
   component `_components/packages-toolbar-data.tsx`, which awaits `loadActivePackageCategoryOptions` before the
   `ResourceToolbar` (title, Add, ··· menu) can render, with no Suspense boundary. Chrome must render immediately.

## Required design (binding — do not choose a different one)

The list already loads every page (`listAllPackages` loops `has_more`) and `_components/packages-list.tsx`
already filters `status` client-side from `useSearchParams()`. Category filtering follows exactly that pattern.

1. `_components/packages-table.tsx`: add `categoryId: string | null` to `PackageTableRow`.
   `_components/packages-list-data.tsx`: set `categoryId: pkg.category_id ?? null` on each row; REMOVE the
   `categoryId` prop/parameter and the `category_id` spread from `listAllPackages`, restore it to a non-exported
   `async function listAllPackages(tenantId: string)`. Delete `_components/packages-list-data.test.tsx`.
2. `_components/packages-list.tsx`: read `category = searchParams.get('category')`; filter rows by
   `status` (existing) AND `row.categoryId === category` when `category` is non-empty. Add one short comment:
   filtering is client-side because a layout receives no searchParams and the list already holds every page.
   Rows in both the table and condensed pane use the filtered set.
3. `_components/packages-section.tsx`: make it a `'use client'` component again that renders `ResourceToolbar`
   synchronously (title "Packages", `titleFilter` = `StatusFilterHeading` with `value` from
   `resolvePackageStatusFilter(useSearchParams().get('status'))` and `options={[...PACKAGE_STATUS_OPTIONS]}`,
   `primaryLabel="Add"`, `primaryHref`, `primaryVariant="info"`, `refresh`,
   `dropdownActions={PACKAGES_DROPDOWN_ACTIONS}`), with the category filter placed beside the heading inside
   `titleFilter` (`<div className="flex items-center gap-2">`). New prop:
   `categoryOptions: Promise<PackageFormOption[]>`.
   Delete `_components/packages-toolbar-data.tsx` and `_components/package-status-filter.tsx`.
4. `layout.tsx`: call `loadActivePackageCategoryOptions(orgSlug)` WITHOUT awaiting it and pass the promise as
   `categoryOptions` to `PackagesSection`. Do not add other awaits.
5. `_components/package-category-filter.tsx`: accept `categoryOptions: Promise<PackageFormOption[]>`. Export
   `PackageCategoryFilter` that renders `<Suspense fallback={<disabled Select of identical size showing "All
   categories">}>` around an inner component that calls React `use(categoryOptions)` and renders the real
   `Select`. Keep the existing URL behaviour (preserve other params, delete `after`/`before`, "all" removes
   `category`). `loadActivePackageCategoryOptions` must not throw into the toolbar: if it rejects, render the
   disabled fallback (catch in `package-form-data.ts` is NOT allowed to swallow silently — instead let the inner
   component be wrapped by the Suspense and handle rejection by `.catch` on the promise in the layout mapping to
   `[]` only after `console.error` with the error code/message as text). Keep this minimal.
6. Tests (vitest; check `apps/couriers/vitest.config.ts`, copy style from
   `_components/package-form.test.tsx` written by the previous run):
   - `_components/packages-list.test.tsx` (≥5): no filters shows all rows; `?status=` filters; `?category=`
     filters; both combined; unknown category shows the empty state. Mock `next/navigation`
     (`useSearchParams`) and `@876/ui/list-detail-shell` (`useDetailSegments` → `[]` and `['pkg_1']`).
   - `_components/package-category-filter.test.tsx` (≥4): options render after the promise resolves; selecting a
     category pushes a URL that keeps `status` and drops `after`/`before`; selecting "All categories" removes
     `category`; fallback is disabled while pending.

## Verification (run one at a time; if you cannot run commands, say so in the report)

```bash
pnpm --filter @876/couriers-app typecheck
pnpm --filter @876/couriers-app lint
cd apps/couriers && npx vitest run 'src/app/[orgSlug]/packages'
node scripts/check-app-structure.mjs
```

No `eslint-disable`, `@ts-ignore`, `as any`.

## Report (required)

`plans/2026-09-14-couriers-package-categories/reports/codex-muse/2026-09-14-packages-category-filter-fix.md`:
files changed, counted `it()` per file, verification actually run with results, anything not done.
