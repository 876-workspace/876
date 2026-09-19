# Brief — Phase 1: rebuild the 876 Projects issue detail page

Branch: `feature/projects-mobile-and-agentic`. Do **not** create, rename, merge
or rebase a branch. Do **not** commit — the orchestrator stages and commits.

## The problem

The issue page is five unrelated cards stacked down the screen, and on a phone
it is unusable. Read these two files first and nothing else before you start:

- `packages/projects-ui/src/issue-detail.tsx` (376 lines)
- `apps/projects/src/app/(app)/issues/[issueRef]/_components/issue-detail-data.tsx` (200 lines)

The structural defect is visible in both at once. `IssueDetail` internally owns
a `<div className="grid gap-6 lg:grid-cols-3">` with a 2-col content column and
a 1-col meta rail. But the *page* then renders four more sections as siblings
**outside** that grid, each wrapped in `mt-6 lg:mr-[33.333333%]` to fake
alignment with a grid they are not inside. Above the component sit two more
free-floating bars (`IssueVisibilityData`, `IssueStatusSelect`), each its own
row. That is six vertical bands where there should be one record.

## What to build

### 1. The page owns the grid

`IssueDetail` stops owning `lg:grid-cols-3`. It becomes a presentation
component exporting three pieces from the same file:

```tsx
export function IssueDetailHeader(props: IssueDetailHeaderProps): JSX.Element
export function IssueDetailBody(props: IssueDetailBodyProps): JSX.Element   // description, sub-issues, activity
export function IssueMetaRail(props: IssueMetaRailProps): JSX.Element       // status/priority/assignee/dates/labels/custom fields
```

Keep the existing `IssueDetail` export as a thin composition of the three so
`packages/projects-ui/src/issue-detail.test.tsx` and any other caller keeps
working. Do not delete tests; extend them.

`issue-detail-data.tsx` then renders **one** grid:

```tsx
<div className="space-y-6">
  <IssueDetailHeader … />           {/* full width */}
  <div className="grid gap-6 lg:grid-cols-3">
    <div className="min-w-0 space-y-6 lg:col-span-2">
      <IssueDetailBody … />
      <Suspense …><IssueLinksData … /></Suspense>
      <Suspense …><IssueCommentsLoader … /></Suspense>
      <Suspense …><AttachmentsData … /></Suspense>
    </div>
    <aside className="space-y-6">
      <IssueMetaRail … />
      <Suspense …><RemindersData … /></Suspense>
    </aside>
  </div>
</div>
```

**Every `lg:mr-[33.333333%]` must be gone.** If one survives, the phase failed.

### 2. One header action row

`IssueVisibilityData` and `IssueStatusSelect` stop being their own stacked
bands. Pass them into `IssueDetailHeader` as a `actions?: ReactNode` slot
alongside the Edit link, so status select, visibility toggle, follow and Edit
sit on one row. They stay server-rendered exactly as today — you are moving
where they render, not how they load.

Header layout:

- line 1: `PROJ · PROJ-123` in the existing mono/info style, plus
  `IssueStatusBadge` / `IssuePriorityBadge` / `Blocked` inline on **desktop
  only** (on phone they move into the meta list — see §3);
- line 2: the title, `text-xl` on phone rising to `text-2xl`;
- line 3 (desktop) / a sticky bottom-anchored row (phone): the actions.

Drop the `size-12` `Folder` icon tile. An issue is not a folder, and the tile
is 48px of nothing on a 390px screen.

### 3. On a phone there are no cards

This is the core of the phase. Below `sm`, `876-card` must not render on this
page. Follow the language `packages/projects-ui/src/mobile-list.tsx` already
established for lists (read its file header comment — it states the intent).

| Element | Phone (`< sm`) | Desktop (`>= sm`) |
| --- | --- | --- |
| Section surface | no card; full-bleed `-mx-4`, hairline `border-t` between sections | `876-card p-5 sm:p-6` |
| Section title | `text-muted-foreground text-xs font-medium uppercase tracking-wide` | existing `DetailCardSection` title |
| Meta facts | a two-column definition list, label muted left, value right, one row per fact, hairline separated | existing `DetailCardFacts` / `DetailCardFact` |
| Status + priority | first two rows of the meta list | badges in the header |
| Activity/events | collapsed behind a `<details>`-style disclosure, newest 5 shown | as today |
| Sub-issues | `MobileList` rows | as today |

Use the real Tailwind responsive prefixes; do not branch on a JS viewport hook
(it would be a hydration mismatch and this page is server-rendered).

### 4. Description readability

The description is the reason the page exists. On phone give it
`text-[0.9375rem] leading-7` full-bleed with `px-4`, no `max-w-3xl` clamp
(the clamp is a desktop measure and on a phone it does nothing but it is
currently applied unconditionally). Keep `Markdown` from `@876/ui/markdown`.

## Hard constraints

- **No function props across the RSC boundary.** `.claude/rules/production-render-errors.md`
  Rule 1 — this page is server-rendered and a function prop crashes the route in
  production with React #441. Pass hrefs and plain data.
- **`packages/projects-ui` is presentation only.** No data fetching, no session,
  no `fetch`, no client import. `.claude/rules/shared-product-ui.md`.
- Keep every existing Suspense boundary and its fallback. Do not hoist a
  streamed section above a boundary — `.claude/rules/data-loading.md`.
- Keep `notFound()` and the `AppError` banners exactly where they are.
- No `eslint-disable`, no `@ts-ignore`, no `as any`. Use `as unknown as T` only
  for a genuine library mismatch and say so in your report.
- Do not weaken a production signature to make a test easier.
- Do not touch: the issues list page, `issue-filter-bar.tsx`, `issues-data.tsx`,
  the board, the MCP server, or anything under `apps/projects-api`. Another
  delegate is in those files concurrently.
- Do not add a green button (`CLAUDE.md` → UI Design).
- No explanatory `<p>` under a heading (`CLAUDE.md` → UI Copy).

## Tests — floor is 14 new `it()` cases

In `packages/projects-ui/src/issue-detail.test.tsx` (extend, do not replace):

1. header renders identifier and title;
2. header renders the `actions` slot;
3. header omits the badge row's Blocked badge when `blocked` is false;
4. body renders markdown description;
5. body renders the empty-description state;
6. meta rail renders assignee label from `userLabels`;
7. meta rail renders `Not assigned` for a null assignee;
8. meta rail renders custom field values via the existing formatter;
9. meta rail renders `Not set` for an empty custom field;
10. sub-issues render as links to their identifiers;
11. parent issue renders when present, absent when null;
12. events render and the disclosure caps the initial list;
13. `IssueDetail` composition still renders header + body + rail together
    (the back-compat contract);
14. no element in the rendered tree carries a `lg:mr-` class.

Assert real shapes, exact strings, and both branches — `.claude/rules/testing.md`.
`toBeDefined()` alone is not a test.

## Verification you must run yourself, one at a time

```bash
pnpm --filter @876/projects-ui typecheck
pnpm --filter @876/projects-ui test
pnpm --filter @876/projects typecheck
```

Run them sequentially, never in parallel — the host has 7 GB and another
delegate is running.

## Report

Write `plans/sep/19-projects-mobile-and-agentic/reports/codex/2026-09-19-issue-detail-overhaul.md`
with: every file changed and why; the **counted** number of `it()` cases added;
the verification commands you ran and their real output; anything you could not
verify; decisions the brief did not settle; and anything you deliberately left
undone. A truthful "not done" beats a confident claim.
