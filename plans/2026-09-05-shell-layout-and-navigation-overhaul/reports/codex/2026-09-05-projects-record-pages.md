# Projects record pages

## Changed files

- `apps/projects/src/components/shell/{sidebar,nav-link,nav-icons,sidebar-preferences,sidebar-motion}.tsx` — added the default-collapsed, persistent Projects rail; its expanded form exposes the same entries and spacing with labels. The icon registry resolves serializable navigation keys in the client and gives Projects, Issues, Board, and Labels distinct glyphs.
- `apps/projects/src/components/shell/{nav-config,mobile-nav}.tsx` — changed the Projects navigation keys to the new semantic icon registry and made mobile navigation use that same registry.
- `apps/projects/src/app/(app)/projects/[projectId]/**` — made the breadcrumb/page shell immediate, moved live project/issues reads behind a shape-matched Suspense boundary, and started the independent reads together.
- `apps/projects/src/app/(app)/issues/[issueRef]/**` — made the breadcrumb/page shell immediate, moved the issue/events reads behind a shape-matched Suspense boundary, passed events to the shared record view, and retained comments as their own nested boundary.
- `packages/projects-ui/src/project-detail.tsx` — replaced the duplicated back button and thin stacked fact cards with a record header, explicit description empty state, badge row, `DetailCardSection`/`DetailCardFacts` summary row, and labelled issues section.
- `packages/projects-ui/src/issue-detail.tsx` — rebuilt the issue record as a header, readable description column, `DetailCard*` facts sidebar, explicit empty states for assignment/due date/estimate/body/activity, and an accessible activity timeline.
- `apps/projects/src/components/shell/sidebar.test.tsx`, `packages/projects-ui/src/project-detail.test.tsx`, and `packages/projects-ui/src/issue-detail.test.tsx` — regression coverage for the rail and record views.

## Shared rail decision

The collapsible rail was **not** moved into `@876/ui`. The dispatch explicitly prohibited all `packages/ui/**` edits, and the current Console sidebar also owns contextual stack/back/slot behaviour that Projects does not need. Projects instead reuses Console's persistence and spring-motion mechanism locally, with an app-scoped localStorage key; this keeps the simple Projects rail from inheriting Console-only routing concepts.

## Compatibility

`ProjectDetail` no longer renders or reads `projectsHref`. Its prop remains optional and deprecated solely so the untouched Console caller at `apps/console/src/features/projects/components/project-detail-data.tsx` continues compiling under the dispatch's no-Console-edits boundary. A follow-up can remove that prop at that caller. (`projects-data.tsx` has a separate list-level `projectsHref` and is not part of this cleanup.)

## Tests added

22 new `it()` cases were added:

- `apps/projects/src/components/shell/sidebar.test.tsx`: 7
- `packages/projects-ui/src/project-detail.test.tsx`: 8
- `packages/projects-ui/src/issue-detail.test.tsx`: 7

No markdown-editor cases or implementation changes were added: the dispatch's hard boundary says not to edit `packages/ui/**`, while the requested editor and Markdown implementation/tests live there. This is the remaining handoff for the team member permitted to modify `packages/ui`.

## Verification

Passed:

- `pnpm --filter @876/projects typecheck`
- `pnpm --filter @876/projects test` — 10 files, 61 tests
- `pnpm --filter @876/projects-ui typecheck`
- `pnpm --filter @876/projects-ui test` — 9 files, 123 tests
- `pnpm --filter @876/ui typecheck`
- `pnpm --filter @876/ui test` — 28 files, 243 tests
- `git diff --check -- apps/projects packages/projects-ui`

Failures not mine / not safely editable in this dispatch:

- `pnpm --filter @876/projects lint` stops before linting app sources because its ESLint configuration looks for `packages/projects/pages` or `packages/projects/src/pages`.
- `node scripts/check-app-structure.mjs` reports the concurrent Console file `apps/console/src/components/shell/nav-icons.test.ts` for `components-imports-features`.
- Console test execution reported pre-existing/concurrent failures in billing snapshot coverage, workspace switchers, Console sidebar/context tests, and Projects Console route/layout tests. Console files were explicitly out of scope and not changed here. The Console typecheck began successfully but could not be allowed to finish within the foreground command window.

## Design decisions

- Record facts are intentionally one definition-list row rather than three decorative cards; the record header is the single primary surface and the issues table remains a separate data surface.
- Assignee, due date, and estimate remain display-only with explicit empty states. No picker, mutation, or integration work was introduced.
