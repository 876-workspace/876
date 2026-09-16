# Brief: fix Projects phase-1 verification failures

Branch `feature/projects-phase-1-foundation` (do not change branch, do not commit).
The production code is intended; the failures are tests/fixtures that did not follow it,
EXCEPT where noted. Do not weaken production code for tests. No `eslint-disable`, `as any`, `@ts-ignore`.

## Failures to fix (read only the named files plus the component each test renders)

### packages/projects-ui (`pnpm --filter @876/projects-ui test`)
1. `src/issue-board.advanced.test.tsx` "card, with an assignee, shows the assignee id" — `getByText('user_ana')` now finds multiple elements (grouping header + card). Scope the query to the card (e.g. `within(card)`) or use `getAllByText` with an exact count assertion.
2. `src/issue-detail-foundation.test.tsx` two tests — `production`, `Ben Clarke` appear more than once (the new detail fields sidebar + activity). Scope queries with `within(...)` to the intended region.
3. `src/issue-detail.test.tsx` three activity tests — `user_ben`, `/in-progress/` duplicated (scope to activity list); "falls back to System" can't find `comment_created` because events are now formatted to readable names — read `src/issue-detail.tsx` for the formatter and assert the formatted text.

### apps/projects (`pnpm --filter @876/projects-app typecheck` and `test`)
4. `src/app/(app)/board/page.test.tsx` line 26: `BoardPage()` now requires props (TS2554) — pass `{ searchParams: Promise.resolve({}) }` matching the page's Props type; fix the test's toolbar assertion accordingly.
5. `src/lib/modules/catalog.test.ts` "marks exactly the product surfaces that exist today as available" — `src/lib/modules/catalog.ts` changed one surface (comments) to available this branch (commit e70ac51c1). Update the expected set in the test to match.

## Verify (one command at a time)
pnpm --filter @876/projects-ui test
pnpm --filter @876/projects-app typecheck
pnpm --filter @876/projects-app test

## Report
Write `plans/2026-09-15-projects-phase-1/reports/opencode/2026-09-15-verification-fixes.md`: files changed, final test counts, anything unresolved.
