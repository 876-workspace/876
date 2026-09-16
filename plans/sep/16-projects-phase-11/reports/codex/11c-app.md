# 11c — Projects app: templates, create-from-template, clone

## Status
Done. All pages, routes, components, nav, and tests delivered under `apps/projects/**`.
No commit/branch/push. No `eslint-disable` / `as any` / `@ts-ignore`.

## What was already in place (previous run, reviewed as-is)
- `app/api/_lib/template-api.ts`, all 7 route files, `features/templates/components/{templates-data,template-detail-data,template-preview-data,template-start-form,template-version-table,template-skeleton-columns}.tsx`,
  `features/templates/template-preview-query.ts`, `lib/client/templates.ts`, `lib/date-input.ts`,
  edits to `lib/client/index.ts` and `lib/services/projects.ts`.
- Verified each route: `projects.view` reads, `projects.edit` writes, `strictObject` bodies, one service call. No changes needed.

## Changes this run
- **Settings nav**: `settings/_lib/settings-nav.ts` gains available entry `Templates → /settings/templates` (icon `templates`, Workspace group); test expectation updated.
- **Pages** (standard container, `ResourceToolbar` without `description`, `Suspense` skeletons):
  - `settings/templates/page.tsx` — list (`projects.view`) with `DataTableSkeleton` + `TemplatesData`.
  - `settings/templates/[templateId]/page.tsx` — detail via existing `TemplateDetailData` (`?start=` preview, `projects.view`).
  - `settings/templates/[templateId]/edit/page.tsx` — name/description (`projects.edit`) via new `EditTemplateData` + `EditTemplateForm` → redirects to detail.
  - `projects/new/from-template/page.tsx` — (`projects.edit`, matching the instantiate route) via new `FromTemplateData` + `FromTemplateForm`: template picker, name, key, start date, `InstantiateOptions`, server-rendered preview from `?templateId&start`, idempotency key from `crypto.randomUUID()` once per mount, submit → `/projects/:id`.
  - `projects/[projectId]/save-as-template/page.tsx` and `projects/[projectId]/clone/page.tsx` — (`projects.edit`) form pages via new `SaveAsTemplateData/Form` (→ `/settings/templates/:id`) and `CloneProjectData/Form` (→ `/projects/:id`).
- **Project Overview surfacing**: no sibling detail toolbar has a `···` dropdown (phase/cycle/issue details render links through their detail components, project detail has no toolbar at all), so per the brief's fallback, `ProjectDetailData` renders "Save as template" / "Clone" outline-button links above the detail when `canEdit`.
- **Fix to resumed code**: `TemplateDetailData` "Use" link now carries `&start=` so the from-template preview renders immediately; `parseDateInput` now rejects impossible calendar dates (`2026-02-30` rolled into March — the day-slip the helper exists to prevent) via round-trip component check.
- **Tests — 69 new `it()`** (floor 40): `date-input` 8, `template-preview-query` 8, `template-api` 6, list route 4, detail route 7, versions 3, preview 4, instantiate 4, clone 4, save-as-template 4, `templates-data` 3, `template-detail-data` 4, `edit-template-form` 3, `from-template-form` 4, `save-as-template-form` 2, `clone-project-form` 2.

## Verify (one at a time, in order)
- `pnpm --filter @876/projects-app typecheck` — 1 error, all in `packages/projects/src/layout-rules.ts` (untracked file owned by the concurrent 12a agent; out of scope, untouched). Zero errors in `apps/projects/**`.
- `pnpm --filter @876/projects-app lint` — EXIT 0, 0 errors (4 warnings pre-existing in untouched auth/shell files).
- `pnpm --filter @876/projects-app test` — 161 files, 1118 tests, all pass (5 initial failures in new tests fixed: mobile+desktop duplicate text, toolbar/summary duplicate heading, `Date.parse` rollover).
- `node scripts/check-app-structure.mjs projects` — OK.
- `pnpm check:rsc-boundaries` — OK (10 apps).

## Notes for orchestrator
- Concurrent agents are editing `apps/console/**`, `apps/projects-api/**`, and `packages/**` in the same tree; the typecheck error above is theirs.
- `templatesClient` covers writes only (`update/preview/instantiate/saveAsTemplate/cloneProject`); list/retrieve/versions stay server-side via `lib/services/projects`, so no browser round-trip was added.
