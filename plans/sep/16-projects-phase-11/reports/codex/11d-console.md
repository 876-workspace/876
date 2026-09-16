# 11d Report — Console: Projects templates (read-only)

## Outcome

Delivered and green. Console serves read-only template list/detail on both
hosts it already serves — 876's own tenant (`/projects/templates/**`) and any
organization (`/workspace/[orgSlug]/projects/templates/**`) — following the
CP1 cycles shape: one shared data component per surface, two thin route files.
Presentation comes from `@876/projects-ui/templates/*`; nothing re-created.

## Files

New — `apps/console`:

- `src/features/projects/components/templates-data.tsx` — `TemplatesData`
  (`projectTemplates.list` → shared `TemplateList` with host `hrefBase`).
- `src/features/projects/components/template-detail-data.tsx` —
  `TemplateDetailData` (retrieve → `TemplateSummary`, Console-local versions
  table, `TemplatePreviewTable` for the route-resolved `startDate`;
  `notFound` on `projects/template-not-found`; read-only, no instantiate UI).
- `src/features/projects/template-start.ts` — `utcMidnightToday` /
  `parseTemplateStartDate` (`?start=` Unix seconds, default today UTC
  midnight), shared by both detail routes.
- `src/app/(app)/projects/templates/(list)/page.tsx` and
  `[templateId]/page.tsx` — platform list/detail (metadata, `Suspense`
  fallbacks, `parseTemplateStartDate(searchParams.start)`).
- `src/app/(app)/workspace/[orgSlug]/projects/templates/(list)/page.tsx` and
  `[templateId]/page.tsx` — organization mirrors via `resolveOrg`.
- Tests (20 new `it()`): `templates-data.test.tsx` (5),
  `template-detail-data.test.tsx` (10), `template-start.test.ts` (5).

Modified — `apps/console` (all inside allowed scope):

- `src/features/projects/test-fixtures.ts` — `makeProjectTemplate`,
  `makeProjectTemplateVersion`, `makeTemplatePreview`.
- `src/features/projects/components/operator-skeleton-columns.ts` —
  `TEMPLATES_SKELETON_COLUMNS` mirroring the shared list columns.
- `src/components/shell/nav-config.ts` — `projects-templates` child
  (`/projects/templates`, `projects/dashboard.view`).
- `src/components/shell/nav-icons.tsx` — `templates` key
  (`DocumentDuplicateIcon`, distinct from every other Projects rail glyph).
- `src/features/orgs/app-workspaces.ts` — `Templates` section + icon key.
- `src/features/orgs/components/workspace-icon.tsx` — `templates` accent.
- `src/components/shell/nav-config.projects.test.ts`,
  `src/features/orgs/app-workspaces.projects.test.ts`,
  `src/components/shell/sidebar.test.tsx` — expectations extended for the new
  section (eleven sections; drill-down ends with Templates).

## Verification

- `pnpm --filter @876/console typecheck` — EXIT:0.
- `pnpm --filter @876/console lint` — EXIT:0 (22 warnings, all pre-existing in
  untouched files; none in new/modified files).
- `pnpm --filter @876/console exec vitest run src/features/projects src/components/shell src/features/orgs` —
  45 files / 365 tests pass (includes the 20 new `it()`; the 4 known
  `src/lib/permissions.test.ts` failures are outside this scope and untouched).
- `node scripts/check-app-structure.mjs console` — OK.
- `pnpm check:rsc-boundaries` — OK (10 apps; routes pass only data, no
  function props server→client).
