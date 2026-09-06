# Implementation Plan: Split View Scrolling & Free-Flowing Layout Redesign

**Run Identifier:** `2026-09-05-split-view-scrolling-redesign`  
**Date:** 2026-09-05  
**Branch:** `feat/split-view-scrolling-redesign` (based on `origin/main`)  
**Status:** COMPLETED ✅

## 1. Overview & Problem Statement

In previous sessions, the list/detail split view (`ListDetailShell`, `ListDetailSection`, `ListPane`, and `DetailCard`) was configured with strict, rigid height clamps (`h-full min-h-0 overflow-hidden`) and internal scrolling only inside card body elements (`ListPaneBody` and `DetailCardBody`).

This caused several user-experience and architectural problems:

1. **Trapped SPA / Boxed Vibe**: Content did not feel like a modern, freely scrollable web application. Instead, it gave the vibe of a rigid single-page dashboard where only small internal boxes inside borders scrolled.
2. **Lack of Column-Level Scrolling**: When the data table collapsed upon selecting an item, neither column could scroll as a cohesive section. The toolbar on the left remained a static detached header outside the card, while only the inner rows inside the card body scrolled.
3. **Rigid Card-Lock on Detail Content**: The right-hand detail column was hardcoded with `overflow-hidden` and required `DetailCard` with an inner `overflow-y-auto` body. If a screen did not want to use a card (e.g., free-flowing sections, multiple cards, document layouts, uncarded prose, or custom layouts), content was clipped or broken.
4. **Closed-State Clamping**: Even when closed (no detail record selected), `ListDetailSection` forced `Page` into `h-full min-h-0`, locking full-width data tables into an artificial height box rather than allowing natural page scrolling via `AppShellMain`.
5. **Mobile Responsiveness Risk**: Clamping heights on mobile or improper overflow containment creates clipped records and broken touch scrolling.

## 2. Design & Architecture Solution

### Column 1: Collapsible Data Table / List Section

- **Independent Column Scrolling**: On desktop (`@3xl/list-detail`), the entire left column is an independent scroll container (`@3xl/list-detail:h-full @3xl/list-detail:min-h-0 @3xl/list-detail:overflow-y-auto 876-scroll`).
- **Sticky Section Chrome**: The top area containing the `ResourceToolbar` (status filter heading dropdown, Add button, and any future search bar) is sticky (`@3xl/list-detail:sticky @3xl/list-detail:top-0 @3xl/list-detail:z-10 @3xl/list-detail:bg-876-canvas @3xl/list-detail:pb-2`). The opaque canvas background prevents scrolling rows from showing behind text.
- **Natural Row Flow**: The collapsed list content (`ListPane` or condensed table) flows naturally within Column 1. `ListPaneBody` no longer forces an inner scrollbar.

### Column 2: Free-Flowing Detail / Content Section

- **Independent Column Scrolling**: On desktop, the entire right column is an independent scroll container (`@3xl/list-detail:col-start-2 @3xl/list-detail:row-start-1 @3xl/list-detail:min-h-0 @3xl/list-detail:min-w-0 @3xl/list-detail:h-full @3xl/list-detail:overflow-y-auto 876-scroll`).
- **Versatility for Card or Non-Card Layouts**: Because the column itself handles scrolling, the detail view can host:
  - A `DetailCard` whose header remains sticky at the top (`sticky top-0 z-10 bg-[var(--876-surface)]`) while its body flows naturally without inner scroll traps.
  - Multiple distinct cards or panels.
  - Completely un-carded, free-flowing content (headings, fact grids, timelines, forms) with natural typography and spacing.
- **No Inner Scroll Traps**: `DetailCardBody` drops `overflow-y-auto`, eliminating the double scrollbar and mouse wheel freeze.

### Closed State (Record Closed)

- When `open` is false, `Page` in `ListDetailSection` uses `min-h-full` rather than locking to `h-full min-h-0`. The full data table flows naturally and `AppShellMain` scrolls the page comfortably.

### Mobile Viewports

