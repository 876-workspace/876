# Brief: finish the @/types migration — remove compatibility re-exports

Branch: `refactor/projects-types-centralization` (already checked out in `/root/projects/876`).
Scope: `apps/projects/src/**` ONLY. Shared tree: do NOT run git checkout/stash/reset/clean/commit.

## Why
PR #619 moved shared contracts into `apps/projects/src/types/`, but left ~52
`export type { X }` / `export { X }` re-exports in implementation files "for
compatibility". There is no external compatibility contract (this is an app, not
a package), so per `.claude/rules/ai-code-quality.md` ("Do not create deprecated
aliases… unless an explicit compatibility requirement exists") they are dead
residue, and several callers still import contracts through implementation files
instead of `@/types/...` (violates `.claude/rules/types.md`).

## Tasks
1. In every non-`src/types` file under `apps/projects/src`, find re-exports of
   symbols that now live in `@/types/*`:
   - `export type { A, B }` (after an `import type { A, B } from '@/types/...'`)
   - `export type { X } from '@/types/...'`
   - `export { CONST, schema }` / `export { … } from '@/types/...'`
   Files known to contain them (from origin/main...HEAD diff) include:
   support-categories.ts, wiki-forms.tsx, calendar-range.ts, capacity-form.tsx,
   capacity-table.tsx, from-template-data.tsx, template-preview-query.ts,
   time-entry-form.tsx, time-entry-input.ts, time-entry-rows.ts, timer-state.ts,
   time-period.ts, attachment-links.ts, attachments.ts, access-context.ts,
   app-access.ts, api-permission.ts, lib/client/{baselines,collaboration,finance,index,integration,issue-links,layouts,notifications,onboarding,reports,request,templates,time,workflows}.ts,
   record-form-helpers.ts, record-pages.ts, integration-mappers.ts,
   layout-available-fields.ts, modules/catalog.ts, notification-mappers.ts,
   period.ts, provisioning/manifest.ts, portal-access.ts, visibility.ts,
   settings/users/_lib/types.ts, mention-input.tsx, collaboration/mappers.ts,
   event-form.tsx, issue-links-panel.tsx, my-work-sections.tsx, cycle-filters.ts,
   event-input.ts, issue-filters.ts, phase-filters.ts, reminder-timing.ts,
   report-query.ts, app/api/_lib/template-api.ts, attachments-api.ts.
   Search yourself too: `rg -n "^export (type )?\{" apps/projects/src --glob '!src/types/**'`
   and check each against `apps/projects/src/types`. Only remove re-exports of
   symbols whose definition lives in `src/types`. Leave genuine local exports alone.
2. For every importer (incl. tests, `vi.mock` factories, relative imports like
   `'../report-query'`) that pulls such a symbol from the implementation file,
   rewrite the import to the owning `@/types/<module>`. Keep non-type symbols
   imported from where they are still defined. Use `import type` for types.
3. Delete the re-export lines (and now-unused imports in those files).
   `apps/projects/src/app/(app)/settings/users/_lib/types.ts`: if it becomes
   empty/pure re-export, delete the file and repoint importers.
4. In `apps/projects/src/types/*.ts`, replace inline `import('pkg').X` type
   expressions with top-level `import type { X } from 'pkg'`.
5. `src/types/client.ts` has `ClientResult<T> = ClientApiResult<T>` — keep it
   (pre-existing app alias used widely) but make sure only one import path exists
   (`@/types/client`).

## Rules
- No behavior changes. No `eslint-disable`, `as any`, `@ts-ignore`.
- Do not touch `packages/**` or other apps.
- Run verification ONE command at a time, foreground:
  - `pnpm --filter @876/projects-app typecheck`
  - `pnpm --filter @876/projects-app lint`
  - `pnpm --filter @876/projects-app test`
  - `node scripts/check-app-structure.mjs` (repo root)
- Re-run until green. Test count must stay 1566 (231 files).

## Report
Write `plans/sep/17-projects-types-centralization/reports/codex/2026-09-17-remove-compat-reexports.md`:
files changed (count), re-exports removed (count), importers rewritten (count),
any re-export you kept and why, and the exact verification output summary
(exit codes, test counts). "Not verified" beats a false claim.
