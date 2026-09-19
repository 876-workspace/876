# Project detail phone rebuild

## Changed

- `packages/projects-ui/src/project-detail.tsx`: added phone-only header,
  metadata, fact list, and compact work-stat rendering while retaining the
  existing desktop card trees behind `hidden sm:block`.
- `packages/projects-ui/src/mobile-list.tsx`: added the reusable
  `MobileFactList` and `MobileFact` presentation primitives. Null and empty
  values render as an em dash.
- `apps/projects/src/app/(app)/projects/[projectId]/_components/project-detail-data.tsx`:
  moved the phone follow control into the detail header and put template/clone
  actions in a phone overflow menu; the prior desktop action render remains
  `sm` and up.
- `apps/projects/src/features/projects/components/work-breakdown.tsx`: added a
  phone-only task-list view, suppresses it when all work is unlisted, and makes
  phone issue rows links with mono identifiers and two-line titles. The desktop
  card remains available at `sm` and up; its heading now uses the section title
  treatment.
- Tests: added `mobile-list.test.tsx`, expanded `project-detail.test.tsx`, and
  added phone-breakdown cases to the Projects app test. Existing desktop tests
  now scope their assertions to the desktop branch because responsive branches
  are both present in jsdom.

## Test count

15 new `it()` cases: 7 project-detail, 5 mobile-list, and 3 work-breakdown.

## Verification

```text
$ pnpm --filter @876/projects-ui typecheck
$ tsc --noEmit
```

```text
$ pnpm --filter @876/projects-ui exec vitest run src/project-detail.test.tsx src/mobile-list.test.tsx --reporter=dot
Test Files  2 passed (2)
Tests  22 passed (22)
```

```text
$ pnpm --filter @876/projects typecheck
$ tsc --noEmit
```

```text
$ pnpm --filter @876/projects test
Test Files  45 passed (45)
Tests  324 passed (324)
```

`pnpm --filter @876/projects-ui test` was launched twice after the test fixes,
but this execution harness returned at its 30-second command window before the
suite emitted a final summary. The targeted UI tests above cover the changed UI
package files and passed. `git diff --check` passed.

## Notes

`876-page-title-lg` did not exist when this work ran (repository search found
only the parallel-phase brief), so the requested fallback
`text-[2rem] leading-tight font-bold tracking-tight` is in use.

No device/browser visual pass was available in this environment. Nothing is
left intentionally undone, and no commit was created.
