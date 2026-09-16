# Brief 12c — Projects app: custom fields, layouts, layout-driven forms

## Status

Implemented. Typecheck green, ESLint green on touched files, full app suite green
(1214 tests passed across 176 files — 96 new `it()` added by this lane).

## What changed (all under `apps/projects/**`)

### API routes (thin BFF, `projects.view` reads / `projects.edit` writes)

- `src/app/api/project-custom-fields/route.ts` — `GET` list, `POST` create.
- `src/app/api/project-custom-fields/[id]/route.ts` — `PATCH` update (404 on
  missing), `DELETE` remove.
- `src/app/api/projects/[projectId]/custom-field-values/route.ts` — `GET`
  values, `PUT` values (stamps `updatedBy` from the session).
- `src/app/api/layouts/route.ts` — `GET` list with `entity`/`workItemTypeId`
  query, `POST` create (accepts the editor's `definition`, flattens to the
  service call).
- `src/app/api/layouts/resolve/route.ts` — `GET` resolve (never 404 by
  contract; service falls back to built-in).
- `src/app/api/layouts/[layoutId]/route.ts` — `GET`/`PATCH`/`DELETE`.
- `src/app/api/layouts/[layoutId]/make-default/route.ts` — `POST`.
- New zod boundaries: `src/lib/project-custom-field-inputs.ts`,
  `src/lib/layout-inputs.ts`.
- Browser clients: `src/lib/client/project-custom-fields.ts`,
  `src/lib/client/layouts.ts`, wired into `src/lib/client/index.ts`.
- `src/lib/services/projects.ts` now exposes the `projectCustomFields` and
  `layouts` service resources.

### Settings

- Nav: `Project fields` → `/settings/project-fields`, `Layouts` →
  `/settings/layouts` (`settings-nav.ts`; registry test inventory updated).
- `settings/project-fields/page.tsx` + `ProjectCustomFieldSettings` (create,
  inline label/required edit, remove — mirrors the phase-fields settings).
- `settings/layouts/page.tsx` + `LayoutsSettings` (grouped by entity +
  work-item type, make-default, edit link, remove).
- `settings/layouts/new/page.tsx` + `settings/layouts/[layoutId]/edit/page.tsx`
  + `LayoutForm` (name/entity/type chrome around `LayoutEditor`, which posts
  the `definition` hidden input). Available fields per entity built by
  `src/lib/layout-available-fields.ts` (system keys + `cf:` keys).

### Layout-driven forms

- `issue-form.tsx`, `phase-form.tsx`, `new-project-form.tsx` accept a
  server-resolved `layout` (plus field defs/values) and render it through
  `LayoutRenderer`. Without a layout they render exactly the legacy DOM, so
  every existing form test passes unmodified.
- Submit reads the renderer's named inputs (`readLayoutFormValues`), maps
  system keys (`title`→`title`/`name`, `state`→`status`, `assignee`→owner,
  `dueDate`→target date, `phase`/`taskList`, …) onto the existing API bodies,
  and writes `cf:` values through the existing values endpoints (issue body,
  phase values `PUT` after save, project values `PUT` after create).
- `projects/layout-required-fields` and `projects/layout-field-disabled`
  render as `AppError` beside the form with the computed field-label list;
  nothing resets, so entered values survive.
- Data loaders resolve layouts server-side and pass them as data:
  `NewIssueData` (default type), `EditIssueData` (issue type),
  `NewPhaseData`/`EditPhaseData` (phase + definitions + values),
  `projects/new/page.tsx` (project + definitions).
- Project detail Overview shows project custom field values via the new
  `ProjectCustomFieldsPanel` in `project-detail-data.tsx` (no
  `packages/projects-ui` changes).

### Shared helper

- `features/projects/components/layout-form-helpers.ts` — descriptors per
  entity, issue/phase/project seeds, `FormData` reader, rule-error
  detection/titles, custom-field value conversion. Pure; unit-tested.

## Tests (96 new `it()`)

- API: 35 across the seven route files (authz permission asserted per route,
  422/400/404 paths, definition flattening, `updatedBy` stamping).
- Helpers: 32 (`layout-form-helpers.test.ts`).
- Components: `project-custom-field-settings` (6),
  `project-custom-fields-panel` (3), `layouts-settings` (6),
  `issue-layout-form` (4), `phase-layout-form` (4),
  `new-project-layout-form` (3), `layout-form` (3).

## Verify

- `pnpm --filter @876/projects-app typecheck` — pass.
- `pnpm --filter @876/projects-app lint` — pass (0 errors, 4 pre-existing warnings in `components/shell`).
- `pnpm --filter @876/projects-app test` — pass, 1214 tests / 176 files.
- `node scripts/check-app-structure.mjs projects` — pass (`app-structure: OK (projects)`).
- `pnpm check:rsc-boundaries` — pass (`RSC boundaries OK (10 apps)`).

## Notes for reviewers

- Layout resolve failures in form data loaders degrade to the legacy form
  rather than blocking the page; the settings pages surface them as banners.
- Phase custom-field writes happen after the phase save; a values failure
  keeps the user on the form with the error (no silent navigation).
- No changes outside `apps/projects/**`; no commits made.
