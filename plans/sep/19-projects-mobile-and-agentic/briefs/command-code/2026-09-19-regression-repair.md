# Brief — repair the 7 test regressions this run introduced

Branch: `feature/projects-mobile-and-agentic`. Do **not** create a branch. Do
**not** commit — the orchestrator commits. Work only in `apps/projects`.

## How these were identified — do not re-scope

The full `@876/projects-app` suite was run on this branch and again on
`origin/main` in the same checkout. `main` fails 10 files; this branch fails 10;
**8 of main's failures are now fixed** and **7 are new**. Only the 7 new ones are
yours. Two files fail on both and are **out of scope** — do not touch them:

- `src/features/reports/components/budget-variance-data.test.tsx`
- `src/lib/__tests__/portal-boundary.test.ts`

Run each file you fix individually. Do not run the whole suite; it is slow and
its other failures are not yours.

## The 7 files and their exact causes

### A. `src/components/shell/nav-config.test.ts` — one new href

```
AssertionError: expected [ '/', '/projects', '/phases', …(11) ]
                to deeply equal [ '/', '/projects', '/phases', …(10) ]
```

An `/inbox` navigation entry was added this run (idea capture). The binding test
pins the exact visible href set, which is correct and must stay exact — see
`.claude/rules/access-control.md`, the registry-to-route binding test.

**Fix:** add `/inbox` to the expected array, in the position the registry
actually yields (run the test and read the received array; do not guess the
index). If the entry requires a permission, make sure the test's role fixture
holds it — a permission nothing grants is the failure mode that rule warns
about. Do **not** weaken the assertion to `toContain` or sort-insensitive.

### B. Five `src/features/time/components/*.test.tsx` — text now matches twice

```
TestingLibraryElementError: Found multiple elements with the text:
  Jan 1, 2024 – Jan 7, 2024
```

Files:

- `approvals-data.test.tsx`
- `my-time-data.test.tsx`
- `project-time-data.test.tsx`
- `time-entries-panel.test.tsx`
- `timesheet-card.test.tsx`

`time-entry-list.tsx` and `timesheet-summary.tsx` now render **both** a
`MobileList` (phone) and the existing table (`hidden sm:block`), so every value
appears twice in the DOM. That is the established platform pattern — the
projects and issues lists have done it since before this run — so the
**components are correct and must not be changed**.

**Fix the tests**, and fix them precisely:

- where the assertion is "this value is shown", use `getAllByText(...)` and
  assert `.length` is exactly 2, then assert on `[0]`. Do **not** use
  `getAllByText(...)[0]` without asserting the count — that silently passes if
  the duplication ever becomes triplication.
- where the assertion is on a **link or button** the user clicks, scope the
  query to the layout under test with `within(...)`, using the container that
  actually holds it. Prefer scoping over `getAllBy` for interactive elements.
- where a test asserts something is **absent**, `queryAllByText(...)` must have
  length 0 — a `queryByText` that now finds two elements throws instead of
  returning null.

Read each failure before editing; the five files differ.

### C. `src/features/projects/components/work-breakdown.test.tsx` — a test asserting something the component does not do

```
Unable to find an accessible element with the role "link"
  and name "CONSOLE-9 Wire the API"
```

This test was written in this run alongside the change. Decide which side is
wrong by reading `work-breakdown.tsx`:

- the component renders **nothing on phone when every issue is unlisted**,
  because those issues already appear as tappable rows in the Work list above —
  that behaviour is intended, and a fixture with only unlisted issues will
  correctly render no links;
- when there **is** real task-list structure, each issue row must be a link.

So: if the fixture has no task lists, the test is asserting the wrong scenario —
give it a fixture **with** a task list containing that issue. If the fixture
does have a task list and the row still is not a link, the component is wrong —
make the row a link.

State in your report which of the two it was.

### D. `src/app/(app)/issues/[issueRef]/_components/issue-detail-data.test.tsx` — the mock is missing a namespace

```
TypeError: Cannot read properties of undefined (reading 'list')
  at issue-detail-data.tsx: projects.comments.list(orgId, issue.id, …)
```

The page now loads comments so it can build the agent brief. The test's
`projects` mock has no `comments` namespace.

**Fix:** add `comments: { list: vi.fn() }` to the mock and give it a default
resolved value in `beforeEach`, matching how the neighbouring namespaces in that
same file are mocked (read them and copy the shape — including the
`{ data, error }` envelope and the list container the code expects). Do not
change `issue-detail-data.tsx`.

If the mock object is built with `vi.hoisted`, add the new namespace inside that
hoisted factory — a mock factory referencing a plain `const` declared later
throws at hoist time (`.claude/rules/testing.md`, mock discipline rule 4).

## Hard constraints

- **Do not change production code** except in case C, and only if you establish
  the component is genuinely wrong.
- **Do not weaken an assertion to make it pass.** No `toContain` in place of
  `toEqual`, no removing a count check, no `it.skip`, no deleting a test.
  `.claude/rules/testing.md` is explicit: a test that cannot fail is not a test.
- No `eslint-disable`, no `@ts-ignore`, no `as any` (use `as unknown as T` only
  for a real type mismatch, and say so).
- Do not touch the two out-of-scope pre-existing failures named above.
- Do not touch `packages/` at all.

## Verify — run each file individually, one command at a time

```bash
pnpm --filter @876/projects-app exec vitest run src/components/shell/nav-config.test.ts
pnpm --filter @876/projects-app exec vitest run src/features/time/components/timesheet-card.test.tsx
pnpm --filter @876/projects-app exec vitest run src/features/time/components/time-entries-panel.test.tsx
pnpm --filter @876/projects-app exec vitest run src/features/time/components/approvals-data.test.tsx
pnpm --filter @876/projects-app exec vitest run src/features/time/components/my-time-data.test.tsx
pnpm --filter @876/projects-app exec vitest run src/features/time/components/project-time-data.test.tsx
pnpm --filter @876/projects-app exec vitest run src/features/projects/components/work-breakdown.test.tsx
pnpm --filter @876/projects-app exec vitest run 'src/app/(app)/issues/[issueRef]/_components/issue-detail-data.test.tsx'
pnpm --filter @876/projects-app typecheck
```

`@876/projects-app` is the Next.js app. `@876/projects` is a different
workspace and running it verifies nothing here.

All eight must pass. If one cannot be made to pass without weakening an
assertion, **leave it failing and explain why in your report** — that is a far
better outcome than a test that no longer tests anything.

## Report

`plans/sep/19-projects-mobile-and-agentic/reports/command-code/2026-09-19-regression-repair.md`
— each file, its cause, what you changed and why; for case C which side was
wrong; the real output of every command; and anything you left failing.
