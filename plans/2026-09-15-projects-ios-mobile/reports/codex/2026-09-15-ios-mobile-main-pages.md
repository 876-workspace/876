# iOS mobile views for Projects main pages — Codex report

Date: 2026-09-15. Scope: Dashboard (`/`), Issues, Board, Labels. Desktop (`sm` and up) unchanged.

## Files changed (mine)

- `packages/projects-ui/src/issue-list.tsx` — Removed `ResponsiveList`/`createIssueRow`/`relativeTime`/`IssuePriorityDot`. Added a local `IssueCell` copied from the `ProjectCell` reference (whole-row `Link`, `min-h-14`, `pl-4`, `active:bg-muted/80`, inner `data-cell-content`, line 1 title `text-[0.9375rem]` + right muted date `tabular-nums`, line 2 identifier + `IssueStatusBadge` + `IssuePriorityBadge`, trailing muted `ChevronRight`, `aria-label="View issue <identifier>"` matching the desktop row link). `IssuesTable` now renders `ul.876-card … sm:hidden` + `div.876-card hidden sm:block` (desktop table byte-identical). Mobile meta is `dueDate ?? updatedAt`; empty state is a single centered muted `li`.
- `packages/projects-ui/src/labels-list.tsx` — Same CSS-switched replacement. Labels has no detail route, so the mobile cell is a non-link `li` (no chevron, no `Link`): leading color dot, line 1 name + muted mono color hex, line 2 description when present. Desktop table unchanged.
- `packages/projects-ui/src/issue-board.tsx` — Two class strings only. Strip: `flex snap-x snap-mandatory … overflow-x-auto … sm:grid sm:snap-none …`. Columns: `w-[85vw] … shrink-0 snap-center … sm:w-auto sm:min-w-0`. Cards already stack vertically; no drag-and-drop exists, so nothing to gate. Desktop grid unchanged.
- `packages/projects-ui/src/issue-list.test.tsx` (+3) — Duplicated-copy assertions switched to `getAllBy…` with exact lengths (identifiers/titles length 2, `View issue ALP-12` links length 2 with hrefs). New: mobile cell link href + label + content, mobile status/priority badges, empty state in both forms.
- `packages/projects-ui/src/labels-list.test.tsx` (+2 net) — Replaced `[data-slot="list-row"]` selectors with mobile-`ul` queries; hex values now `getAllByText` length 2. New: mobile rows lead with the color dot; mobile cell shows name/color/description with no link.
- `packages/projects-ui/src/issue-board.advanced.test.tsx` (+4) — New `IssueBoard mobile strip` block: strip snap/overflow classes, column `w-[85vw]`/`snap-center`/`shrink-0`, identifier-link href, title-link href.

9 tests added in total (3 issues + 2 labels + 4 board). No page, toolbar, Settings, or create/edit/detail file touched. `packages/ui/src/components/responsive-list.tsx` untouched.

## Verification (each run separately, in order)

- `cd packages/projects-ui && npx tsc --noEmit -p .` — clean (also re-ran after the Prettier pass — clean).
- `cd packages/projects-ui && npx vitest run` — 10 files, 134 tests, all pass (final run after formatting).
- `cd apps/projects && npx tsc --noEmit -p .` — clean.
- `cd apps/projects && npx vitest run` — 30 files, 243 tests, all pass.
- `node scripts/check-app-structure.mjs` — `app-structure: OK (console, billing, couriers, 876, enterprise, invoice, crm, projects, commerce)`.
- `pnpm check:rsc-boundaries` — `RSC boundaries OK (10 apps)`.
- Extra: `eslint` on the six touched files — clean; `prettier --check` — clean after one `--write` (class-order only).

## Not done / notes

- Dashboard: no change by me. The working tree already contains a concurrent, uncommitted dashboard implementation (`apps/projects/src/app/(app)/page.tsx` + `app/(app)/_components/home-data.tsx`, with `Stat`/`Section`/`Cell`/`EmptyCell`) that already meets the brief — single-column stack below `lg`, grouped-list recent items with `data-cell-content` inset separators and chevrons, `text-3xl tabular-nums` stat numbers. I left it untouched to avoid clobbering in-flight work.
- Pre-existing dirty tree: `apps/projects` shell files, `project-list.tsx`, `responsive-list.tsx`, and the dashboard files above were already modified by other work before/during this task; my diff is only the six `projects-ui` files listed above. Nothing committed, per instructions.
- Rules observed: one tier-1 cell per row, status always as `<Badge>`, Add buttons stay `info`/blue, no new shared abstractions (cells are file-local like `ProjectCell`), no `eslint-disable`/`as any`/`@ts-ignore`, no server actions, no function props across the RSC boundary.
