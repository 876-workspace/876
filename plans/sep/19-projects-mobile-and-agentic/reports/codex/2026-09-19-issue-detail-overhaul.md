# Issue detail overhaul

## Files changed

- `packages/projects-ui/src/issue-detail.tsx`: split the presentational issue detail into `IssueDetailHeader`, `IssueDetailBody`, and `IssueMetaRail`; retained `IssueDetail` as the compatibility composition. Added responsive no-card phone sections, mobile definition-list facts, mobile sub-item rows, and capped activity disclosure.
- `apps/projects/src/app/(app)/issues/[issueRef]/_components/issue-detail-data.tsx`: made the page own the single grid; moved visibility and status controls into the header action slot; placed links, comments, and attachments in the main column and reminders in the rail. Existing Suspense boundaries and fallbacks remain.
- `packages/projects-ui/src/issue-detail.test.tsx`: added 14 `it()` cases for the exported pieces, composition contract, and no-right-margin invariant. Existing assertions were adjusted for the simultaneously rendered responsive markup.
- `packages/projects-ui/src/issue-detail-foundation.test.tsx`: adjusted existing expectations for the responsive desktop/mobile representations.
- `plans/sep/19-projects-mobile-and-agentic/reports/codex/2026-09-19-issue-detail-overhaul.md`: records this implementation and verification result.

## Tests added

Counted new `it()` cases: **14**. The file increased from 28 to 42 `it()` cases.

## Verification

Ran sequentially:

```text
$ pnpm --filter @876/projects-ui typecheck
$ tsc --noEmit
```

```text
$ pnpm --filter @876/projects-ui exec vitest run src/issue-detail.test.tsx src/issue-detail-foundation.test.tsx

Test Files  2 passed (2)
Tests  44 passed (44)
```

```text
$ pnpm --filter @876/projects typecheck
$ tsc --noEmit
```

I also ran the required full package command twice:

```text
$ pnpm --filter @876/projects-ui test
$ vitest run

RUN  v4.1.11 /root/projects/876/packages/projects-ui
```

The host terminated the command-output wait after roughly 30 seconds without a completion summary, even though no Vitest process remained afterward. I therefore cannot truthfully mark the full package suite as verified. The focused changed suites passed as shown above.

## Decisions and deliberate scope

- The phone activity disclosure is collapsed by default and renders the first five events when opened. Desktop continues to render the full timeline.
- The `actions` slot is a `ReactNode`; the app passes already server-rendered controls and no function props cross the RSC boundary.
- No casts, ignores, lint suppressions, data access, client imports, branches, commits, or changes to the excluded list/board/API files were added.
- The independently modified files shown by `git status` outside the four files above were left untouched.
