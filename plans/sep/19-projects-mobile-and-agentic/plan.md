# Implementation Plan: 876 Projects — mobile-native web UI + agentic workflow

- **Run ID:** `19-projects-mobile-and-agentic`
- **Integration branch:** `feature/projects-mobile-and-agentic` (cut from `main` @ `4ff66275c`)
- **Status:** IN_PROGRESS

## Overview

876 Projects has the functionality but not the finish. Two problems, one run:

1. **It does not read as a mobile app.** The list pages adopted the phone-first
   `MobileList` pattern (full-bleed rows, no card surface) but the **detail
   pages never did**, and the issues list grew a seven-control filter *card*
   that violates the platform's own `app-layout.md` §5 standard. On desktop the
   issue page is a stack of five unrelated cards held together by a
   `lg:mr-[33.333333%]` margin hack.
2. **It is not reachable by agents the way the user works.** The MCP server can
   read and write issues, but cannot carry an image, cannot hand an
   implementing agent a complete brief in one call, and has no home for a raw
   idea that is not yet an issue.

The user works from his phone, captures ideas in GPT web / Muse against the
Projects MCP, and later pulls the issue into Claude Code to implement. This run
makes both halves of that loop good.

## Decisions taken (user, 2026-09-19)

| Decision | Outcome |
| --- | --- |
| Native Expo app | **Parked.** `feature/projects-mobile` stays unmerged. The web app is already a complete PWA (manifest, service worker, maskable icons) and installs to the homescreen today — the effort goes into making the installed web app feel native. An `/install` page replaces the APK-at-`/download` idea. |
| Agentic scope | **All four:** agent brief bundle, images/attachments over MCP, idea inbox/capture, issue-ref deep links + copy affordances. |
| Projects data | **Read nothing.** No `issues_list`, no `workspace_get`, no `issue_get` — including BILL-100. The run works from the codebase alone. BILL-100 (plan images) is explicitly **not** implemented here. |

## Architectural scope

| Area | Paths |
| --- | --- |
| Shared product UI | `packages/projects-ui/src/issue-detail.tsx`, `mobile-list.tsx`, `issue-comments.tsx` |
| Web app | `apps/projects/src/app/(app)/issues/**`, `features/projects/components/issue-filter-bar.tsx`, `issues-data.tsx` |
| Design system | `packages/ui/src/components/{resource-toolbar,status-filter-heading}.tsx` (consume, do not fork) |
| MCP | `apps/projects-mcp/src/{tool-definitions,handlers,schemas,format}.ts` |
| API | `apps/projects-api/src/modules/**`, `apps/projects/src/app/api/**` |

Rules binding this run: `app-layout.md` (§5 status filter, §5a split view, §10a
form anatomy, §12 table hierarchy), `shared-product-ui.md` (panels are
presentation-only, hosts own data/authority), `app-structure.md`,
`data-loading.md`, `production-render-errors.md` (no function props across the
RSC boundary), `sdk-conventions.md`, `error-handling.md`.

## Key design decisions (orchestrator-owned — delegates implement, not redesign)

### D1 — The issue page is one record, not five cards

Today: `IssueVisibilityData` bar, then `IssueStatusSelect` bar, then an
`IssueDetail` that internally owns a `lg:grid-cols-3`, then four sibling blocks
each wrapped in `mt-6 lg:mr-[33.333333%]` to fake alignment with a grid they are
not inside. That margin hack is the tell: the layout belongs to the page, but
the grid belongs to the component.

**The page owns the grid.** `IssueDetail` becomes a presentation component that
renders a header and a *content column*, and the page composes the meta rail and
the streamed sections into the same grid. Status, visibility, follow and edit
collapse into **one** header action row.

### D2 — On a phone there are no cards

`876-card` is a desktop surface. Below `sm` the record is the page: full-bleed
sections separated by hairlines, a sticky compact header carrying
`PROJ · PROJ-123` and the title, section headings as small caps labels, and the
meta facts as a definition list rather than a boxed panel. This is the same
decision `MobileList` already made for lists — extend it, do not invent a second
phone language.

### D3 — The title *is* the filter

`app-layout.md` §5 is not optional and the issues list is in breach. The
seven-control filter card is replaced by:

- the page title rendered as `StatusFilterHeading` (workflow state) through
  `ResourceToolbar`'s `titleFilter` slot;
- one **Filters** button opening a popover (desktop) / bottom sheet (phone) for
  project, priority, assignee, label, order, group;
- **active filters as removable chips** under the toolbar — nothing is hidden;
- **no Apply button.** Changing a control navigates. `Apply filters` exists only
  because the form was a `<form>`; it is not a platform pattern.

### D4 — An agent brief is a first-class artifact

