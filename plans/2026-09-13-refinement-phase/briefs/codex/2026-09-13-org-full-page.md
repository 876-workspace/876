# Brief (Codex gpt-5.6-terra, medium): Console organization opens on its own page

Working directory: `/root/projects/876` (the main checkout — there are NO worktrees; do not create one). Another Codex run is editing list toolbars elsewhere in this same tree at the same time: stay strictly inside your file scope, never revert or reformat files you did not change, never run `git checkout`/`git stash`/`git reset`/`git clean`. Do not commit, branch, push, or open PRs.

## Rules to read first (binding)
`.claude/rules/app-layout.md` (§1–§7, §5a), `.claude/rules/navigation-performance.md` (Rules 1–2), `.claude/rules/app-structure.md`, root `CLAUDE.md` "Loading States & Suspense Placement", `.claude/rules/testing.md`, `.claude/rules/ai-code-quality.md`.

## Goal (user item 9)
Today `/orgs` is a list/detail split view: `apps/console/src/app/(app)/orgs/layout.tsx` renders `OrgsSection` (list column + detail column), and `orgs/[slug]/layout.tsx` renders the organization inside a `DetailCard` beside the list. The user wants **viewing an organization to open on its own full page**, not beside the list. Users (`/users`) stay a split view — do not touch them.

## What to build
1. `/orgs` (list) remains a normal full-width list page: standard container, `ResourceToolbar` with `titleFilter={<StatusFilterHeading …/>}` (§5, thread status into the list/search call as today), primary `Add` (`primaryVariant="info"`, href `/orgs/new`), `refresh`, and `dropdownActions` Import / Export (disabled if no handler exists; if `DropdownAction` lacks `disabled`, the other Codex run is adding it to `packages/ui/src/components/resource-toolbar.tsx` — do NOT edit that file; use only fields that exist and note the gap). Table rows link to `/orgs/[slug]`. Search bar and pagination behave as today.
2. `/orgs/[slug]/**` renders as its own page, full content width, with no list beside it. Keep the existing header (logo, name, status, meta, `OrgActions`), the tab strip (`orgTabs` + `EntitledCardTabs`), `DeletedNotice`, and every child route unchanged. Replace the close (×) affordance with the §7 back link `PageBreadcrumb href="/orgs" label="Organizations"` at the top. Keep `DetailChromeGate` behavior for `/edit`.
3. Remove what becomes dead: the `@list` parallel slot, `OrgsSection`'s split-view shell, condensed `ListPane` rendering in `orgs-list.tsx`, `useDetailSegments` selection logic, and their tests — replace them with tests for the new shape. Search the repo for other importers before deleting anything.
4. `/orgs/new` stays a dedicated page (§1).
5. Loading states: list page chrome renders immediately with `DataTableSkeleton` (real columns from `orgs-skeleton-columns.ts`) behind Suspense; `[slug]` layout awaits `params` only (navigation-performance Rule 2); no `loading.tsx` stacked over a route group (Rule 1). Run `node scripts/check-app-structure.mjs`.
6. Height: once no longer a split view, do not leave `h-full min-h-0`/viewport height hacks that only existed for `ListDetailShell`.

## File scope (only these)
`apps/console/src/app/(app)/orgs/**` and new tests beside those files. If a shared component outside this scope truly needs a change, stop and report instead of editing it.

## Tests (floors) — at least 8 `it()`
- list page: renders toolbar with status heading, Add, and table; row href is `/orgs/<slug>`;
- `[slug]` layout: renders the back link to `/orgs`, header, and tabs; no list/`ListPane` is rendered;
- removed split-view behavior is not referenced (update/replace old `orgs-section` / `orgs-list` tests);
- negative space: an unknown slug still hits `notFound()`.
No `eslint-disable`, `@ts-ignore`, `as any`. Do not weaken production props for tests.

## Verify — run and fix until green
```
rm -rf apps/console/.next/types apps/console/.next/dev/types
pnpm --filter @876/console typecheck
pnpm --filter @876/console lint
pnpm --filter @876/console exec vitest run "src/app/(app)/orgs"
node scripts/check-app-structure.mjs
```
If typecheck errors appear in files outside your scope (the other run is mid-edit), note them and do not fix them.

## Report
Write `plans/2026-09-13-refinement-phase/reports/codex/2026-09-13-org-full-page.md`: files changed/deleted with reasons, counted `it()` added, verification results (actual output), gaps.
