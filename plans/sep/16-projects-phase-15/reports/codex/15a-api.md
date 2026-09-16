# 15a Report — Projects API: custom modules, records, statuses, links, widgets

- **Brief:** `briefs/codex/15a-api.md` · **Status:** complete, uncommitted, no branch created.

## What shipped

- **Migration + schema** — `prisma/migrations/20260927000000_custom_modules/migration.sql`
  plus `prisma/schema/custom-modules.prisma` (`CustomModule`, `CustomModuleField`,
  `CustomModuleStatus`, `CustomModuleRecord`, `CustomModuleRecordValue`,
  `CustomModuleLink`, `DashboardWidget`) and back-relations on `Tenant`.
  The migration also drops `projects_layouts_entity_chk`, which enumerated
  `project|phase|work-item` and cannot cover dynamic `custom-module:<key>` entities.
- **Module `src/modules/custom-modules/`** — `custom-modules.schemas.ts`,
  `custom-modules.serializers.ts`, `custom-modules.repository.ts`,
  `custom-modules.service.ts`, `custom-modules.controller.ts`,
  `custom-modules.routes.ts`, `custom-modules.docs.ts`, `index.ts`, wired in `src/http/routes.ts`.
  - Definitions CRUD; `key` immutable after create (`projects/custom-module-key-immutable`).
  - Fields reuse the phase-12 vocabulary (`customFieldTypeSchema`) and the shared
    validator (`buildCustomFieldValueData`, `missingRequiredFieldKey`).
  - Statuses with reorder endpoint, exactly one default that must be `open`
    (`projects/default-custom-module-status-required`), delete refused when
    in use (`projects/custom-module-status-in-use`).
  - Records CRUD with cursor pagination (`limit`/`startingAfter`/`endingBefore`)
    and filters `status`, `projectId`, `q` (title), `fieldKey` + `fieldValue`.
  - Links `record → record|work-item|project|phase` with kebab `relation`,
    unique per pair+relation, self-link rejected.
  - Interim auth: `restrictedToRoleKeys` checked against the caller keys in the
    `x-app-role-keys` header (`parseRoleKeysHeader`); empty list means open to any
    internal caller, otherwise fail-closed `projects/custom-module-forbidden`.
    Documented in `custom-modules.docs.ts` and the service header comment.
  - Reports: count by status, count by select/multi-select field, created-per-day
    in period; JSON by default, CSV via shared `countBy`/`toCsv` from reports.
  - Widgets CRUD (`record-count|status-breakdown|recent-records`, nullable `userId` = shared).
- **Layouts** — entity union extended to `custom-module:<key>` in API schemas and
  the client (`LayoutEntity` template-literal type; schemas cast to
  `z.ZodType<LayoutEntity>` so inference stays narrow). Catalog + `cf:` validation
  resolve against module fields (dynamic import of the custom-modules public API,
  keeping the static graph acyclic); record create/update call `enforceLayoutRules`.
- **Automation** — triggers `custom-record.created|updated|status-changed` appended
  in the same transaction as the record mutation; `triggerSubjectType` +
  `buildSubjectSnapshot` support `custom-record` (title/state/project/module +
  `cf:` values, so conditions and webhooks see record fields); worker `set-field`
  applies `title`/`status`/`cf:<key>` to records via `updateRecordFromAutomation`
  with `causationDepth + 1`; `notify`/`call-webhook` were already subject-generic.
- **Client (`packages/projects`)** — `CustomModule*`/`CustomRecord*`/`DashboardWidget*`
  zod contracts + input/query types in `types.ts` (re-exported from `contracts.ts`
  and `index.ts`), `resources/custom-modules.ts` wired as `client.customModules`,
  custom-module layout entity helpers, new automation triggers. `client.test.ts`
  namespace list updated.
- **IDs/errors** — `cmod_*`/`cmodf_*`/`cmods_*`/`cmodr_*`/`cmodrv_*`/`cmodl_*`/`dshw_*`
  prefixes; 15 new `projects/*` error codes.

## Verification

- `prisma validate` — valid. `prisma generate` — clean.
- API `typecheck` EXIT 0 · `lint` EXIT 0 · `test` **74 files / 1559 tests pass**
  (155 new custom-module tests across 6 files: schemas, serializers, service,
  routes, layouts-extension, automation-extension).
- Package `typecheck` EXIT 0 · `lint` EXIT 0 · `test` **44 files / 296 pass**
  (23 new: `custom-modules.test.ts`, `resources/custom-modules.test.ts`).
- `pnpm --filter @876/projects-api boundaries` has **no script** in this repo
  (pre-existing; root `turbo boundaries` defines no per-package task). Boundary
  enforcement is the `module-boundaries.test.ts` suite — passes; new module uses
  only public `index.ts` imports, dynamic imports where a static edge would cycle
  (layouts ↔ custom-modules, automation subjects → custom-modules, worker → custom-modules).
- No commit/branch, no `prisma migrate`, no `eslint-disable`/`as any`/`@ts-ignore`,
  no run logs in repo. Changed scope is `apps/projects-api/**` +
  `packages/projects/**` only (plus this report, as briefed).

## Notes for 15c/15d

- `x-app-role-keys` is trusted from the app; replace with server-side grant
  resolution before tightening beyond the documented interim.
- Record `projectId` for org-scope modules is validated for existence only;
  membership/visibility stays with the app tier. Link targets other than `record`
  are shape-validated, not existence-checked.
