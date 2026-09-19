# Brief — Phase 3c: rebuild the project detail page for phone

Branch: `feature/projects-mobile-and-agentic`. Do **not** create a branch. Do
**not** commit — the orchestrator commits.

## Read these 4 files, then start

1. `packages/projects-ui/src/project-detail.tsx` (188 lines — the main target)
2. `apps/projects/src/features/projects/components/work-breakdown.tsx` (the
   second target — read from line 140 down, the render)
3. `packages/projects-ui/src/project-list.tsx` (the **reference** for the phone
   language — read `ProjectCell` and the `MobileList` block)
4. `packages/projects-ui/src/mobile-list.tsx` (the primitives)

## What is wrong, observed on a real device

The page is a stack of white cards, and inside them everything is laid out for a
1400px screen:

1. **Three loose outline buttons** (`Follow`, `Save as template`, `Clone`) sit in
   page flow above all content, wrapping onto two rows. They push the actual
   project below the fold.
2. **A card with a generic grey folder icon tile** — 56px of nothing, on a 390px
   screen, next to the one piece of information that matters (the name).
3. **Label and value stack vertically.** "Project lead" on one line, "No lead
   assigned" on the next, at full body weight. Seven facts become fourteen
   lines, and the loudest words on screen are "No lead assigned", "No customer
   linked", "No start date", "No target date".
4. **Work overview** is a 2-column grid of label-above-number inside another
   card — five numbers occupying most of a screen.
5. **Work breakdown duplicates the Work list directly above it.** When a project
   has no task lists, every issue falls into an "Unlisted" group and renders as
   a bare, unlinked text line wrapping over three lines — while the same issues
   already render as proper tappable rows immediately above.

## The design, which you implement rather than reinterpret

The philosophy is Apple's, and it reduces to three rules: **one loud thing per
screen, values align to the right, and nothing is repeated.**

### A. Actions

- `Follow` stays visible — it is the one action with state. Render it as a
  compact pill in the header row, right-aligned, beside the project name.
- `Save as template` and `Clone` move into the page's `···` overflow menu on
  phone. On desktop they stay exactly as they are.
- Do **not** render three stacked outline buttons above the content at any
  width below `sm`.

### B. Header — no card on phone

```
876 Chat                                   [Follow]
CHAT · Active · On track
Dev plans, real-time messaging architecture, …
```

- project name at `876-page-title-lg` (the phone large-title class; if it does
  not exist yet because a parallel phase has not landed, use
  `text-[2rem] leading-tight font-bold tracking-tight` and note it in your
  report);
- the key, status and health on one muted line beneath it — **the key is not a
  badge**, it is metadata;
- the description as muted body text, `line-clamp-3` with no card;
- **delete the folder icon tile on phone entirely** (`hidden sm:flex`).

### C. Facts — label left, value right, one row each

This is the single biggest win. Below `sm`, the Overview section becomes an
inset grouped list in the iOS Settings idiom:

```
Project lead                                    —
Members                                         0
Customer                                        —
Start date                                      —
Target date                                     —
Last updated                          Sep 4, 2026
```

- one row per fact, `flex items-center justify-between gap-4 py-3`;
- label `text-muted-foreground text-[0.9375rem]`, value
  `text-[0.9375rem] font-medium text-right`;
- hairline `border-t` between rows, none above the first;
- **an absent value is an em dash `—`, not a sentence.** "No lead assigned",
  "No customer linked", "No start date", "No target date" all become `—`. The
  label already says what is missing; repeating it in the value is what makes
  the screen read as a list of complaints.
- desktop keeps the existing `DetailCardSection` / `DetailCardFacts` rendering
  unchanged.

Put this row primitive in `packages/projects-ui/src/mobile-list.tsx` beside the
existing exports — it is the same phone language, and phase detail will want it
next:

```tsx
export function MobileFactList({ children }: { children: ReactNode })
export function MobileFact({ label, value }: { label: string; value: ReactNode })
```

`MobileFactList` is `sm:hidden`, exactly as `MobileList` is.

### D. Work overview — one compact row

Five numbers do not need a card and a grid. On phone:

