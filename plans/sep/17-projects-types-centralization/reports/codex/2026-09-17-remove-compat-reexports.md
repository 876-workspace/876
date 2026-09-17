# Remove `@/types` compatibility re-exports — report

Date: 2026-09-17. Branch: `refactor/projects-types-centralization`. Scope: `apps/projects/src/**` only.

## Summary

All compatibility re-exports of `@/types/*`-owned symbols were removed from implementation files,
every importer was repointed at the owning `@/types/<module>`, inline `import('pkg')` types in
`src/types` were hoisted to top-level `import type`, and the two pure-shim files were deleted.
All four verification commands pass with the required test count.

## Counts (verified from `git diff HEAD -- apps/projects/src`)

- **Files changed: 234** — 233 modified + 1 deleted
  (`app/(app)/settings/users/_lib/types.ts`). Method: `git status --short` / `git diff --stat`.
- **Re-exports removed: 59 statements / 120 symbols across 55 files.** Method: parsed the full diff,
  grouping removed lines into `export { … }` / `export type { … }` blocks (single- and multi-line)
  and counting identifiers. Largest: the deleted `settings/users/_lib/types.ts` shim (6 symbols),
  `ApiContext` (value+type re-export in `lib/auth/api-permission.ts`), schema/value re-exports
  (`templateIncludeSchema`, `CALENDAR_VIEWS`/`DAY_SECONDS`, `REPORT_GROUPS`/`REPORT_LINKS`/`REPORT_SLUGS`,
  `ATTACHMENT_RELATION`/`attachmentResourceTypes`, attachment zod schemas).
- **Importers rewritten: 180 files.** Method: files with an added `import … from '@/types/…'` line
  (182 added import lines total; `import type` used for types). Includes relative-import and
  `vi.mock`-factory callers. Additionally, **3 files** merged new symbols into a pre-existing
  same-module `@/types` import in place (modified line, no net-new line):
  `app/api/attachments/link/[linkId]/route.ts`, `features/reports/components/report-links.tsx`,
  `features/reports/components/time-report-data.tsx`.
- No `eslint-disable`, `as any`, `@ts-ignore`/`@ts-nocheck` added (diff scan empty).
- Nothing outside `apps/projects/src` touched (only pre-existing untracked `plans/…/briefs/` dir
  remains, not created by this work).

## Re-exports deliberately kept (genuine, not `@/types`-owned)

- `lib/client/layouts.ts` — `export type { LayoutCondition, LayoutEffect, LayoutField, LayoutRule,
  LayoutSection }`: re-exported from `@876/projects/contracts`, which has no `src/types` counterpart.
- `lib/auth/session-cookie.ts` — values/types re-exported from `@876/core/auth/session-cookie`
  (external owner, not `src/types`).
- `lib/client/index.ts` — `export { baselinesClient, … }` client value barrel (local definitions).
- `features/projects/components/new-issue-form.tsx` — `export { EditIssueForm, NewIssueForm }`
  from `./issue-form` (local definitions).
- `types/collaboration.ts:74` — `export type { ActivityFeed, DiscussionPost, WikiRevision } from
  '@876/projects'`: lives inside the central `src/types` tree itself (the owner), so it is the
  canonical path, not a compat shim.
- `src/types/client.ts` — `ClientResult<T> = ClientApiResult<T>` kept per brief; verified single
  import path: all 4 consumers import `ClientResult` from `@/types/client`, and `ClientApiResult`
  is imported from `@876/core/client` only in `types/client.ts`.

## Extra cleanup in this session

Lint (first run) surfaced 4 unused-import warnings left behind by the re-export removals
(same symbols previously kept alive only for re-export): `z` in
`app/api/attachments/_lib/attachments-api.ts`, `MyWork` in `my-work-sections.tsx`,
`ActivityFeed`/`WikiRevision` in `lib/client/collaboration.ts`. Removed the unused names
(exact-string edits, diff-reviewed). Second lint run is down to the 4 pre-existing warnings.

## Verification (one command at a time, foreground, in order)

1. `pnpm --filter @876/projects-app typecheck` → exit **0** (`$ tsc --noEmit`, no output).
2. `pnpm --filter @876/projects-app lint` → exit **0** (`✖ 4 problems (0 errors, 4 warnings)` —
   all 4 are pre-existing `@next/next/no-location-assign-relative-destination` warnings in
   `login/_components/embedded-auth.tsx`, `register/_components/registration-auth.tsx`,
   `components/shell/org-switcher.tsx`, `components/shell/user-menu.tsx`; none touched by this work).
3. `pnpm --filter @876/projects-app test` → exit **0** —
   `Test Files 231 passed (231)`, `Tests 1566 passed (1566)`, duration 133.37s. Count matches requirement.
4. `node scripts/check-app-structure.mjs` (repo root) → exit **0** —
   `app-structure: OK (console, billing, couriers, 876, enterprise, invoice, crm, projects, commerce)`.

## Notes / provenance

- The bulk of this work (importer rewrites, re-export deletion, shim deletion, inline-`import()`
  hoisting) was implemented in a prior session on the same branch; this session verified the
  end state, removed the 4 leftover unused imports, re-ran all four verifications to green,
  and wrote this report. That session also noted it restored two script-corrupted files via
  `git checkout HEAD -- <paths>` followed by hand-applied edits; no checkout/stash/reset/clean/commit
  was run in this session (read-only `git show`/`diff`/`status` only).
- Test count held at exactly 1566 / 231 files; no behavior changes (import/export-only edits plus
  two deleted pure-shim modules with repointed importers).
