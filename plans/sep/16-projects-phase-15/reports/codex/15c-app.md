# 15c Report — Projects app: custom modules

- **Brief:** `briefs/codex/15c-app.md` · **Status:** complete, uncommitted, no branch created.

## What shipped (all under `apps/projects/**`)

- **Lib (`src/lib/custom-modules/`)**
  - `module-access.ts` — kebab key validation/derivation, `callerRoleKeys` (resolved
    permissions → role keys), `roleKeysHeaderValue`, `hasModuleAccess`/`visibleModules`,
    `findModuleByKey`, org/project scope splits, `resolveCustomModuleNavEntries`
    (plain-data sidebar group with icon keys), status/field label helpers.
  - `custom-module-inputs.ts` — strict zod bodies/queries for every thin route
    (module, field, status, status-replace, record, link, record query, report
    query, widget create/update).
  - `record-form-helpers.ts` — module fields → `LayoutRenderer` descriptors
    (`cf:`-prefixed), fallback single-section layout per `custom-module:<key>`,
    title/field split for submits, service → UI mappers (`CustomModuleList`,
    `RecordList`, `RecordSummary`, `DashboardWidget`), widget-data builders,
    report CSV serializers + CSV hrefs.
  - `service-with-roles.ts` — server-only service client that forwards the
    server-resolved role keys in `x-app-role-keys` via a fetch wrapper.
  - `api-access.ts` — `resolveCallerRoleKeys(userId, orgId)` from the cached
    access context; `serviceErrorStatus` (not-found → 404).
  - `record-pages.ts` — server-only `loadModuleByKey` bundle
    (module + fields + statuses + `custom-module:<key>` layout).
- **Browser clients (`src/lib/client/custom-modules.ts`, wired into `src/lib/client/index.ts`)**
  - Modules, fields, statuses (incl. one-call `replace` for `StatusEditor`),
    records, links, dashboard widgets — all same-origin `/api/…`, never naming
    org, user, or role keys.
- **Thin API routes** — `src/app/api/custom-modules/**` (modules, fields,
  statuses + `PUT` pipeline replace with create/update/delete/reorder, records,
  record links, `reports/by-status|by-field|created` with `?format=csv`
  downloads) and `src/app/api/dashboard-widgets/**`. Every handler resolves
  role keys from the access context server-side; strict bodies reject smuggled
  keys with 422.
- **Settings** — `/settings/custom-modules` list (with field/record counts),
  `/new` (key, names, scope, icon, role keys), `/[moduleId]` detail with
  client-side tabs: Fields (custom-field form patterns), Statuses
  (`StatusEditor`), Layout (`LayoutEditor` for entity `custom-module:<key>`),
  Access (names, icon, restricted role keys). New `/settings/dashboard` page
  (add/remove/reorder user + shared widgets). Both linked from the settings hub.
- **Records** — `/m/[moduleKey]` list (status/search filters, `RecordList`),
  `/new`, `/[recordId]` (`RecordSummary`, links, CSV link), `/[recordId]/edit`
  — create/edit render through `LayoutRenderer` with the stored layout or a
  fallback; service rule errors render beside the form. Project-scoped modules
  also list at `/projects/[projectId]/m/[moduleKey]`, linked from a new
  `ProjectModuleTabs` strip on the project page (`ProjectTabs` accepts optional
  `moduleTabs`, defaults unchanged).
- **Shell + dashboard** — `(app)/layout.tsx` appends one server-resolved nav
  entry per visible org-scope module (icon keys only; static `navConfig`
  untouched). Home renders `DashboardWidgetsData` (`DashboardWidget` per
  user/shared widget with live report data).
- **Reports** — `/m/[moduleKey]/reports` (by-status + created tables, CSV links
  to the thin routes).
- **Small edits to existing files** — `layout-inputs.ts` entity union extended
  to `custom-module:<key>` (typed as `LayoutEntity`, so layouts routes now
  accept module layouts), `services/projects.ts` exposes `customModules`,
  `settings-nav.ts` + inventory test gain the two pages.

## Verification

- `pnpm --filter @876/projects-app typecheck` — clean.
- `pnpm --filter @876/projects-app lint` — 0 errors (4 pre-existing warnings
  in untouched auth/shell files).
- `pnpm --filter @876/projects-app test` — **215 files / 1458 pass**, including
  **74 new `it()`** across 6 files (`module-access` 18, `custom-module-inputs`
  18, `record-form-helpers` 18, browser clients 8, custom-module nav binding 6,
  `api/custom-modules` routes 6). The existing `settings-nav` inventory test
  was updated for the two new pages; `nav-config` binding stays green.
- `node scripts/check-app-structure.mjs projects` — OK.
- `pnpm check:rsc-boundaries` — OK (10 apps).
- No `eslint-disable`/`as any`/`@ts-ignore`, no run logs, no commit/branch/push.
  (`apps/console/**` changes in the working tree belong to the parallel 15d run.)

## Notes for 15d / follow-ups

- Role keys ride the interim `x-app-role-keys` header set only by
  `serviceWithRoleKeys`; replace with server-side grant resolution per the 15a note.
- Record detail shows links plus a report CSV shortcut; record activity has no
  service endpoint yet, so there is no activity section to render "if available".
- Widget titles live in `config.title` (the service has no top-level title);
  the app falls back to `<Module> count|by status|Recent <Module>`.
