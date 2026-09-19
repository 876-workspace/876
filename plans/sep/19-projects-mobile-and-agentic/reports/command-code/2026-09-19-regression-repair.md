# Regression repair — the seven new `@876/projects-app` test failures

Date: 2026-09-19. Branch: `feature/projects-mobile-and-agentic`. No branch created, no commit made
(the orchestrator commits). Everything below is under `apps/projects` except the one production fix in
section C, which is also in `apps/projects`; `packages/` was not touched.

## Environment note (before anything else)

The harness shell exports `NODE_ENV=production`. Under it, Vitest resolves the jsdom test runner in
client mode and `node:fs` / `node:path` cannot be imported: the two route-binding files
(`nav-config.test.ts` and `settings-nav.test.ts`) fail to load at all with
`Error: No such built-in module: node:` — a suite-level failure that is not the assertion failure the
brief describes. Every command below was therefore run as `NODE_ENV=test …`. With that prefix the
runs produce exactly the failures the brief predicts.

## What changed, file by file

### A. `src/components/shell/nav-config.test.ts` → added `'/inbox'` to the pinned href set

Cause: the run added an `Inbox` entry to `nav-config.ts` (workspace group, `requires: { module:
'issues', permission: 'issues.view' }`). The "exact permission-rich href set" test pins the full
visible list, so it failed with 11 vs 10 entries. I ran the test first and read the received array —
`/inbox` sits between `/board` and `/labels`, i.e. last in the workspace group.

Change: one line, `'/inbox'` inserted in that position. The assertion is still `toEqual` over the
exact array; nothing was loosened. The two binding tests that walk the registry (permission binding and
module binding) pass unchanged, so the new entry's destination route guards match what the registry
declares; no role fixture needed widening.

### B. The five `src/features/time/components/*.test.tsx` files → count-based value assertions

Cause: `packages/projects-ui/src/time-entry-list.tsx` and `timesheet-summary.tsx` now render a phone
`MobileList` next to the desktop table (one branch `sm:hidden`, the other `hidden … sm:block`). jsdom
applies no Tailwind CSS, so both branches are in the DOM and every shared value appears twice. The
components are the established platform pattern and were not changed.

Each assertion that means "this value is shown" became `getAllByText(...)`, `expect(...).toHaveLength(2)`,
then the `[0]` assertion — so the test proves both layouts render the value, and triplication would fail
it. Specifically:

- `approvals-data.test.tsx` — `'Website rebuild'` (phone row title + desktop table cell).
- `my-time-data.test.tsx` — `'1h 30m'` (phone row meta + desktop duration cell) and
  `'Jan 1, 2024 – Jan 7, 2024'` (summary header + phone group subtitle).
- `project-time-data.test.tsx` — `'Website rebuild'` (phone row title + desktop cell) and
  `'No time logged against this project yet.'` (`MobileListEmpty` + desktop empty card).
- `time-entries-panel.test.tsx` — the same pair as its first test (`'Website rebuild'`, `'1h 30m'`) plus
  the empty message.
- `timesheet-card.test.tsx` — the period range in two tests (header + phone group subtitle) and
  `'Website rebuild'` (phone group title + desktop table cell).

No interactive-element query in these five files is ambiguous: the row buttons render once (the phone
rows carry no actions) and the work-item link query still resolves to a single element because the
phone link's `aria-label` makes its accessible name `View work item …`, which the string query does not
match. So no `within(...)` scoping was needed. No absence assertion needed `queryAllByText` — the only
absence queries are `queryByRole`, which still match zero elements.

### C. `work-breakdown` — which side was wrong

The brief's two branches did not quite cover what is on disk, so here is the finding:

- the fixture **does** have task lists (`tl_1` holds `iss_9`), the phone section renders, and the row
  **is** a `<Link href="/issues/CONSOLE-9">`;