```
13 items   ·   13 open   ·   0 in progress   ·   0 done   ·   0 overdue
```

A single horizontally-scrollable row of compact stat pairs (number above a muted
micro-label), `flex gap-5 overflow-x-auto`, no card, no section heading. Keep
`tabular-nums`. Desktop unchanged.

### E. Work breakdown — stop duplicating the Work list

In `work-breakdown.tsx`:

1. **When every issue is unlisted** — i.e. there are no task lists with content
   — the component renders **nothing** on phone. Those issues already appear as
   tappable rows in the Work list above; printing them again as unlinked text is
   pure duplication. Desktop keeps today's behaviour.
2. When there *is* real task-list structure, each issue row becomes a **link**
   to the issue, rendered with `MobileListCell` (or at minimum a `<Link>` with
   `CHAT-1` as a mono prefix and the title `line-clamp-2`) — never a bare
   wrapping text line.
3. `<h2 className="876-page-title">Work breakdown</h2>` inside a card is a page
   title used as a section title. Use the section heading treatment, not the
   page-title class.

## Hard constraints

- **Desktop must not regress.** Every change is either phone-only (`sm:hidden` /
  `hidden sm:block`) or a strict improvement that leaves the `sm`-and-up render
  identical. Diff the desktop branch mentally before you finish.
- Do not branch on a JS viewport hook — these trees are server-rendered and that
  is a hydration mismatch. Tailwind responsive classes only.
- `packages/projects-ui` is presentation only: no fetching, no session, no
  `fetch` (`.claude/rules/shared-product-ui.md`).
- No function props across the RSC boundary
  (`.claude/rules/production-render-errors.md` Rule 1) — `work-breakdown.tsx` is
  already a client component, which is fine; do not push a function *into* a
  server component.
- No `eslint-disable`, no `@ts-ignore`, no `as any`.
- No green buttons. No explanatory `<p>` under a heading.
- **Do not touch** — other delegates own these right now:
  `packages/projects-ui/src/issue-detail.tsx`,
  `packages/projects-ui/src/issue-list.tsx`,
  `packages/projects-ui/src/phase-list.tsx`,
  `packages/projects-ui/src/time-entry-list.tsx`,
  `packages/projects-ui/src/timesheet-summary.tsx`,
  anything under `apps/projects/src/app/(app)/issues/`,
  `issue-filter-bar.tsx`, `issues-data.tsx`, `board/page.tsx`,
  `packages/ui/src/components/resource-toolbar.tsx`, `packages/ui/src/876.css`.

  You **do** own `mobile-list.tsx` for the two additions in §C — make them
  additive only; do not modify `MobileList`, `MobileListCell`,
  `MobileListEmpty` or `avatarTone`.

## Tests — floor is 14 new `it()` cases

`packages/projects-ui/src/project-detail.test.tsx` and
`mobile-list.test.tsx` (create the latter if absent):

1. renders the project name and key;
2. renders status and health on the metadata line;
3. the folder icon tile carries the desktop-only class;
4. `MobileFact` renders label and value;
5. `MobileFact` renders `—` for a null value;
6. `MobileFact` renders `—` for an empty-string value;
7. `MobileFactList` carries `sm:hidden`;
8. the fact list renders one row per fact;
9. `Follow` renders in the header;
10. `Save as template` and `Clone` are not in the phone action row;
11. work-overview stats render with `tabular-nums`;
12. work breakdown renders nothing on phone when all issues are unlisted;
13. work breakdown renders task-list groups when they have content;
14. a work-breakdown issue row is a link to that issue.

Assert exact strings and classes, and both branches of every conditional.
`toBeDefined()` alone is not a test (`.claude/rules/testing.md`).

## Verify yourself, one command at a time, never in parallel

```bash
pnpm --filter @876/projects-ui typecheck
pnpm --filter @876/projects-ui test
pnpm --filter @876/projects typecheck
pnpm --filter @876/projects test
```

## Report

`plans/sep/19-projects-mobile-and-agentic/reports/codex/2026-09-19-project-detail-mobile.md`
— files changed and why, the **counted** number of `it()` cases added, real
command output, whether `876-page-title-lg` existed when you ran, what you could
not verify, and anything left undone.
