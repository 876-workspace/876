# Brief: iOS-style mobile views for Projects main pages

## Goal
On phones (below Tailwind `sm`), the 876 Projects app should feel like a native
iPhone app. The shell already does this (bottom tab bar, "More" bottom sheet,
avatar top-right). The Projects list page is the reference. Apply the same
design to the remaining main pages: **Dashboard (`/`), Issues, Board, Labels**.
Do **not** touch Settings, or any create/edit/detail page.

Desktop (`sm` and up) must render exactly as today.

## Read budget
Read only these, then start writing:
1. `packages/projects-ui/src/project-list.tsx` — the REFERENCE (`ProjectCell` + the `sm:hidden` `<ul>` in `ProjectsTable`).
2. `packages/projects-ui/src/issue-list.tsx` (+ its test)
3. `packages/projects-ui/src/labels-list.tsx` (+ its test)
4. `packages/projects-ui/src/issue-board.tsx` (+ its tests)
5. `apps/projects/src/app/(app)/page.tsx` and whatever dashboard components it imports
6. `apps/projects/src/app/(app)/{issues/(list),board,labels}/page.tsx`

## The design (copy from the reference)
- **Two renders, CSS-switched:** desktop table in `hidden sm:block`, mobile
  list in `sm:hidden`. No JS media queries, no `useMediaQuery`.
- **Inset grouped list:** one `<ul className="876-card w-full overflow-hidden rounded-xl sm:hidden [&>li+li_[data-cell-content]]:border-t">`.
- **Cell:** whole row is one `Link` (`min-h-14`, `pl-4`, `active:bg-muted/80`),
  inner `data-cell-content` div holds padding and the inset separator.
  Line 1: title (`text-[0.9375rem]`) + right-aligned muted meta (date/count, `tabular-nums`).
  Line 2: muted key/identifier + badges. Trailing muted `ChevronRight` (`@876/ui/icons`).
  `aria-label` matches the desktop row link label.
- **Empty state:** a single muted centered `<li>` inside the group.
- This replaces `ResponsiveList` usage in `issue-list.tsx` and `labels-list.tsx`
  (same as done in `project-list.tsx`). Do not edit `packages/ui/src/components/responsive-list.tsx`.

## Page-specific
- **Issues:** cell = title, identifier (e.g. `PRJ-12`) + status + priority badges; meta = updated/due date if present.
- **Labels:** cell = color dot as leading element, name, issue count/meta if present. Labels has no detail route — if rows aren't links, render a non-link cell (no chevron).
- **Board:** kanban columns don't fit a phone. Below `sm`, render a horizontally
  swipeable column strip: `flex snap-x snap-mandatory overflow-x-auto`, each
  column `w-[85vw] shrink-0 snap-center`, cards stacked vertically inside. Keep
  drag-and-drop desktop-only if it conflicts with touch scrolling.
- **Dashboard:** stack cards single-column on mobile, use the grouped-list
  style for any recent-items lists, and make the big numbers large (iOS widget feel). No structural rewrite.
- Page toolbars stay as-is (title reads as the iOS large title).

## Rules
- Follow `.claude/rules/app-layout.md` table hierarchy (one tier-1, status as `<Badge>`), no green buttons, no new shared abstractions, no `eslint-disable`/`as any`/`@ts-ignore`, no server actions, no function props from server to client components.
- Do not weaken production code for tests. Do not commit.
- Tests: both views render in jsdom, so duplicated text/links are expected —
  update assertions to `getAllBy…` with exact lengths (see `project-list.test.tsx`). Add at least one test per changed component asserting the mobile cell's link href and label.

## Verification (run one at a time)
```
cd packages/projects-ui && npx tsc --noEmit -p . && npx vitest run
cd apps/projects && npx tsc --noEmit -p . && npx vitest run
node scripts/check-app-structure.mjs
pnpm check:rsc-boundaries
```

## Report
Write `plans/2026-09-15-projects-ios-mobile/reports/codex/2026-09-15-ios-mobile-main-pages.md`:
files changed + why, counted tests added, verification output, anything not done.