- the query failed because the link's computed accessible name was `"CONSOLE-9Wire the API"`. The two
  `<span>`s are adjacent in JSX and the newline between them is stripped, so the accessible-name
  computation has no separator. Testing Library's role summary shows exactly that: `Name
  "CONSOLE-9Wire the API"` with the right href.

So the component side was wrong — not the fixture and not "the row isn't a link" — in the
accessible-name dimension. Change: `</span>{' '}` in the task-list issue row, giving the link the name
`"CONSOLE-9 Wire the API"` the test asserts (whitespace is normalized). I applied the same one-character
fix to the sibling row in the same component (phase-level unlisted issues), which carries the identical
defect; only the task-list row is covered by the failing test. A whitespace-only text node in a flex
container is not rendered, so the visual layout is unchanged. The test file itself needed no edit and
the whole file is green (11/11).

### D. `src/app/(app)/issues/[issueRef]/_components/issue-detail-data.test.tsx` → comments namespace, then one duplicate-text assertion

Cause 1, as the brief says: `IssueDetailData` now calls `projects.comments.list(orgId, issue.id, { limit:
100 })`, and the test's `vi.hoisted` mocks plus the `@/lib/clients/projects` factory have no `comments`
namespace, so all four tests died with `TypeError: Cannot read properties of undefined (reading 'list')`.
Fix inside the hoisted factory, copying the neighbouring list namespaces: `listComments: vi.fn()` in the
hoisted object, `comments: { list: mocks.listComments }` in the mocked client, and
`mocks.listComments.mockResolvedValue({ data: { data: [] }, error: null })` in `beforeEach` — the
`{ data, error }` envelope with the list container `formatAgentBrief` reads (`commentsResult.data?.data`).

Cause 2, which only becomes visible once the component renders: `shows the Blocked badge when the work
item is blocked` found two `Blocked` texts — the desktop header badge (`hidden … sm:flex` in
`packages/projects-ui/src/issue-detail.tsx`, line 131) and the phone meta fact (`MobileFact label="Blocked"`,
line 391, added by `e3bdf5951` in this run). Same platform pattern, so the assertion became
`getAllByText('Blocked')` with an exact length of 2 and then `[0]`. The negative test ("leaves the Blocked
badge off") still uses `queryByText` and passes — with the item unblocked there are zero matches, so it
returns null as intended. `issue-detail-data.tsx` was not changed.

## Verification — one command at a time, real output

All eight commands were run individually with the app's vitest, `NODE_ENV=test` prefix (see the
environment note). Exit code 0 for every one.

```text
$ NODE_ENV=test pnpm --filter @876/projects-app exec vitest run src/components/shell/nav-config.test.ts

 RUN  v4.1.11 /root/projects/876/apps/projects

 Test Files  1 passed (1)
      Tests  14 passed (14)
```

```text
$ NODE_ENV=test pnpm --filter @876/projects-app exec vitest run src/features/time/components/timesheet-card.test.tsx

 RUN  v4.1.11 /root/projects/876/apps/projects

 Test Files  1 passed (1)
      Tests  8 passed (8)
```

```text
$ NODE_ENV=test pnpm --filter @876/projects-app exec vitest run src/features/time/components/time-entries-panel.test.tsx

 RUN  v4.1.11 /root/projects/876/apps/projects

 Test Files  1 passed (1)
      Tests  9 passed (9)
```

```text
$ NODE_ENV=test pnpm --filter @876/projects-app exec vitest run src/features/time/components/approvals-data.test.tsx

 RUN  v4.1.11 /root/projects/876/apps/projects

 Test Files  1 passed (1)
      Tests  5 passed (5)
```

```text
$ NODE_ENV=test pnpm --filter @876/projects-app exec vitest run src/features/time/components/my-time-data.test.tsx

 RUN  v4.1.11 /root/projects/876/apps/projects

 Test Files  1 passed (1)
      Tests  7 passed (7)
```

```text
$ NODE_ENV=test pnpm --filter @876/projects-app exec vitest run src/features/time/components/project-time-data.test.tsx

 RUN  v4.1.11 /root/projects/876/apps/projects

 Test Files  1 passed (1)
      Tests  7 passed (7)
```

```text
$ NODE_ENV=test pnpm --filter @876/projects-app exec vitest run src/features/projects/components/work-breakdown.test.tsx

 RUN  v4.1.11 /root/projects/876/apps/projects

 Test Files  1 passed (1)
      Tests  11 passed (11)
```

```text
$ NODE_ENV=test pnpm --filter @876/projects-app exec vitest run 'src/app/(app)/issues/[issueRef]/_components/issue-detail-data.test.tsx'

 RUN  v4.1.11 /root/projects/876/apps/projects

 Test Files  1 passed (1)
      Tests  4 passed (4)
```

```text
$ NODE_ENV=test pnpm --filter @876/projects-app typecheck
$ tsc --noEmit
```

Exit code 0. Also, `NODE_ENV=test pnpm --filter @876/projects-app exec eslint <the eight changed files>`
reports no findings.

`git diff --stat` (8 files, all under `apps/projects`):

```text
 .../[issueRef]/_components/issue-detail-data.test.tsx    |  7 ++++++-
 apps/projects/src/components/shell/nav-config.test.ts    |  1 +
 .../src/features/projects/components/work-breakdown.tsx  |  4 ++--
 .../src/features/time/components/approvals-data.test.tsx |  4 +++-
 .../src/features/time/components/my-time-data.test.tsx   |  8 ++++++--
 .../features/time/components/project-time-data.test.tsx  | 12 ++++++++----
 .../features/time/components/time-entries-panel.test.tsx | 16 +++++++++++-----
 .../src/features/time/components/timesheet-card.test.tsx | 12 +++++++++---
 8 files changed, 46 insertions(+), 18 deletions(-)
```

## Notes and things left alone

- **Prettier**: `approvals-data.test.tsx`, `my-time-data.test.tsx` and `project-time-data.test.tsx` have
  pre-existing Prettier deviations (long `render(await …)` calls, one-line `mockResolvedValue`s) in lines
  this change does not touch — I confirmed the same deviations exist at `HEAD`. I did not reformat, to
  avoid unrelated churn; every line I added is Prettier-clean, and the other five changed files are clean.
- **Nothing is left failing.** The two out-of-scope pre-existing failures
  (`budget-variance-data.test.tsx`, `portal-boundary.test.ts`) were neither touched nor run.
- No whole-suite run was made, per the brief, and no commit was created.
