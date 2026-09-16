# Brief (Codex gpt-5.6-terra, medium): list toolbar standard — part 2 (`Couriers, CRM, Invoice, Projects, Enterprise`)

Working directory: `/root/projects/876` — the main checkout, branch `feat/list-toolbar-standard-part-2`. **No worktrees.** Two other Codex runs are editing other apps in this same tree right now. Never run `git checkout`, `git stash`, `git reset`, `git clean`, or `git restore`; never edit, revert, or reformat a file outside your scope. Do not commit, branch, push, or open PRs.

## Your scope (only these paths)
- `apps/couriers/**`
- `apps/crm/**`
- `apps/invoice/**`
- `apps/projects/**`
- `apps/enterprise/**`
- `packages/crm-ui/**`, `packages/projects-ui/**`, `packages/work-ui/**`, `packages/access-ui/**`

Everything else is off limits, including `packages/ui` (the shared toolbar is already done: `ResourceToolbar` has `refresh`, `titleFilter`, `dropdownActions` with `icon: 'import'|'export'|'delete'`, `separator`, `destructive`, and `disabled`). If you truly need a shared change, stop and write it in your report.

## Background
Part 1 (merged, PR #549) fixed Billing users, Invoice users, CRM customers, billing-ui roles, and the org list. Read `plans/2026-09-13-refinement-phase/reports/codex/2026-09-13-list-toolbar-standard.md` and those files as the reference shape — especially `packages/billing-ui/src/panels/access/roles-shell.tsx` and `apps/console/src/app/(app)/orgs/_components/orgs-toolbar.tsx`.

## Rules to read first (binding)
`.claude/rules/app-layout.md` §3, §4, §5, §5a, §10; `.claude/rules/ai-code-quality.md`; `.claude/rules/testing.md`; root `CLAUDE.md` "Loading States & Suspense Placement".

## The standard — apply to every LIST page toolbar in scope
A list page is a page (or split-view section/shell/layout) whose main content is a collection. **Not** create/edit pages (`/new`, `/edit`), detail pages, settings forms, or dashboards — leave those alone.

1. **Status filter heading (item 11):** `titleFilter={<StatusFilterHeading label="<Title>" value={…} options={…} />}` from `@876/ui/status-filter-heading`. First option is `{ value: 'all', label: 'All <Title>' }`.
   - Lifecycle status exists and the list call accepts a status param → thread it through exactly as §5 shows.
   - No status param on the list call → do not filter client-side and do not touch a backend/SDK; render the heading with only the `All <Title>` option and list the page under "status gaps" in your report.
   - Split views read the value with `useSearchParams()` in the client section (§5a).
   - Delete any per-app copy of a status-filter heading component that your scope still imports, and use the shared one.
2. **Primary Add (item 10):** bare `Add`, `primaryVariant="info"`, pointing at the existing create route. In split views it must stay rendered while a record is open (icon-only allowed, accessible name kept). Keep genuine permission gating. Do not invent a create route that does not exist — if none exists, omit Add and note it.
3. **Standard `···` menu (item 14):** `refresh`, then `dropdownActions` Import (`icon: 'import'`) and Export (`icon: 'export'`) with `separator` before them per §4. Wire to existing handlers where they exist; otherwise `disabled: true`. Add Delete (last, `destructive`) only where bulk delete already exists. Fold any hand-built duplicate menu beside the toolbar into `dropdownActions`.
4. A shared wrapper (e.g. Billing's `streaming-resource-page.tsx` / `streaming-resource-toolbar.tsx`, Console's `finance-workspace-pages.tsx` / `couriers-workspace-pages.tsx`) should be fixed once at the wrapper so every page using it inherits the standard — prefer that over per-page duplication.

## Tests
- At least one test per app/package you change proving a toolbar renders the status heading, Refresh, Import, Export, and Add — and for each split view you change, that Add survives an open record. Floor: **6 `it()` total** in your scope.
- Update tests your change breaks; never delete another test to go green. No `eslint-disable`, `@ts-ignore`, `as any`. Do not weaken production props for tests.

## Verify — run in the foreground and fix until green (only your packages)
```
export NODE_OPTIONS=--max-old-space-size=8192
for p in @876/couriers-app ./apps/crm ./apps/invoice ./apps/projects ./apps/enterprise; do pnpm --filter $p typecheck && pnpm --filter $p lint && pnpm --filter $p test; done
pnpm --filter @876/crm-ui test && pnpm --filter @876/projects-ui test
node scripts/check-app-structure.mjs
grep -rn "eslint-disable\|as any\|@ts-ignore" <every file you changed>
```
If a typecheck error sits in a file outside your scope, another run is mid-edit: note it, do not fix it.

## Report
Write `plans/2026-09-13-refinement-phase/reports/codex/2026-09-13-list-toolbar-standard-part-2-others.md`: table of list pages converted (heading / Add / menu); status gaps; pages intentionally skipped and why; counted `it()` added; actual verification results.
