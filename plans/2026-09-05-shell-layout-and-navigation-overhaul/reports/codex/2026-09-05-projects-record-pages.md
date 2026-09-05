# Projects record pages

## Status

The Projects record-page work is now complete in code. The original record-page
commit landed the full-page project/issue redesign and Suspense boundaries; the
closeout commit `0ed9cb34` completed the remaining shared Markdown/comment editor
work. Final merged-branch tests and browser acceptance are still tracked in
`todo.md` C4/C5 and must not be inferred from the phase-level results below.

## Changed files — record pages

- `apps/projects/src/components/shell/{sidebar,nav-link,nav-icons,sidebar-preferences,sidebar-motion}.tsx` — added the default-collapsed, persistent Projects rail; its expanded form exposes the same entries and spacing with labels. The icon registry resolves serializable navigation keys in the client and gives Projects, Issues, Board, and Labels distinct glyphs.
- `apps/projects/src/components/shell/{nav-config,mobile-nav}.tsx` — changed the Projects navigation keys to the semantic icon registry and made mobile navigation use that same registry.
- `apps/projects/src/app/(app)/projects/[projectId]/**` — made the breadcrumb/page shell immediate, moved live project/issues reads behind a shape-matched Suspense boundary, and started the independent reads together.
- `apps/projects/src/app/(app)/issues/[issueRef]/**` — made the breadcrumb/page shell immediate, moved issue/events reads behind a shape-matched Suspense boundary, passed events to the shared record view, and retained comments as their own nested boundary.
- `packages/projects-ui/src/project-detail.tsx` — replaced the duplicated back button and thin stacked fact cards with a record header, explicit description empty state, badge row, `DetailCardSection`/`DetailCardFacts` summary row, and labelled issues section.
- `packages/projects-ui/src/issue-detail.tsx` — rebuilt the issue record as a header, readable description column, `DetailCard*` facts sidebar, explicit empty states for assignment/due date/estimate/body/activity, and an accessible activity timeline.

## Changed files — editor closeout

- `packages/ui/src/components/markdown-editor.tsx` — redesigned the lightweight shared Markdown composer with token-based light/dark surfaces, a focus-within ring, explicit Write/Preview active state, responsive toolbar wrapping, semantic icons where the existing registry provides them, and preserved keyboard shortcuts/controlled-value behavior.
- `packages/projects-ui/src/issue-comments.tsx` — wrapped comment create/edit flows in coherent labelled composer surfaces, kept errors inline with their draft, and used the same shared editor treatment for create and edit.
- `packages/ui/src/components/markdown-editor.contract.test.tsx` — added focused visual/accessibility-contract regression coverage.
- `packages/projects-ui/src/issue-comments-editor.test.tsx` — added focused create/edit composer and draft-preservation coverage.

The comment storage/transport contract remains Markdown text. `@876/editor` is
Editor.js-based and was inspected as related infrastructure, but was deliberately
not substituted into the comment flow because that would change the persisted
content contract for no product requirement.

## Shared rail decision

The collapsible rail was not moved into `@876/ui`. Console's sidebar owns
context-stack/back/slot behavior that Projects does not need. Projects reuses the
persistence and motion pattern locally with an app-scoped localStorage key so the
simple product rail does not inherit Console-only routing concepts.

## Compatibility cleanup

`ProjectDetail` no longer renders or accepts a `projectsHref` prop. Hosts own the
record's back/breadcrumb affordance. The temporary deprecated prop and the final
Console caller were removed during closeout instead of carrying compatibility
residue into the final integration PR. List-level `projectsHref` props used by
project list/table surfaces are unrelated and remain intact.

## Tests added by this phase

The original record-page work added 22 `it()` cases:

- `apps/projects/src/components/shell/sidebar.test.tsx`: 7
- `packages/projects-ui/src/project-detail.test.tsx`: 8
- `packages/projects-ui/src/issue-detail.test.tsx`: 7

The editor closeout adds 8 focused cases:

- `packages/ui/src/components/markdown-editor.contract.test.tsx`: 5
- `packages/projects-ui/src/issue-comments-editor.test.tsx`: 3

Total explicit new cases tracked for Phase 4/closeout: **30**.

The pre-existing `packages/ui/src/components/markdown-editor.test.tsx` suite is
retained unchanged and continues to define formatting insertion, keyboard
shortcut, controlled-value, preview, and disabled behavior. C4 must prove it
still passes with the new presentation.

## Verification recorded by the original record-page phase

Passed at that point in the branch:

- `pnpm --filter @876/projects typecheck`
- `pnpm --filter @876/projects test` — 10 files, 61 tests
- `pnpm --filter @876/projects-ui typecheck`
- `pnpm --filter @876/projects-ui test` — 9 files, 123 tests
- `pnpm --filter @876/ui typecheck`
- `pnpm --filter @876/ui test` — 28 files, 243 tests
- `git diff --check -- apps/projects packages/projects-ui`

Historical issues recorded by that dispatch:

- `pnpm --filter @876/projects lint` stopped before linting app sources because its ESLint configuration looked for a pages directory that was not present.
- `node scripts/check-app-structure.mjs` reported a concurrent Console nav-icon test at that time.
- Concurrent Console tests had unrelated failures while other phases were still editing the branch.

Those results are historical phase evidence only. They do not certify the current
closeout head. The required final matrix is listed in `todo.md` C4.

## Design decisions

- Record facts remain one definition-list summary row rather than three decorative cards; the record header is the primary surface and the issues table is the separate data surface.
- Assignee, due date, and estimate remain display-only with explicit empty states. No picker, mutation, or CRM integration work was introduced.
- Comment create/edit errors remain in-page and preserve drafts; they do not replace or break the record surface.
- The shared Markdown editor remains a design-system primitive; Projects owns only product composition and host callbacks remain in the Projects app.

## Remaining acceptance

Phase 4 is complete in code but not yet finally accepted. The integration closeout
still requires:

1. the full package/app verification matrix in `todo.md` C4;
2. browser checks of project/issue records and the comment editor in light/dark
   at the required desktop widths in `todo.md` C5;
3. the production role repair and real comment create/edit/delete smoke test in
   `todo.md` C3/C5.
