# 12a — Projects API: project custom fields, layouts, layout rules

## Status
Done. Resumed mid-flight work to completion: fixed the remaining typecheck
error, repaired 18 suites broken by new transitive DB imports, fixed 1 real
service-test failure, added route tests for both new modules plus package
tests (exhaustive evaluator, both resources), and ran the full verify chain
green. No commit/branch/push. No `prisma migrate`. No `eslint-disable` /
`as any` / `@ts-ignore`.

## What was already in place (previous run, reviewed as-is)
- `prisma/schema/layout.prisma` (`ProjectCustomField`, `ProjectCustomFieldValue`,
  `Layout`) and hand-written migration
  `prisma/migrations/20260924000000_custom_fields_layouts/migration.sql`,
  including partial unique index `projects_layouts_one_default_uidx` on
  `(tenant_id, entity, COALESCE(work_item_type_id, ''))`
  `WHERE is_default AND deleted_at IS NULL` (34 chars).
- Shared validator `src/modules/custom-fields/field-values.ts`; work-item and
  phase paths switched to it (`custom-field-value.ts` deleted); project field
  CRUD + values service/repository/controller/routes/schemas/serializers.
- Layouts repository/service/controller/routes/schemas/serializers with CRUD,
  `make-default`, `resolve` (type-specific → entity default → built-in, never
  404), field-key validation (system list + `cf:` catalog), PATCH version bump,
  and `enforceLayoutRules` (require + disable) wired into project / issue /
  phase create+update via the resolved layout.
- `packages/projects/src/layout-rules.ts` (pure `evaluateLayoutRules`,
  `toLayoutValue`, `LAYOUT_SYSTEM_FIELD_KEYS`), exported from package root,
  `contracts`, and `./layout-rules`; resources `layouts.ts`,
  `project-custom-fields.ts` wired into the client; layout/project-CF types
  and `customFields` on `projectSchema`.
- Service tests: `field-values` 24, `project-custom-fields.service` 17,
  `layouts.service` 26.

## Changes this run
- **Import hygiene**: pure consumers (`work-structure` + `milestone-details`
  serializers, both services' validator helpers) import the leaf
  `../custom-fields/field-values.js` directly instead of the barrel, which
  otherwise drags routes/controllers/DB into unit tests. Service-to-service
  calls keep the barrel imports per the cross-module convention.
- **Service fixes**: project `createCustomField` now rejects select/
  multi-select without options (mirrors update; route schema already did);
  layout create/update re-validate the assembled definition with
  `layoutDefinitionSchema.safeParse` so duplicate section/field/rule keys are
  `invalid-request` instead of corrupt rows that crash on read.
- **Test repairs**: added the two new leaf repository mocks
  (`layouts.repository`, `project-custom-fields.repository`) with `[]`
  defaults to 17 existing suites (established
  "mock them here too, or importing X throws" pattern); completed the
  milestone-complete route test with the `listMilestoneCustomFieldValues`
  mock the new enforcement read needs; fixed two `vi.mock` insertions that
  had split multi-line `await import` statements.
- **New tests — 40 API `it` + 38 package `it`** (floors 65 / 25; totals now
  107 new API, ~41 new package):
  - `layouts.routes.test.ts` 22 — envelope list + entity filter, create
    201/default, unknown/`cf:`/scoped keys, unknown type, dup sections,
    retrieve/update/delete 200/404s, version increment assertion,
    make-default + default clearing, resolve precedence + built-in + missing
    entity.
  - `project-custom-fields.routes.test.ts` 18 — field CRUD incl. 409/404s,
    schema 400s, values list/set incl. required/mistyped/duplicate/unknown,
    clear-on-empty.
  - `layout-rules.test.ts` 31 declarations — every op (`equals` scalar/null/
    array, `not-equals`, `in` scalar/array/non-array/missing, `is-empty` ×4,
    `is-not-empty`), AND, vacuous `when`, show/hide/hide-beats-show,
    require-hidden-ignored, disable independence, undeclared-field effects,
    missing-value require, `toLayoutValue` mapping.
  - `resources/layouts.test.ts` 4, `resources/project-custom-fields.test.ts`
    3 — paths, methods, schemas, error passthrough.
  - `client.test.ts` expectations extended with `layouts`,
    `projectCustomFields`.

## Verify (one at a time, in order)
- `prisma validate` — schemas valid, EXIT 0.
- `prisma generate` — client generated, EXIT 0.
- `@876/projects-api typecheck` — EXIT 0.
- `@876/projects-api lint` — EXIT 0, 0 errors, 0 warnings.
- `@876/projects-api test` — 37 files, 1002 tests, all pass.
- `@876/projects typecheck` — EXIT 0.
- `@876/projects test` — 31 files, 224 tests, all pass.

## Notes for orchestrator
- Prettier `--check` is dirty repo-wide at baseline (print-width drift from an
  older formatter version; verified via `git show HEAD:`), so files were
  matched to surrounding style rather than reformatted to avoid diff noise.
- Concurrent lanes share the tree: `apps/projects/**` (12c) and
  `packages/projects-ui/**` (12b) were left untouched; the only package file
  edited here is `packages/projects/src/client.test.ts` (12a scope).
- `GET /projects/:id/custom-field-values` exists alongside the brief's `PUT`
  (list helper the PUT returns); harmless extra read endpoint.
