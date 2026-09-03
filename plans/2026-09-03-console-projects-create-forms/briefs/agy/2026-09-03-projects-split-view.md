# Brief — Projects and Issues as list/detail split views

Repo `/root/projects/876`, branch `feat/console-projects-forms-split`.

**Do not run any `git` command.** The orchestrator stages and commits. No pull request.

## Goal

Today, opening a project or an issue in Console **replaces** the list. Convert both
to the platform's list/detail split view, where the record opens beside the list —
the pattern `.claude/rules/app-layout.md` §5a fixes and Billing Customers implements.

Read these three reference files in full before writing anything. They are the
template and you should follow them closely:

- `apps/billing/src/app/(app)/customers/layout.tsx`
- `apps/billing/src/app/(app)/customers/_components/customers-section.tsx`
- `packages/billing-ui/src/customers-list.tsx`

## Part 1 — two shared dual-form list components

`@876/projects-ui` currently exports `ProjectsTable` and `IssuesTable`, which render
only the full table. Add a component beside each that renders **both** forms — the
full table when nothing is open, a condensed `ListPane` when a record is open.

| File                                               | Export         | Wraps           |
| -------------------------------------------------- | -------------- | --------------- |
| `packages/projects-ui/src/project-list.tsx` (edit) | `ProjectsList` | `ProjectsTable` |
| `packages/projects-ui/src/issue-list.tsx` (edit)   | `IssuesList`   | `IssuesTable`   |

Both live in the **same file** as the table they wrap, and both are `'use client'`.

Copy `packages/billing-ui/src/customers-list.tsx` exactly, changing only the domain:

```ts
export type ProjectsListProps = {
  projects: readonly Project[]
  projectsHref: string
  newProjectHref?: string | null
  emptyState?: ReactNode
}
```

- `const segments = useDetailSegments()` from `@876/ui/list-detail-shell`;
  `const selectedId = segments[0] ?? null`.
- When `selectedId` is null, return the existing `ProjectsTable` unchanged.
- Otherwise return a `ListPane` / `ListPaneHeader` / `ListPaneBody` / `ListPaneItem`
  tree from `@876/ui/list-pane`, one item per row, `selected={project.id === selectedId}`,
  `href={query ? `${projectsHref}/${project.id}?${query}` : `${projectsHref}/${project.id}`}`
  where `query = useSearchParams().toString()`.
- Header text: `Projects` / `Issues`. Empty text: `No projects yet` / `No issues yet`,
  in a `ListPaneEmpty`.

**The condensed row must keep everything the table row encodes.** For a project that
is the name, the key, and the `ProjectStatusBadge`. For an issue it is the
identifier, the title, and the `IssueStatusBadge`. A collapsed list that drops the
table's visual language makes the two views disagree about the same record
(`app-layout.md` §5a).

**Issues select by `identifier`, not `id`** — `issue-list.tsx:57` already links rows
by identifier, so `selectedId` is compared against `issue.identifier` and the href is
built from it.

Add both to `packages/projects-ui/package.json` `exports` only if they need a new
subpath — they do **not**: they live in the existing `./project-list` and
`./issue-list` files, so that file needs no change. Do not add subpaths.

## Part 2 — restructure the four Console sections

Four sections change, two resources on each of two surfaces:

| Surface   | Section root                                                         |
| --------- | -------------------------------------------------------------------- |
| platform  | `apps/console/src/app/(app)/projects/projects`                       |
| platform  | `apps/console/src/app/(app)/projects/issues`                         |
| workspace | `apps/console/src/app/(app)/orgs/[slug]/workspace/projects/projects` |
| workspace | `apps/console/src/app/(app)/orgs/[slug]/workspace/projects/issues`   |

Each becomes the five-file shape:

| File                            | Contents                                                                                                                                                                                      |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `layout.tsx`                    | resolves the org, renders `<XSection list={<Suspense fallback={<DataTableSkeleton …/>}><XListData …/></Suspense>}>{children}</XSection>`                                                      |
| `_components/<x>-section.tsx`   | `'use client'`, reads `useSearchParams().get('status') ?? 'all'`, renders `ListDetailSection` from `@876/ui/list-detail-section` with the toolbar, the list, and `takeoverSegments={['new']}` |
| `_components/<x>-list-data.tsx` | server; fetches and renders the shared `ProjectsList`/`IssuesList` inside `<div className="flex h-full min-h-0 flex-col gap-3">`                                                              |
| `_components/<x>-toolbar.tsx`   | `'use client'`; the `ResourceToolbar` + `StatusFilterHeading` currently in `(list)/page.tsx`                                                                                                  |
| `(list)/page.tsx`               | keeps its `metadata` and returns `null`                                                                                                                                                       |

The existing `[projectId]/page.tsx` and `[issueRef]/page.tsx` stay where they are and
keep their data components. Remove their outer wrapper `div`s so the card is the
detail column's only child — a wrapper reintroduces flow height and collapses the
card (`app-layout.md` §5a, "the two columns each need their own `min-h-0`").

**Height — the part that gets built wrong.** Console's workspace `<main>` is a
scrolling page with no definite height, so `h-full` is inert there. The workspace
layouts (files under `orgs/[slug]/`) must wrap the section in

```tsx
<div className="min-h-[32rem] h-[calc(100svh-11rem)] sm:h-[calc(100svh-12rem)] lg:h-[calc(100svh-13rem)]">
```

The platform `/projects` section renders inside Console's `AppShell`, so it uses
`h-full min-h-0` instead. Getting this wrong produces the exact symptom the rule
names: the card at the top, the list far below it, with a large gap. Read
`app-layout.md` §5a "Height" before writing either layout.

The `_components/` directories are route-private siblings of `page.tsx`
(`.claude/rules/app-structure.md`) — do not put these files in `features/projects/`,
and do not import one section's `_components/` from another section.

## Part 3 — tests

Add, at minimum:

- `packages/projects-ui/src/project-list.test.tsx` — **6** `it()` cases: renders the
  full table when no record is open; renders the condensed pane when one is;
  marks the open row `selected`; keeps the status badge in the condensed row;
  preserves the query string on condensed hrefs; renders the empty text with no rows.
- `packages/projects-ui/src/issue-list.test.tsx` — **6** equivalent cases, including
  one asserting selection is by `identifier` and not `id`.
- One layout test per Console section (**4** files) asserting the toolbar renders
  and that `(list)/page.tsx` returns `null`.

Mock `@876/ui/list-detail-shell`'s `useDetailSegments` and `next/navigation`'s
`useSearchParams` with `vi.hoisted` + `vi.mock`. Assert exact values, never
`toBeDefined()`.

## Rules

No `as any`, no `eslint-disable`, no `@ts-ignore`. No `overscroll-contain` on either
pane — it belongs to overlays, and on an in-page pane it freezes the whole page under
the cursor. Do not weaken a production signature to make a test easier.

## Verification

```bash
pnpm --filter @876/projects-ui typecheck
pnpm --filter @876/projects-ui test
pnpm --filter @876/console typecheck
pnpm --filter @876/console lint
pnpm --filter @876/console test
node scripts/check-app-structure.mjs
```

`check-app-structure.mjs` enforces the route-group and fallback rules this
restructure touches; a failure there is a real defect, not a check to work around.

## Report

`plans/2026-09-03-console-projects-create-forms/reports/agy/2026-09-03-projects-split-view.md`
— files changed and why, counted `it()` cases per file, exact verification output,
and anything you could not do.
