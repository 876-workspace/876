# Brief — Phase 2: restore the platform filter standard on Issues and Board

Branch: `feature/projects-mobile-and-agentic`. Do **not** create a branch, do
**not** commit. The orchestrator commits.

## Read budget — these 5 files only, then start writing

1. `apps/projects/src/features/projects/components/issue-filter-bar.tsx` (158 lines — the file you are replacing)
2. `apps/projects/src/features/projects/components/issues-data.tsx` (93 lines)
3. `apps/projects/src/app/(app)/issues/(list)/page.tsx` (42 lines)
4. `packages/ui/src/components/status-filter-heading.tsx`
5. `packages/ui/src/components/resource-toolbar.tsx`

Do not read the rest of the app. Everything else you need is pasted below.

## The problem

The Issues page renders a **seven-control filter card** above the table: a
`<form method="get">` wrapped in `876-card` with Search, Project, Status,
Priority, Assignee, Label, Order, Group and an `Apply filters` button. It eats
the top third of a desktop screen and is unusable on a phone.

The platform standard (`.claude/rules/app-layout.md` §5) is that **the page
title itself is the status filter**, and this page is in breach of it.

## What to build

### 1. The title becomes the status filter

`ResourceToolbar` already accepts a `titleFilter` slot — here is its documented
contract, verbatim from `packages/ui/src/components/resource-toolbar.tsx`:

```
  /**
   * Renders in place of the plain `title` heading — e.g. a filterable
   * heading control. Keeps the same layout slot; the right-side actions are
   * unaffected. `title` is still required (used as the fallback label).
   */
  titleFilter?: React.ReactNode
```

And `StatusFilterHeading` from `@876/ui/status-filter-heading`:

```ts
export type StatusFilterOption = {
  value: string
  label: string
  headingLabel?: string
}
type Props = {
  label: string        // fallback label, e.g. "Issues"
  value: string        // current value resolved server-side from the URL
  options: StatusFilterOption[]  // plain serializable data — NO icons, NO functions
  paramKey?: string    // defaults to 'status'
}
```

In `issues/(list)/page.tsx`, build the options from the org's workflow states
and pass the heading into the toolbar:

```tsx
<ResourceToolbar
  title="Issues"
  titleFilter={
    <StatusFilterHeading
      label="Issues"
      value={filters.values.status ?? 'all'}
      options={statusOptions}
    />
  }
  primaryLabel="Add"
  primaryHref="/issues/new"
  primaryVariant="info"
  refresh
/>
```

`statusOptions` is `[{ value: 'all', label: 'All states' }, ...states.map(s => ({ value: s.key, label: s.name }))]`.

**Where the states come from.** The page needs them to render chrome, and
`IssuesData` needs them for the filter sheet. Create a request-memoized loader
so this is **one** round trip, not two:

```ts
// apps/projects/src/features/projects/workflow-state-options.ts
import 'server-only'
import { cache } from 'react'
import { projects } from '@/lib/clients/projects'

export const loadWorkflowStateOptions = cache(async (orgId: string) => {
  const result = await projects.workflowStates.list(orgId)
  return {
    states: result.data?.data ?? [],
    error: result.error ?? null,
  }
})
```

`React.cache` compares arguments with `Object.is`, so it **must** take the
primitive `orgId`, never an object literal — an object argument never hits the
cache. Call it from the page and from `IssuesData`; both get one fetch.

### 2. Everything else goes in a Filters popover, with chips

Replace the whole `<form>` card in `issue-filter-bar.tsx` with a **client**
component that renders:

- a single **Filters** trigger button (`variant="outline" size="sm"`), showing a
  count badge when filters are active — e.g. `Filters · 3`;
- a search `Input` beside it, `w-full sm:max-w-xs`, which navigates on submit
  (Enter) — keep `name="q"` semantics;
- **active filter chips** under the row: one removable chip per applied filter
  reading `Project: Console`, `Priority: High`, `Assignee: Raheem`, `Label: bug`,
  `Order: Recently updated`, `Group: Workflow state`. Each chip's × navigates to
  the same URL minus that param. A `Clear all` ghost link appears when any chip
  is present.

