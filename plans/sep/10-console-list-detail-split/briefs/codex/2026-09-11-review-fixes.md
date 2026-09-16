# Codex brief — Console list/detail split: review fixes

Branch: `feature/console-list-detail-split` (uncommitted working tree — do NOT
commit, stash, reset, or switch branches). Scope: `apps/console` only.

## Context

An earlier agent converted five Console sections to the billing split-view
pattern (`@876/ui/list-detail-section`): `/users`, `/orgs`, `/widgets`,
`/settings/users` (team), `/settings/users/roles`. Read
`plans/2026-09-10-console-list-detail-split/plan.md` first, then
`.claude/rules/app-layout.md` §5 and §5a, `.claude/rules/navigation-performance.md`,
`.claude/rules/data-loading.md`, `.claude/rules/error-handling.md`,
`.claude/rules/testing.md`, `.claude/rules/ai-code-quality.md`.
Reference implementation: `apps/billing/src/app/(app)/customers/`.

Current state: typecheck, lint (0 errors), 1742 tests and
`node scripts/check-app-structure.mjs` all pass. Do not regress any of them.

## Fixes required (orchestrator review findings)

### 1. `/users` and `/orgs` lost server-side search, status filter and pagination (HIGH)

`users/_components/users-list-data.tsx` and `orgs/_components/orgs-list-data.tsx`
now fetch one window of `limit: 50` and filter `?q` and `?status`
client-side. On `main` these pages called `platform.users.search({ q, status })`
/ `platform.users.list({ status, startingAfter, endingBefore })` (see
`git show HEAD:"apps/console/src/app/(app)/users/(list)/page.tsx"` and the orgs
equivalent). These are platform-wide directories: user #51 is now unfindable,
and pagination (`hasMore={false}`, `firstId/lastId=null`) is gone.
`app-layout.md` §5 forbids filtering status client-side over a bounded window.

Restore API-side `q`, `status`, and cursor pagination (`after`/`before`) for
both sections while keeping the split view (list stays mounted beside the
detail card, toolbar never unmounts, grid animates). A layout receives no
`searchParams`, so the idiomatic route is a **parallel route slot** (e.g.
`users/@list/...`) whose pages do receive `searchParams`, rendered by the
layout as its `list` prop — read
`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/parallel-routes.md`
and `default.md` (in `apps/console/node_modules/next/...`) and make hard loads,
soft navigation open/close, tab switches, `new`/`edit` takeovers, and refresh
on a detail URL all render the list correctly (`default.tsx` where needed).
If you conclude a different mechanism is better, justify it in the report.
Keep the `DataTableSkeleton` fallback with the real columns, keep the existing
`UserSearchBar`, pagination component and `TrackMCEventOnMount` behaviour
(`filter_applied` should again include cursors). Condensed `ListPane` rows must
keep the current query string on their hrefs.

Widgets (static catalog), team and roles may keep client-side filtering — that
matches billing and §5a.

### 2. Swallowed enrichment failures (MEDIUM)

- `orgs-list-data.tsx`: a failed `workspace.organizations.subscriptions.list`
  silently yields an empty map (orgs render with no apps). Show a compact
  `AppError` banner/notice for the failed enrichment, per `error-handling.md`.
- `users-list-data.tsx`: same for `platform.users.listAppsByUsers`.
  Also run the primary list first, then enrichment — keep as-is but no silent
  empties.

### 3. Detail route must return the card as the column's only child (MEDIUM)

`users/[username]/layout.tsx` and `orgs/[slug]/layout.tsx` render
`<DeletedNotice/>` as a sibling _above_ `<DetailCard>`. §5a: the card is
`h-full`; a sibling reintroduces flow height and collapses/overflows it. Move
the deleted notice inside the card (e.g. top of `DetailCardBody` or a notice
slot) so the card is the only child. Check team/roles/widgets detail frames for
the same problem.

### 4. Full review pass

Then review the whole diff (`git diff` + untracked files under
`apps/console/src/app/(app)/{users,orgs,widgets,settings/users}`) for:
correctness bugs, definite-height requirement (§5a "Height" — confirm Console's
app shell gives `ListDetailSection` a definite height for these routes, or fix),
dead code left behind (e.g. unused `DetailHeader` imports/components,
`condensed*` helpers, unused skeleton columns), duplicate helpers
(`initialsOf`/`nameOf` copies — reuse the existing one), `overscroll-contain` on
in-page panes, green buttons, and any test that cannot fail.

## Tests

Add/update tests for: users and orgs list data threading `q`/`status`/cursors
into the API call (assert exact `toHaveBeenCalledWith` args), the enrichment
failure notice, and the deleted notice rendering inside the card. Minimum 10 new
`it()` cases. Console vitest env: check `apps/console/vitest.config.ts`.

## Must not

- no commits, branch operations, or PRs;
- no `eslint-disable`, `@ts-ignore`, `as any`;
- no changes outside `apps/console` except reading;
- no run logs or transcripts written into the repo;
- do not weaken production code for testability.

## Verification you must run before reporting

```bash
pnpm --filter @876/console typecheck
pnpm --filter @876/console lint
pnpm --filter @876/console test
node scripts/check-app-structure.mjs
```

## Report

Write `plans/2026-09-10-console-list-detail-split/reports/codex/2026-09-11-review-fixes.md`:
per-finding status, files changed with reasons, decisions, counted new `it()`
cases, verification output tails, and anything you could not verify.
