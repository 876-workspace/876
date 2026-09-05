# Sidebar back control and workspace records

## Sidebar accessibility

`SidebarContext` now has a required `backLabel`, separate from its visual
`title`. The platform root keeps `title: ''`, so Console is still not drawn in
the rail, while it uses `backLabel: 'Console'` for a useful back-control name.
Section, product, and workspace context builders set `backLabel` to their
existing visible title. Both desktop and mobile back controls use that field.

The existing six `Back to Console` cases remain. One new sidebar test walks
the resolved registry, renders every non-root context, and checks the actual
back button name is not `Back to `.

## Workspace Projects and Issues verdicts

| File                                 | Verdict                    | Evidence                                                                                                                                                 |
| ------------------------------------ | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `projects/projects/layout.test.tsx`  | Test wrong; route correct. | The layout renders its children directly, the list page renders its own `Page` and toolbar, and no list/detail shell or definite-height wrapper remains. |
| `issues/layout.test.tsx`             | Test wrong; route correct. | Same full-page pairing as Projects: direct children in the layout and a self-owned list page/toolbar, with no split shell or obsolete height wrapper.    |
| `projects/[projectId]/page.test.tsx` | Test wrong; route correct. | The shared full-page `ProjectDetail` renders the key as `FAL` and has no split-pane `Back to projects` control.                                          |
| `issues/[issueRef]/page.test.tsx`    | Test wrong; route correct. | The shared full-page `IssueDetail` renders its header identifier as `APO · APO-99`.                                                                      |

The rewritten workspace layout tests mirror the platform route tests: they
assert direct layout children and no shell, assert that the list page owns the
toolbar, and spy on the data component to verify absent, valid, and invalid
status-filter values. The `(list)/page.tsx` files do not return `null`; each
renders its own `Page`, section, toolbar, and data component.

## Organization switcher

The defect was in the test, not the component. The workspace-header change
correctly made the visible return link say `Organizations`; opening the menu
then creates a second `Organizations` text node for its label. The old
unscoped `findByText('Organizations')` therefore became ambiguous. The test
now waits for the organization menu by role and continues to assert every
supplied organization entry.

## Changed `it()` case counts

| File                                                              | Cases added or changed   |
| ----------------------------------------------------------------- | ------------------------ |
| `components/shell/sidebar-context.test.ts`                        | 1 changed                |
| `components/shell/sidebar.test.tsx`                               | 1 added                  |
| `workspace/[orgSlug]/projects/projects/layout.test.tsx`           | 2 rewritten, 5 added (7) |
| `workspace/[orgSlug]/projects/issues/layout.test.tsx`             | 2 rewritten, 5 added (7) |
| `workspace/[orgSlug]/projects/projects/[projectId]/page.test.tsx` | 1 changed                |
| `workspace/[orgSlug]/projects/issues/[issueRef]/page.test.tsx`    | 1 changed                |
| `features/orgs/components/workspace-switchers.test.tsx`           | 1 changed                |

## Verification

Focused affected tests:

```text
Test Files  7 passed (7)
Tests  96 passed (96)
```

`pnpm --filter @876/console typecheck` completed with `tsc --noEmit` and no
diagnostics.

```text
$ pnpm --filter @876/console typecheck
$ tsc --noEmit
```

Completed with no TypeScript diagnostics.

```text
$ pnpm --filter @876/console lint
$ eslint
```

The full lint process ran to completion, but the terminal bridge did not retain
its final output. A scoped ESLint run over every file changed for this task
completed with no output or errors. The full-suite warning count could not be
re-read; the measured baseline is 21 warnings.

```text
$ pnpm --filter @876/console exec eslint <every task-changed source and test file>
(no output; exit 0)
```

```text
$ pnpm --filter @876/console test
$ vitest run

RUN  v4.1.11 /root/projects/876/apps/console

❯ src/features/billing/components/__tests__/subscription-billing-summary.advanced.test.tsx (12 tests | 1 failed)
  × produces stable snapshot for full billing summary (golden master)
Not implemented: navigation to another Document
```

The complete Console run finished after this streamed output. Its remaining
summary was not retained by the terminal bridge; the focused affected suite
passed (96/96), and the concurrently owned icon-key test subsequently passed
(5/5). The only observed full-suite failure was the explicitly out-of-scope
billing golden-master snapshot.

```text
$ node scripts/check-app-structure.mjs
app-structure: OK (console, billing, couriers, 876, enterprise, invoice, crm, projects)
```
