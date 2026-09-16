# Brief (Codex gpt-5.6-terra, medium): one standard list toolbar across the ecosystem

Working directory: `/root/projects/876` (the main checkout — there are NO worktrees; do not create one). A second Codex run is editing `apps/console/src/app/(app)/orgs/**` in this same tree at the same time: never run `git checkout`/`git stash`/`git reset`/`git clean`, never revert or reformat files you did not change. Do not commit, branch, push, or open PRs — the orchestrator does that.

## Rules to read first (binding)
`.claude/rules/app-layout.md` (§3, §4, §5, §5a, §10), `.claude/rules/ai-code-quality.md`, `.claude/rules/app-structure.md`, `.claude/rules/testing.md`, `.claude/rules/naming.md`, root `CLAUDE.md` "Loading States & Suspense Placement".

## Scope: sidebar-style Next apps only
`apps/console`, `apps/billing`, `apps/invoice`, `apps/couriers`, `apps/crm`, `apps/enterprise`, `apps/projects`, and shared `packages/ui`, `packages/billing-ui`, `packages/crm-ui`, `packages/access-ui`, `packages/projects-ui`, `packages/work-ui`. NOT `apps/876` (consumer app).

**Do not touch these paths**: `apps/console/src/app/(app)/orgs/**` (the other Codex run owns it), `apps/console/src/app/(app)/users/[username]/**` (just refined), `apps/docs/**`, `plans/**` except your report. If a typecheck error appears inside `orgs/**`, it is the other run mid-edit — ignore it.

You own `packages/ui/src/components/resource-toolbar.tsx`; the other run depends on the `disabled?: boolean` field on `DropdownAction`, so add it early.

## Task A — every collapsed list toolbar keeps its primary `+ Add` (user item 10)
In list/detail split views (`ListDetailSection`, `ListDetailShell`, `*-shell.tsx`, `*-section.tsx`, `*-toolbar.tsx`), the toolbar must keep its primary create button when a record is open and the list is collapsed to a sidebar. Find every place that removes or hides the primary action based on open/collapsed/selected state (e.g. `primaryLabel={open ? undefined : 'Add'}`, `useListDetailRoute().open`, `useDetailSegments`, `isOpen`, CSS that hides it at the narrow width, `primaryIconOnly` dropping it). Fix so the button always renders. When the column is narrow it may render icon-only (`primaryIconOnly`) but must stay present and keep an accessible name. Permission gating (`canWrite ? ... : undefined`) is legitimate and stays.
Candidates already spotted: `apps/billing/src/app/(app)/settings/users/_components/users-shell.tsx`, `apps/crm/src/app/(app)/customers/_components/customers-shell.tsx`, `apps/invoice/src/app/(app)/settings/users/_components/users-shell.tsx`, `packages/billing-ui/src/panels/access/roles-shell.tsx`, `packages/ui/src/components/resource-toolbar.tsx`. Search for all others.
Label rule (§3/§10): bare `Add`, `primaryVariant="info"`. Where a toolbar uses `New`, change to `Add` only if it is a list-page toolbar (not a document "New Transaction" menu).

## Task B — every list page uses `StatusFilterHeading` (user item 11)
Every list page's `ResourceToolbar` must pass `titleFilter={<StatusFilterHeading … />}` from `@876/ui/status-filter-heading` with a relevant title and options (§5). Rules:
- Resource with a lifecycle status → filter on it; thread the value into the owning list/search call as the rule shows. If the list client method has no `status` param, do NOT fake it client-side in a server page and do NOT change a backend: instead record it in the report as a gap, and still render the heading with only `All <Title>` so the chrome is consistent.
- Resource with no lifecycle status → filter on the axis operators use (e.g. type) with `paramKey`, or a single `All` option.
- Option label for `all` is `All <Title>` (e.g. `All Customers`); the `label` prop is the page title.
- Delete any per-app copies of the heading component and import the shared one.
- In split views, the heading reads `useSearchParams()` in the client section per §5a.

## Task C — standard toolbar `···` options (user item 14)
`ResourceToolbar` already supports `refresh` (built-in) and `dropdownActions` with icon keys `import|export|delete`. Make every list page's toolbar offer the standard set in the §4 order: Refresh → separator → Import → Export. Delete only where bulk delete already exists.
- Pass `refresh` everywhere.
- Import/Export: wire to an existing handler where one exists; otherwise render them `disabled` (check `DropdownAction` for a `disabled` field; if it lacks one, add `disabled?: boolean` to `DropdownAction` in `packages/ui/src/components/resource-toolbar.tsx` and render `DropdownMenuItem disabled`). No new backend endpoints, no fake export.
- Remove hand-built `DropdownMenu`s next to a toolbar that duplicate this (e.g. disabled "Import contacts"/"Export contacts" menus) by moving them into `dropdownActions`.
- Labels are bare verbs.

## Tests (floors)
- `packages/ui`: `resource-toolbar` tests covering refresh item first, separators, disabled import/export, primary rendered in icon-only mode with accessible name — at least 6 `it()`.
- At least one test per app you change proving a split-view toolbar keeps its primary action while a record is open — at least 5 `it()` total.
- Update existing tests you break; never delete another test to make a suite pass.
No `eslint-disable`, `@ts-ignore`, `as any`. Do not weaken production props to make tests easier.

## Verify — run and fix until green
```
pnpm --filter @876/ui typecheck && pnpm --filter @876/ui test
pnpm --filter @876/console typecheck && pnpm --filter @876/console lint && pnpm --filter @876/console test
pnpm --filter ./apps/billing typecheck && pnpm --filter ./apps/billing test
pnpm --filter ./apps/invoice typecheck && pnpm --filter ./apps/invoice test
pnpm --filter @876/couriers-app typecheck && pnpm --filter @876/couriers-app test
pnpm --filter ./apps/crm typecheck && pnpm --filter ./apps/crm test
node scripts/check-app-structure.mjs
grep -rn "eslint-disable\|as any\|@ts-ignore" $(git diff --name-only)
```
(Also typecheck any other app/package you edit.)

## Report
Write `plans/2026-09-13-refinement-phase/reports/codex/2026-09-13-list-toolbar-standard.md`: per-task table of files changed; list pages converted; gaps where a list method lacks `status`; counted `it()` added; verification results (actual pass/fail); anything left undone.
