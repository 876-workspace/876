# Implementation Plan: Console drill-down sidebar

Run ID: `2026-09-03-console-drilldown-sidebar`
Branch: `feat/console-drilldown-sidebar` (from `feat/876-projects`)
Status: COMPLETED ✅

## Overview

Console's left rail is a fixed icon-only pill. Clicking a section that owns a
subtree (Apps, Organizations, Projects, Requests, Settings) should **replace**
the rail with that section's labelled items, sliding in from the right, with a
back row returning to the rail. This is the _drill-down sidebar_ pattern.

### Prior art (researched 2026-09-03)

- **Vercel** shipped it in the Jan 2026 dashboard IA revamp; **Google AI Studio**
  uses it too.
- **shadcn-ui/ui discussion #10163** proposes it as a primitive
  (`SidebarDrillDown` / `SidebarDrillDownPanel`), driven by
  `data-[state=inactive]:-translate-x-full` / `translate-x-full`. Not shipped —
  we build our own.
- Its open questions, and our answers:
  - depth → **two levels only** (rail → section items);
  - RTL → out of scope, the rail is LTR-only today;
  - mobile → **flatten** (the existing sheet lists sections then items);
  - collapsed icon mode → the rail _is_ the collapsed mode; opening a section is
    what expands it.
- The rejected sibling is **dual-rail** (VS Code / Slack): rail stays pinned,
  panel opens beside it. Rejected by the user in favour of replace.

## Key design decisions

1. **The open section is derived from `usePathname()`, never from click state.**
   Navigation _is_ the state. This is why the panel survives refresh, deep links,
   and back/forward, needs no store, and cannot desynchronise from the route.
2. **Reuse `NavEntry.children`** from `@876/core/access` rather than adding a
   `sections` field. `resolveNavigation` already resolves children recursively
   and already drops a parent whose declared children all resolve away — exactly
   the semantics a drill-down section needs. No core type change.
3. **The mechanic lives in `apps/console/src/components/shell/`, not
   `packages/ui`.** `app-structure.md` is explicit: start in the narrowest
   bucket, promote when a _second app_ needs it. Promotion to `@876/ui` is the
   follow-up when Couriers/Billing/Projects adopt it.
4. **Only entries with a real subtree drill: Projects and Requests.** Everything
   else stays a direct link. Security was tried and reverted, and Settings was
   tried and reverted, both on the user's instruction — those two navigate
   straight through exactly as before. Apps and Organizations were never
   candidates: their sub-navigation is per-record (`/apps/[slug]` tabs), not
   section-level, so a panel there would hold one link.
   There is **no chevron affordance** on the rail — removed on request; the tile
   is a plain icon and the panel is the feedback.
5. **Layer-2 enforcement is unchanged.** Children are permission-gated by the
   same `ROUTE_PERMISSIONS` binding, and the anti-drift tests are extended to
   walk children — a child link can never outrun its route guard.

## Phases

- [x] P1 — `nav-config.ts` gains children for the five drill-down sections; nav
      icons for the new items.
- [x] P2 — the drill-down shell: the mechanic lives in `sidebar.tsx` (rail,
      panel, and the pathname-derived open key), path resolution is extracted to
      `sidebar-sections.ts` so it is testable without rendering, `mobile-nav.tsx`
      is flattened, and `shell.tsx` search walks children.
- [x] P3 — `/projects`: 876's own Projects workspace in Console, mirroring how
      `/requests` is 876's own CRM workspace. New `console:projects` permission.
- [x] P4 — `/requests`: section panel + `/requests/forms` and
      `/requests/customers`.
- [x] P5 — tests: pathname→section resolution, serialization, registry↔route
      binding over children, permission visibility per role.

## Verification

```bash
pnpm --filter @876/console typecheck
pnpm --filter @876/console lint
pnpm --filter @876/console test
pnpm --filter @876/core test
node scripts/check-app-structure.mjs
```

## Verification results (2026-09-03)

| Check                                  | Result                                                 |
| -------------------------------------- | ------------------------------------------------------ |
| `pnpm --filter @876/console typecheck` | pass                                                   |
| `pnpm --filter @876/console lint`      | 0 errors, 21 pre-existing warnings (none in new files) |
| `pnpm --filter @876/console test`      | 151 files, 1458 tests, all pass (+30 new)              |
| `pnpm --filter @876/core test`         | 37 files, 962 tests, all pass                          |
| `node scripts/check-app-structure.mjs` | OK                                                     |

## Pull request

[#467](https://github.com/876-workspace/876/pull/467) — targets `feat/876-projects`,
the integration branch this phase belongs to, not `main`.

Twelve commits, `3bb0f105..e80bc579`. The last one, `e80bc579`, fixes three
geometry defects found by running the app rather than by any test: the rail
column was narrower than the card's content box so the icons sat 4px left of
centre, the card animated only its width so its height snapped when a section's
few rows replaced the rail's many icons, and the 4px gutter that reads as
deliberate behind a 60px rail read as the panel touching the content once it
was 224px wide.

CI on the PR is red, as it is on `main` — every Actions check fails in 2-3s and
the Cloudflare Workers Builds are orphaned from the move to Vercel. Both are
pre-existing and repo-wide; the verification above was run locally.

## Handoff state

Implemented and green; **not committed** — `.claude/rules/git.md` requires
explicit approval before any commit.

Follow-ups deliberately left out:

- `/sessions` has no permission guard and no `ROUTE_PERMISSIONS` entry. Found
  while considering a Security section; it is a pre-existing gap, unrelated to
  this change, and deserves its own commit.
- `/projects/projects/new` and `/projects/issues/new` are placeholders, matching
  the org-workspace ones they mirror. No create form exists on either surface.
- `/requests/forms` is an `EmptyWorkspaceView`, matching the org-workspace CRM
  forms page it mirrors.
- Promotion of the drill-down mechanic to `@876/ui` when a second app adopts it.