Inside the popover/sheet: Project, Priority, Assignee, Label, Order, Group —
the same option lists that exist today (copy them verbatim from the current
file; they are correct). **Status is not in the popover** — it is the heading.

- Desktop (`sm` and up): `Popover` from `@876/ui/popover`.
- Phone (below `sm`): `Sheet` from `@876/ui/sheet`, `side="bottom"`. If the
  repo's sheet export differs, use whatever `@876/ui` actually exports — check
  `packages/ui/package.json` exports rather than guessing an import path.

Render both and show/hide with Tailwind `hidden sm:block` / `sm:hidden`, or use
one component if the repo already has a responsive primitive. Do **not** branch
on a JS viewport hook — this tree is server-rendered and that is a hydration
mismatch.

### 3. No Apply button

Changing a control navigates immediately. `Apply filters` exists only because
this was a `<form>`; it is not a platform pattern and it is being deleted.
Build the target URL with `URLSearchParams`, preserve unrelated params, and
**clear the `after`/`before` pagination cursors** whenever a filter changes —
`StatusFilterHeading` already does exactly this; mirror its behaviour.

Use `useRouter().push()` from `next/navigation` in the client component.

### 4. The filter chrome renders before the data

Today `IssueFilterBar` is rendered **inside** `IssuesData`, which sits inside
the page's `<Suspense>` — so the filter controls are hidden behind the issue
fetch. That is a `.claude/rules/data-loading.md` violation: stable chrome must
render immediately.

Move `IssueFilterBar` **out** of `IssuesData` and into the page, directly under
the `ResourceToolbar` and **above** the `<Suspense>` boundary. `IssuesData`
keeps only the table and its grouping.

### 5. Board page gets the same treatment

`apps/projects/src/app/(app)/board/page.tsx` uses the same filter bar with
`action="/board"` and `allowUngrouped={false}`. Apply the identical change
there. Keep `allowUngrouped` working — the board must not offer "No grouping".

## Hard constraints

- **No function props across the RSC boundary** (`.claude/rules/production-render-errors.md`
  Rule 1). Server components pass plain data and hrefs only; all handlers live
  inside `'use client'` files. This crashes production with React #441 if you
  get it wrong.
- `StatusFilterHeading` options must stay plain `{value,label}` data.
- No `eslint-disable`, no `@ts-ignore`, no `as any`.
- No green buttons. No explanatory `<p>` under a heading.
- Do not weaken a production signature to make a test easier.
- **Do not touch** `packages/projects-ui/src/issue-detail.tsx` or anything under
  `apps/projects/src/app/(app)/issues/[issueRef]/` — another delegate is in
  those files right now. Touching them will cause a conflict.
- Keep `parseIssueFilters` and `IssueSearchParams` semantics unchanged; the URL
  contract stays the same so existing links keep working.

## Tests — floor is 12 new `it()` cases

Place them beside the components they test (`*.test.tsx`).

1. the toolbar renders `StatusFilterHeading` with the workflow-state options;
2. an unknown `status` value falls back to `all`;
3. `status=all` produces no status filter in the query passed to the client;
4. a chip renders for each applied filter, with the human label not the raw id;
5. no chips render when no filters are applied;
6. a chip's remove link drops only that param and keeps the others;
7. removing a filter clears `after`/`before` cursors;
8. the Filters trigger shows the active count;
9. the popover lists every non-status filter;
10. the popover does **not** contain a Status control;
11. `allowUngrouped={false}` omits the "No grouping" option;
12. `loadWorkflowStateOptions` is called once per request for two callers
    (assert the underlying client was invoked exactly once).

Assert exact strings and both branches. `expect(x).toBeDefined()` on its own is
not a test — see `.claude/rules/testing.md`.

## Verify yourself, one command at a time (never in parallel)

```bash
pnpm --filter @876/projects typecheck
pnpm --filter @876/projects test
```

## Report

Write `plans/sep/19-projects-mobile-and-agentic/reports/opencode/2026-09-19-issue-filter-standard.md`:
files changed and why, the **counted** number of `it()` cases added, the
commands you ran with their real output, what you could not verify, and
anything left undone. An honest gap beats a confident claim.