The primitive behind "copy it into Claude Code" is one deterministic markdown
rendering of an issue — description, every comment in order, attachments, links,
sub-issues, labels, status, type, phase. It is produced **once**, in
`apps/projects-mcp/src/format.ts`'s neighbourhood as a shared formatter, and
served two ways: an `issue_brief` MCP tool, and a copy button on the web page.
Two renderings of the same thing would drift.

### D5 — Capture is not an issue

An idea arrives without a project, a type, or a status. Forcing those fields at
capture time is why ideas do not get captured. A capture is a distinct
lightweight record with a title, a body, and optional labels, that is later
*promoted* into an issue. It is **not** a workflow state on the issue table.

## Phases

| # | Phase | Delegate | Files | Status |
| --- | --- | --- | --- | --- |
| 1 | Issue detail overhaul (mobile + desktop) | Codex `gpt-5.6-terra` medium | `packages/projects-ui/src/issue-detail.tsx`, `apps/projects/src/app/(app)/issues/[issueRef]/**` | [ ] |
| 2 | Issues/board filter — restore the platform standard | opencode muse-spark max | `features/projects/components/issue-filter-bar.tsx`, `issues-data.tsx`, `issues/(list)/page.tsx`, `board/page.tsx` | [ ] |
| 3 | Detail-page mobile pass + `/install` | Command Code DeepSeek | `project-detail.tsx`, `phase-detail.tsx`, `app/(app)/install/**` | [ ] |
| 4a | Agent brief bundle + copy affordances + `/i/[ref]` | Codex `gpt-5.6-terra` medium | `apps/projects-mcp/src/**`, `packages/projects-ui/src/issue-agent-actions.tsx` | [ ] |
| 4b | MCP attachments (read + write) | Codex `gpt-5.6-terra` medium | `apps/projects-mcp/src/**`, `packages/projects/src/**` | [ ] |
| 4c | Idea capture + `/inbox` triage | Codex `gpt-5.6-terra` medium | `apps/projects-api/**`, `apps/projects-mcp/**`, `apps/projects/src/app/(app)/inbox/**` | [ ] |

Phases 1 and 2 touch disjoint file sets and run concurrently (two local
delegates maximum — 7 GB host). 4a lands before 4b/4c, which build on its
formatter.

## Verification (orchestrator, foreground, always)

```bash
pnpm --filter @876/projects-ui typecheck && pnpm --filter @876/projects-ui test
pnpm --filter @876/projects typecheck && pnpm --filter @876/projects test
pnpm --filter @876/projects-mcp typecheck && pnpm --filter @876/projects-mcp test
pnpm --filter @876/projects-api typecheck && pnpm --filter @876/projects-api test
node scripts/check-app-structure.mjs
pnpm check:rsc-boundaries
grep -rn "eslint-disable\|as any" <paths the delegate touched>
```

CI is ignored (Actions minutes exhausted); local verification is the merge gate.

## Handoff state

Nothing dispatched yet at the time of writing. Next: write Phase 1 and Phase 2
briefs, dispatch both, monitor.

## D6 — The toolbar is a desktop object; a phone needs an app bar

Observed on device, 2026-09-19 (projects list, Android Chrome). The list body
is correct — `MobileList` delivers avatar rows, inset hairlines, chevrons, a tab
bar and a FAB, and it reads like a real app. **The top does not.** Three faults:

1. **Two primary actions.** A full-width-ish blue `+ Add` pill sits in the
   toolbar while `FloatingGlobalAdd` renders a blue FAB for the same action a
   thumb-reach away. One of them is redundant, and it is the toolbar one — the
   FAB is the native idiom and it is already there.
2. **The `···` is a boxed white card**, not an icon action. On a phone it reads
   as a second button of equal weight to Add rather than an overflow menu.
3. **No app-bar treatment.** The title sits in page flow at desktop size with
   desktop padding, so it scrolls away like body copy instead of behaving like
   navigation chrome.

Decision: below `sm`, `ResourceToolbar` renders as an **app bar** — the title at
`text-[1.375rem]` on one line with the filter chevron, overflow as a bare icon
button, and **the primary action suppressed when the host already renders a
FAB**. Desktop is untouched.

Scope guard: `ResourceToolbar` is shared by Console, Couriers, Billing and
Invoice. The phone treatment is therefore **opt-in via props** — a
`mobilePrimary?: 'button' | 'fab-owns-it'` (default `'button'`, preserving every
other app's behaviour) plus the existing `primaryIconOnly`. Projects passes
`fab-owns-it`. No other app changes in this run.

## Phase 3 (revised)

| # | Phase | Delegate | Files |
| --- | --- | --- | --- |
| 3a | Mobile app-bar treatment for `ResourceToolbar` + projects opt-in | Command Code DeepSeek | `packages/ui/src/components/resource-toolbar.tsx`, projects list pages |
| 3b | Detail-page mobile pass (project, phase) + `/install` page | Command Code DeepSeek | `packages/projects-ui/src/{project-detail,phase-detail}.tsx`, `app/(app)/install/**` |