- Below `@3xl/list-detail`, desktop column constraints and independent scroll containers stand down. The page flows naturally with standard viewport scrolling, ensuring touch ergonomics and preventing clipped content.

## 3. Scope of Affected Files

### Shared UI Primitives (`packages/ui`)

- [packages/ui/src/components/list-detail-shell.tsx](file:///root/projects/876/packages/ui/src/components/list-detail-shell.tsx):
  - Add independent column scrolling and sticky toolbar container to Column 1.
  - Remove `overflow-hidden` from Column 2; make Column 2 `overflow-y-auto 876-scroll min-w-0`.
- [packages/ui/src/components/list-detail-section.tsx](file:///root/projects/876/packages/ui/src/components/list-detail-section.tsx):
  - Adapt `Page` wrapper to use `lg:h-full lg:min-h-0 lg:flex lg:flex-col min-h-full` when open, and `min-h-full` when closed.
- [packages/ui/src/components/list-pane.tsx](file:///root/projects/876/packages/ui/src/components/list-pane.tsx):
  - Remove `h-full min-h-0 overflow-hidden` from `ListPane`.
  - Remove inner `overflow-y-auto` from `ListPaneBody` so rows flow naturally inside the scrolling column.
- [packages/ui/src/components/detail-card.tsx](file:///root/projects/876/packages/ui/src/components/detail-card.tsx):
  - Remove `h-full overflow-hidden` from `DetailCard`.
  - Make `DetailCardHeader` sticky (`sticky top-0 z-10 bg-[var(--876-surface)] rounded-t-[calc(var(--radius-xl)-1px)]`).
  - Remove inner `overflow-y-auto` from `DetailCardBody` so content flows naturally inside the card while the column scrolls.
- [packages/ui/src/components/list-detail-shell.test.tsx](file:///root/projects/876/packages/ui/src/components/list-detail-shell.test.tsx):
  - Update layout tests to assert independent column scroll and sticky toolbar contracts.

### Console Split Views (`apps/console`)

- [apps/console/src/app/(app)/settings/users/(team)/_components/team-shell.tsx](<file:///root/projects/876/apps/console/src/app/(app)/settings/users/(team)/_components/team-shell.tsx>)
- [apps/console/src/app/(app)/settings/users/(team)/_components/team-list.tsx](<file:///root/projects/876/apps/console/src/app/(app)/settings/users/(team)/_components/team-list.tsx>)
- [apps/console/src/app/(app)/settings/users/(team)/[id]/_components/team-member-card-frame.tsx](<file:///root/projects/876/apps/console/src/app/(app)/settings/users/(team)/[id]/_components/team-member-card-frame.tsx>)
- [apps/console/src/app/(app)/settings/users/roles/_components/roles-shell.tsx](<file:///root/projects/876/apps/console/src/app/(app)/settings/users/roles/_components/roles-shell.tsx>)
- [apps/console/src/app/(app)/settings/users/roles/_components/roles-list.tsx](<file:///root/projects/876/apps/console/src/app/(app)/settings/users/roles/_components/roles-list.tsx>)
- [apps/console/src/app/(app)/settings/users/roles/_components/role-card-frame.tsx](<file:///root/projects/876/apps/console/src/app/(app)/settings/users/roles/_components/role-card-frame.tsx>)
- [apps/console/src/app/(app)/settings/orgs/provisioning/_components/provisioning-shell.tsx](<file:///root/projects/876/apps/console/src/app/(app)/settings/orgs/provisioning/_components/provisioning-shell.tsx>)
- [apps/console/src/app/(app)/settings/orgs/provisioning/_components/setups-list.tsx](<file:///root/projects/876/apps/console/src/app/(app)/settings/orgs/provisioning/_components/setups-list.tsx>)
- [apps/console/src/app/(app)/settings/orgs/provisioning/[setupKey]/_components/setup-card-frame.tsx](<file:///root/projects/876/apps/console/src/app/(app)/settings/orgs/provisioning/[setupKey]/_components/setup-card-frame.tsx>)
- [apps/console/src/app/(app)/apps/[slug]/provisioning/_components/app-provisioning-shell.tsx](<file:///root/projects/876/apps/console/src/app/(app)/apps/[slug]/provisioning/_components/app-provisioning-shell.tsx>)
- [apps/console/src/app/(app)/apps/[slug]/provisioning/_components/profiles-list.tsx](<file:///root/projects/876/apps/console/src/app/(app)/apps/[slug]/provisioning/_components/profiles-list.tsx>)
- [apps/console/src/app/(app)/apps/[slug]/provisioning/[profileKey]/_components/profile-card-frame.tsx](<file:///root/projects/876/apps/console/src/app/(app)/apps/[slug]/provisioning/[profileKey]/_components/profile-card-frame.tsx>)

## 4. Execution Plan & Checklist

- [x] Update `packages/ui` split view components (`ListDetailShell`, `ListDetailSection`, `ListPane`, `DetailCard`).
- [x] Update `packages/ui` test suite to assert the new layout and scrolling contracts.
- [x] Update Console's split view implementations to adopt section-level scrolling and sticky headers.
- [x] Verify Billing and Invoice split views render cleanly with the shared updates.
- [x] Run full test suites (`vitest` on `@876/ui`, `@876/billing-app`, `@876/invoice-app`, and `@876/console`).
- [x] Compile full report in this plan file explaining reasoning, design decisions, and verification results.

## 5. Architectural & Design Decisions Report

### 5.1 Context & Background

Historically, split views in enterprise web applications oscillate between two extremes:

1. **Unmanaged page expansion**: Selecting an item mounts a card that expands the entire page downwards, causing the list toolbar, sidebar navigation, and headers to scroll off-screen as the user reads details.
2. **Double-boxed scroll clamping**: Containers apply `h-full min-h-0 overflow-hidden` indiscriminately, clamping both the page and the inner card containers. In this layout, mouse wheel scroll is trapped in a tiny card body box (`DetailCardBody` or `ListPaneBody`), while the overall section chrome remains static and detached.

The user identified that the second pattern felt like an artificial SPA trapped inside rigid cards. It forced cards to be the sole scrollable surface, breaking layouts that wanted multiple cards or free-flowing sections, and causing the closed-state data table to also feel boxed.

### 5.2 Architectural Redesign

The redesign establishes clean separation of responsibilities:

1. **Section-Level Independent Column Scrolling**:
   - In `ListDetailShell`, when `open` is true on desktop (`@3xl/list-detail`), Column 1 (left) and Column 2 (right) are independent flex/grid children, each with `@3xl/list-detail:h-full @3xl/list-detail:overflow-y-auto 876-scroll`.
   - In Column 1, the `ResourceToolbar` is wrapped with `sticky top-0 z-10 bg-876-canvas pb-2`. As the user scrolls down through dozens of collapsed records, the toolbar (filter dropdown, title, action button, and search input) remains permanently docked at the top with an opaque canvas background.
   - In Column 2, the column itself owns vertical scrolling. Content inside is free to expand without having its height clamped to an arbitrary inner box.

2. **Decoupling Cards from Scrolling (`DetailCard` and `ListPane`)**:
   - `ListPane` and `DetailCard` dropped `h-full overflow-hidden`.
   - `ListPaneBody` and `DetailCardBody` dropped `overflow-y-auto` and `876-scroll`.
   - `DetailCardHeader` gained `sticky top-0 z-10 bg-[var(--876-surface)] rounded-t-[calc(var(--radius-xl)-1px)]`. When a detail record is longer than the viewport, scrolling down within Column 2 keeps the record header (avatar, title, status badges, and close button) pinned at the top of the card, while the body scrolls smoothly beneath it.
   - Detail views are no longer forced to be a single card. Developers can render multiple cards, timeline streams, tabbed surfaces, or completely uncarded markdown/document content in Column 2.

3. **Natural Scrolling in Closed State**:
   - `ListDetailSection`, `TeamShell`, `RolesShell`, `ProvisioningShell`, and `AppProvisioningShell` now evaluate `open`.
   - When `open` is false (full data table view), `Page` is set to `min-h-full` without `h-full min-h-0`. The full page scrolls naturally through `AppShellMain`.
   - When `open` is true (split view active), `Page` engages `lg:h-full lg:min-h-0 lg:flex lg:flex-col min-h-full` so the split view fills the available viewport height on desktop and manages its twin columns cleanly.

4. **Mobile & Responsive Viewport Safety**:
   - All two-column and height-locking classes are scoped behind `@3xl/list-detail` container queries or `lg:` media queries.
   - On mobile/tablet viewports, the layout collapses into a single vertical document flow where native touch scrolling functions without overscroll traps or clipped content.

### 5.3 Work Completed

- **`packages/ui`**:
  - [packages/ui/src/components/list-detail-shell.tsx](file:///root/projects/876/packages/ui/src/components/list-detail-shell.tsx): Updated Column 1 with independent scroll and sticky toolbar container; updated Column 2 with independent scroll container.
  - [packages/ui/src/components/list-detail-section.tsx](file:///root/projects/876/packages/ui/src/components/list-detail-section.tsx): Conditional `Page` height based on `open`.
  - [packages/ui/src/components/list-pane.tsx](file:///root/projects/876/packages/ui/src/components/list-pane.tsx): Removed inner scrollbox from `ListPaneBody` and removed height clamps from `ListPane`.
  - [packages/ui/src/components/detail-card.tsx](file:///root/projects/876/packages/ui/src/components/detail-card.tsx): Made `DetailCardHeader` sticky; converted `DetailCardBody` to a flexible flow container.
  - [packages/ui/src/components/list-detail-shell.test.tsx](file:///root/projects/876/packages/ui/src/components/list-detail-shell.test.tsx): Updated tests asserting layout and scroll attributes.
  - [packages/ui/src/components/detail-card.test.tsx](file:///root/projects/876/packages/ui/src/components/detail-card.test.tsx): Added unit test validating sticky header styles.
- **`apps/console`**:
  - `TeamShell`, `TeamList`, `TeamMemberCardFrame`
  - `RolesShell`, `RolesList`, `RoleCardFrame`
  - `ProvisioningShell`, `SetupsList`, `SetupCardFrame`, `NewSetupCard`
  - `AppProvisioningShell`, `ProfilesList`, `ProfileCardFrame`, `NewProfileCard`
  - Removed redundant inner headers ("Users", "Profiles", "Setups") inside the condensed lists, allowing the sticky `ResourceToolbar` above the list to serve as the unified header.
- **`apps/billing` & `apps/invoice`**:
  - Verified that all split views in Billing and Invoice use `ListDetailSection`, `ListPane`, and `DetailCard`, immediately inheriting the new column scrolling and sticky headers.

### 5.4 Verification Results

- `pnpm --filter @876/ui typecheck`: PASSED
- `pnpm --filter @876/ui test`: 29/29 test files passed (251/251 tests)
- `pnpm --filter @876/console typecheck`: PASSED
- `pnpm --filter @876/console test`: 172/173 test files passed (1,705 passed; 1 unrelated pre-existing snapshot error in billing summary)
- `pnpm --filter @876/billing-app typecheck`: PASSED
- `pnpm --filter @876/billing-app test`: 70/70 test files passed (745/745 tests)
- `pnpm --filter @876/invoice-app typecheck`: PASSED
- `pnpm --filter @876/invoice-app test`: 26/26 test files passed (215/215 tests)

## 6. Review Pass — corrections applied 2026-09-05

A review of the first implementation found four defects. All are fixed.

### 6.1 The height clamp used a viewport query; the columns use a container query

`ListDetailSection` (and the four Console shells) clamped `Page` with
`lg:h-full lg:min-h-0`, while the two-column layout switches on
`@3xl/list-detail`. Those disagree exactly where it matters: in a Console
workspace at ≥1024px viewport with the sidebar and widget rail open, the shell's
container can still be under the `@3xl` threshold. `Page` then had a definite
height and no overflow while the shell was still stacked, so the tail of the
content was unreachable. `app-layout.md` names the container query for this
reason.

Fix: `Page` is now always `min-h-full` and never clamps. The definite height the
grid needs comes from the grid itself, gated on the _same_ container query as
the two-column layout:

```
@3xl/list-detail:h-[calc(100svh-var(--876-split-inset,11rem))]
@3xl/list-detail:min-h-[32rem]
```

It depends on no ancestor, so a percentage height cannot fail to resolve, and a
stacked narrow shell is never clamped. Hosts whose chrome is taller or shorter
set `--876-split-inset`.

### 6.2 `ListPaneHeader`'s sticky was a no-op that would have collided

`ListPane` retains `overflow-hidden`, which makes the pane its own scrollport —
a sticky descendant pins to a box that never scrolls. Had it worked it would
have been worse: the pane header and the `ResourceToolbar` are both at the top
of the same scrolling column, and the header, being later in the DOM, would have
painted over the toolbar. The class is removed.

### 6.3 The subnav's sticky offset was a hardcoded guess

`top-14` assumed a 3.5rem toolbar. The search row this column is explicitly
meant to grow into would have invalidated it. Toolbar and subnav now pin as one
sticky block (`data-slot="list-detail-list-chrome"`), so no offset exists to be
wrong.

### 6.4 The detail column showed a scrollbar of its own

`876-scroll` also reserves `scrollbar-gutter: stable`, so the detail card kept an
empty strip even when nothing scrolled, and beside the browser's own bar the
result read as a boxed card rather than a section of the page. A new
`876-scroll-none` utility (`packages/ui/src/876.css`) scrolls with no chrome at
all — wheel, trackpad, touch, and keyboard are unaffected. The list column keeps
the visible thin bar.

### 6.5 Re-verification

- `pnpm --filter @876/ui typecheck` — passed
- `pnpm --filter @876/ui test` — 251/251
- `pnpm --filter @876/console typecheck` — passed
- `pnpm --filter @876/console test` — 1705/1706 (the one failure is the
  pre-existing `subscription-billing-summary` snapshot-client error, unrelated)
- `pnpm --filter @876/billing-app test` — 745/745
- `pnpm --filter @876/invoice-app test` — 215/215

## 7. Second pass — the canonical two-pane surface

Testing on a laptop viewport showed the first pass was still wrong in both
directions: a page scrollbar appeared beside the panes on short screens (the
`min-h-[32rem]` floor plus a guessed `calc(100svh - 11rem)` overshot the space
actually available), and a long record scrolled the whole page rather than
itself.

The pattern this is meant to be — Zoho Books, and the master/detail canonical
layout documented at
<https://uxpatternsguide.com/patterns/master-detail/> (sourced from Microsoft's
list/details pattern, Android's canonical layouts, Material, and Apple's HIG) —
is a **viewport-fitted two-pane surface**: side-by-side panes on wide screens,
each owning its own scroll and preserving its own position, and the page itself
does not scroll at all.

What the shell does now, open and side by side:

- The shell is `h-full`, fitted to the frame `AppShellMain` already gives it —
  a real definite height, not a `svh` guess, so nothing can push the page taller
  and summon a page scrollbar.
- Both panes are `h-full overflow-y-auto`, each scrolling independently.
- Neither pane shows a scrollbar (`876-scroll-none`). Two visible bars mid-page
  read as boxes rather than sections of a page.
- The rows take their **natural height** inside the list pane. Sizing them with
  `flex-1 min-h-0` capped them at exactly the pane height, so the list could
  never overflow and never scrolled — the rows past the fold were simply clipped
  by the card around them.
- `DetailCardHeader` is not sticky. The record scrolls as one thing; pinning the
  header is a later decision, not a side effect of the scroll model.

Stacked (below the two-column container query), the panes sit one above the
other and the **shell** takes the scroll instead of the panes. A clamped stack
with nothing scrollable hides its own tail, which is the failure the first pass
introduced by clamping on a viewport breakpoint while the columns switched on a
container query.
