# Review & verification — Console list/detail split

Date: 2026-09-11. Implementation by Muse; review fixes by Codex
(`gpt-5.6-terra`, reasoning `medium`, brief
`briefs/codex/2026-09-11-review-fixes.md`). The Codex run was terminated by a
session restart before it wrote its own report, so this report records what
the orchestrator verified from the diff.

## Findings and resolution

| # | Finding | Severity | Resolution |
| - | ------- | -------- | ---------- |
| 1 | `/users` and `/orgs` fetched one 50-row window and filtered `?q`/`?status` client-side; cursor pagination removed. Records past row 50 were unfindable. | High | Codex: `@list` parallel slots (`users/@list/[[...segments]]/page.tsx`, `orgs/@list/...` + `default.tsx`) receive `searchParams`, so `*ListData` again calls `search`/`list` with `status` and `startingAfter`/`endingBefore`. The layout renders the slot as the section's `list`. |
| 2 | Enrichment failures (`listAppsByUsers`, org subscriptions batch) silently became empty maps. | Medium | Codex: compact `AppError` banner beside the list. |
| 3 | `DeletedNotice` rendered as a sibling above the `h-full` `DetailCard`. | Medium | Codex: moved inside `DetailCardBody`. |
| 4 | Codex applied a `100svh` height override (`lib/layout/console-list-detail.ts`) to all five sections. | Medium | Orchestrator: removed. These routes render inside `AppShellMain` (`min-h-0 flex-1 overflow-y-auto` in an `h-svh` frame), so the section's default `h-full min-h-0` already resolves (§5a height table). |
| 5 | Codex reformatted two unrelated `orgs/[slug]/subscriptions` files. | Low | Orchestrator: reverted (git.md, no incidental churn). |
| 6 | Two list tests still asserted client-side search against a non-empty row set. | Low | Orchestrator: updated to pass an empty server result with `isSearching`, and assert the query appears in the empty state. |

Trade-off: the `@list` slot re-renders on every navigation under `/users` and
`/orgs`, so opening a record refetches the current list page. The list stays
mounted (no remount or fallback flash); the cost is one bounded list request
per open, in exchange for correct server search and pagination.

## Verification (run by orchestrator, foreground)

- `tsc --noEmit` (console): clean. Stale `.next/types` from a prior build had to be
  removed first; the default heap OOMs, so run with `NODE_OPTIONS=--max-old-space-size=8192`.
- `pnpm --filter @876/console lint`: 0 errors (21 pre-existing warnings).
- `pnpm --filter @876/console test`: 185 files, **1752 passed** (baseline was 1742).
- `node scripts/check-app-structure.mjs`: OK.
- No new `eslint-disable`, `as any`, or `@ts-ignore` in touched paths.

## Not verified

- Not checked in a browser: the grid animation, slot behaviour on hard load of a
  detail URL, and the narrow-viewport layout. Walk the manual checklist in `plan.md`
  before merging.
