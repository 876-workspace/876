# Brief 12d — Console: Projects layouts and project custom fields (read-only)

## Status
Done. No commit/branch/push. No `eslint-disable` / `as any` / `@ts-ignore`.
Touched only `apps/console/**` (plus this report). Concurrent-lane files
under `apps/projects/**` left untouched.

## Pattern followed
Templates, as briefed: platform routes under
`apps/console/src/app/(app)/projects/<section>/`, workspace routes under
`apps/console/src/app/(app)/workspace/[orgSlug]/projects/<section>/`, one
shared async data component per view in
`apps/console/src/features/projects/components/`, presentation via
`@876/projects-ui/layouts/layout-summary` for the detail. List tables are
Console-local (no layouts/fields list component exists in `projects-ui`, and
packages are out of scope), mirroring `TemplateList` markup
(`MobileList` + `Table` + shared `Empty` states) so they stay server-safe.

## Changes
- **New shared data components** (`features/projects/components/`):
  - `layouts-data.tsx` — `projects.layouts.list`; columns Layout (linked
    unless the layout is built-in, i.e. `id: null`), Entity, Type
    (`workItemTypeId` or `—`), Default badge, Version (`vN`). Empty state
    `No layouts yet`; banner `Layout data could not be loaded`.
  - `layout-detail-data.tsx` — `projects.layouts.retrieve` (decoded id,
    `notFound` on `projects/layout-not-found`) plus
    `projects.projectCustomFields.list` to resolve `cf:<key>` labels;
    renders `LayoutSummary` with system-key labels + catalog labels and a
    `Back to layouts` link. Catalog failure degrades to raw keys behind a
    `Some layout details could not be loaded` banner.
  - `project-fields-data.tsx` — `projects.projectCustomFields.list`;
    columns Field, Key (mono), Type, Required badge. Empty state
    `No project fields yet`; banner `Project field data could not be loaded`.
- **Project record Overview** (`project-detail-data.tsx`): also fetches the
  field catalog and renders a `Custom fields` card from the embedded
  `project.customFields` (values formatted like the phase view: `Not set` /
  joined lists / Yes-No), hidden when empty, catalog failure bannered with
  raw-key fallback.
- **Routes, both trees**: `projects/layouts/(list)`, `projects/layouts/[layoutId]`
  (metadata via retrieve, `requirePlatformProjectsOrgId` / `resolveOrg`
  per tree), `projects/project-fields` (list only, labels-style single page).
- **Nav/sections**: `nav-config.ts` gains `projects-layouts` (`layouts` icon)
  and `projects-project-fields` (`forms` icon), both gated on
  `projects/dashboard.view`; `app-workspaces.ts` gains `Layouts`/`layouts`
  and `Project Fields`/`project-fields` sections; new `layouts` icon key
  (`LayoutGrid`, indigo) in `nav-icons.tsx` + `workspace-icon.tsx` colors.
  No route-permission changes needed (`/projects` guard covers the subtree).
- **Fixtures/skeletons**: `makeLayout`, `makeProjectField`,
  `makeProjectFieldValue` in `test-fixtures.ts`; `LAYOUTS_SKELETON_COLUMNS`
  and `PROJECT_FIELDS_SKELETON_COLUMNS` in `operator-skeleton-columns.ts`.
- **Repairs required by the 12a contract**: `makeProject` and the two
  `Project`-typed page-test literals gain `customFields: []` (the field is
  now required on `Project`); the workspace project-detail page test mocks
  the new `projectCustomFields.list` call.

## Tests — 24 new `it()` (floor 15)
- `layouts-data.test.tsx` 7 — fetch args, entity/type/version cells,
  default badge present/absent (via `[data-slot="badge"]`, since the column
  header shares the label), host-scoped links, built-in rows render without
  links, empty state, error banner + shell.
- `layout-detail-data.test.tsx` 7 — decoded retrieve, catalog fetch, summary
  name/entity/section, `cf:` label resolution, `notFound` on missing layout,
  catalog-failure banner with raw keys, host-scoped back link.
- `project-fields-data.test.tsx` 5 — fetch args, labels/keys/types, required
  badge, empty state, error banner + shell.
- `project-detail-data.test.tsx` 5 — fetch triple, values with catalog labels,
  catalog-failure fallback + banner, section hidden when empty, project-error
  banner.
- Updated pinning tests: `nav-config.projects.test.ts`,
  `app-workspaces.projects.test.ts` (now thirteen sections),
  `sidebar.test.tsx`.

## Verify (in order)
- `pnpm --filter @876/console typecheck` — EXIT 0.
- `pnpm --filter @876/console lint` — EXIT 0, 0 errors (22 warnings, none in
  touched files).
- `pnpm --filter @876/console exec vitest run src/features/projects src/components/shell src/features/orgs` — 49 files, 389 tests, all pass.
- `node scripts/check-app-structure.mjs console` — OK.
- `pnpm check:rsc-boundaries` — OK (10 apps).
- `src/lib/permissions.test.ts`: same 4 failures with my changes stashed
  (baseline) — pre-existing, ignored per brief.

## Notes for orchestrator
- Built-in layouts (`id: null`) list without links; only stored layouts have
  a detail route. If the API later gives built-ins stable ids, the table
  already links every row with a non-null id.
- `forms` icon reuse for Project Fields keeps the rail-collision test green
-  without new icon work; `layouts` is the only new icon key.
