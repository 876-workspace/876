# 15d Report — Console: Projects custom modules (read-only)

- **Brief:** 15d · **Status:** complete, uncommitted, no branch created.
- **Scope:** `apps/console/**` only (plus this report, as briefed). No `eslint-disable`/`as any`/`@ts-ignore`.

## What shipped

- **Shared data layer** (`apps/console/src/features/projects/`)
  - `custom-modules-mappers.ts` — service → UI mapping: `toUiCustomModule` (with per-module field/record counts), `toUiCustomModuleStatus`, `toUiCustomModuleRecord` (`fields` → `values`).
  - `components/custom-modules-data.tsx` — list; counts resolved per module via `listFields` + `listRecords(limit: 1)` (`total_count`); renders shared `CustomModuleList` with `hrefBase` under the host root.
  - `components/custom-module-detail-data.tsx` — detail; `retrieveModule` (404 → `notFound`), then parallel `listFields` / `listStatuses` / `layouts.list({ entity: \`custom-module:<key>\` })` / `listRecords(limit: 1)`. Renders Details facts (scope, project, version, record-count link, updated), Access (`restrictedToRoleKeys` badges or open-caller note), Fields table, Statuses with `RecordStatusBadge` + Default marker, and the resolved layout through shared `LayoutSummary` (field labels from the module catalog plus Title/Status).
  - `components/custom-module-records-data.tsx` — records list; module 404 → `notFound`, records error → banner; shared `RecordList` with statuses and the first 4 module fields as columns.
  - `components/custom-module-record-detail-data.tsx` — record detail; record 404 (`projects/custom-module-record-not-found`) → `notFound`; shared `RecordSummary` plus a provenance card (module, project, created/updated).
  - `components/operator-skeleton-columns.ts` — added `CUSTOM_MODULES_SKELETON_COLUMNS` and `CUSTOM_MODULE_RECORDS_SKELETON_COLUMNS`.
  - `test-fixtures.ts` — added `makeCustomModule`, `makeCustomModuleField`, `makeCustomModuleStatus`, `makeCustomRecord`.
- **Routes, both trees** (platform `projects/…`, workspace `workspace/[orgSlug]/projects/…`, same data components with `projectsBase`)
  - `custom-modules/(list)/page.tsx` — list with toolbar + skeleton fallback.
  - `custom-modules/[moduleId]/page.tsx` — detail with metadata from `retrieveModule`.
  - `custom-modules/[moduleId]/records/(list)/page.tsx` — records list.
  - `custom-modules/[moduleId]/records/[recordId]/page.tsx` — record detail.
  - All read-only: no create/edit/reorder/delete affordances; webhook secrets, link mutation, widgets, and reports are out of scope.
- **Tests** — 29 `it()` across 5 files (mappers 7, list 5, detail 7, records 5, record detail 5): decoded-id fetching, per-module counts, scope/count rendering, host-root hrefs, fields/statuses/layout/access rendering, `notFound` on module/record miss, error banners.

## Verification

- `pnpm --filter @876/console typecheck` — clean.
- `pnpm --filter @876/console lint` — 0 errors (22 pre-existing warnings elsewhere).
- `pnpm --filter @876/console exec vitest run src/features/projects src/components/shell src/features/orgs` — **62 files / 475 tests pass** (includes the 29 new). The 4 known `src/lib/permissions.test.ts` failures are outside this run's scope.
- `node scripts/check-app-structure.mjs console` — OK.
- `pnpm check:rsc-boundaries` — OK (10 apps).

## Notes

- `no-assign-module-variable` forbids a `module` binding, so the local is `customModule` throughout (params in the mapper keep the short name; no lint error there).
- List counts are N+1 per module (fields + one record query each); acceptable for the operator view, flagged if module counts grow.
- A module without a resolved layout renders "No layout for this module yet." rather than an error; layout-list failures still surface in the partial banner.
