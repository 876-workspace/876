# Brief — Phase 3b: give the remaining list pages the phone treatment

Branch: `feature/projects-mobile-and-agentic`. Do **not** create a branch. Do
**not** commit — the orchestrator commits.

## Why

Some 876 Projects lists render a phone-native list; the rest still render a
desktop `<Table>` that overflows horizontally on a 390px screen with columns cut
off mid-word. Observed on device: the Phases page shows "Ow…" where Owner should
be and wraps every phase name over three lines.

Your job is purely to extend the pattern that already exists to the lists that
never got it. **You are not designing anything.** Copy the reference exactly.

## The reference pattern — read this file first

`packages/projects-ui/src/project-list.tsx`. It is the model. The shape is:

```tsx
import {
  MobileList,
  MobileListCell,
  MobileListEmpty,
  avatarTone,
} from './mobile-list'

function ProjectCell({ project, projectsHref }: {...}) {
  return (
    <MobileListCell
      href={`${projectsHref}/${project.id}`}
      label={`View project ${project.name}`}
      avatar={project.key.slice(0, 2)}
      avatarClassName={avatarTone(project.key)}
      title={project.name}
      subtitle={project.description ?? `${project.key} · ${formatProjectStatus(project.status)}`}
      meta={project.targetDate ? formatDate(project.targetDate) : undefined}
    />
  )
}

export function ProjectsTable({ projects, projectsHref, ... }) {
  return (
    <>
      <MobileList>
        {projects.length === 0 ? (
          <MobileListEmpty>No projects yet</MobileListEmpty>
        ) : (
          projects.map((project) => <ProjectCell key={project.id} … />)
        )}
      </MobileList>
      <div className="876-card hidden w-full overflow-hidden sm:block">
        <Table>…the existing table, unchanged…</Table>
      </div>
    </>
  )
}
```

`MobileList` is already `sm:hidden` internally, so the only class you add to the
existing table wrapper is `hidden … sm:block`. **Do not modify the table
markup.** Desktop must render byte-identically to today.

## Files to change — exactly these four, in this order

| # | File | `avatar` seed | `title` | `subtitle` | `meta` |
| --- | --- | --- | --- | --- | --- |
| 1 | `packages/projects-ui/src/phase-list.tsx` | phase key or name, first 2 chars | phase name | `<project name> · <status>` | target/due date if present |
| 2 | `packages/projects-ui/src/time-entry-list.tsx` | issue identifier or user label, first 2 | issue title or description | user label · date | duration, right-aligned |
| 3 | `packages/projects-ui/src/timesheet-summary.tsx` | user label, first 2 | user label | period | total hours |
| 4 | `packages/projects-ui/src/automation/notification-list.tsx` | notification kind, first 2 | notification title | body/summary, truncated | relative time |

Read each file before changing it; use its **existing** prop names, formatters
and href construction. Do not invent a field — if a column's value comes from a
helper already in the file (a `formatX`, a badge component), reuse that helper
inside the cell. If a row has no sensible `meta`, omit the prop.

`avatarTone(seed)` gives a stable colour per seed — pass the same seed you used
for the avatar initials so a record keeps one colour.

## Also: the Phases filter form

`apps/projects/src/features/projects/components/phase-filter-bar.tsx` (53 lines)
is a `<form method="get">` with a Project select, a Status select and an
`Apply` button, stacked full-width on phone. It is the same defect the Issues
page has.

**Minimum change here, because another delegate owns the Issues equivalent and a
shared abstraction now would collide:** make the existing form render as a
single wrapping row rather than a stacked column, and drop the `Apply` button by
submitting on change.

- wrap the controls in `flex flex-wrap items-end gap-2` instead of the current
  stacked layout;
- give each `NativeSelect` an `onChange` that calls `form.requestSubmit()` —
  this requires the component to be `'use client'`; check whether it already is,
  and if converting it is more than a one-line directive **stop and report it
  instead of restructuring the file**;
- remove the `Apply` button once change-submit works. Keep `Clear` if present.

If `requestSubmit` turns out not to be viable without restructuring, leave the
Apply button, do the flex-row layout only, and say so in your report. A partial,
honest result is wanted here.

## Hard constraints

- **Desktop output must not change.** Any diff that alters a `<Table>`'s
  columns, order, or classes is wrong.
- `packages/projects-ui` is presentation only — no data fetching, no session, no
  `fetch`, no client-only imports in a server component
  (`.claude/rules/shared-product-ui.md`).
- No function props across the RSC boundary
  (`.claude/rules/production-render-errors.md` Rule 1).
- No `eslint-disable`, no `@ts-ignore`, no `as any`.
- No green. No explanatory `<p>` under a heading.
- **Do not touch** `packages/projects-ui/src/issue-detail.tsx`,
  `packages/projects-ui/src/issue-list.tsx`, anything under
  `apps/projects/src/app/(app)/issues/`, `issue-filter-bar.tsx`,
  `issues-data.tsx`, `packages/ui/src/components/resource-toolbar.tsx`, or
  `packages/ui/src/876.css`. Other delegates are in every one of those.

## Tests — floor is 8 new `it()` cases

Beside each component, in its existing `*.test.tsx` where one exists:

1. phase list renders a mobile cell per phase with the phase name as title;
2. phase list renders the empty state when the list is empty;
3. phase list still renders the desktop table rows;
4. time-entry list renders a cell per entry with its duration as meta;
5. time-entry list empty state;
6. timesheet summary renders a cell per row;
7. notification list renders a cell per notification;
8. `avatarTone` returns the same class for the same seed twice (stability).

Assert exact strings and both branches — `.claude/rules/testing.md`.
`toBeDefined()` alone is not a test.

## Verify yourself, one command at a time, never in parallel

```bash
pnpm --filter @876/projects-ui typecheck
pnpm --filter @876/projects-ui test
pnpm --filter @876/projects typecheck
```

## Report

`plans/sep/19-projects-mobile-and-agentic/reports/command-code/2026-09-19-list-mobile-sweep.md`
— every file changed and why, the **counted** number of `it()` cases added, the
real output of each command, what you could not verify, and anything you left
undone (especially the phase filter bar if `requestSubmit` was not viable).
