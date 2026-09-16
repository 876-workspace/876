# Projects path-helper consolidation

## Decision

Added `projectsBase(orgSlug: string | null)` beside `workspaceBase()` in
`apps/console/src/features/orgs/app-workspaces.ts`. A real slug delegates to
`workspaceBase(orgSlug, 'projects')`; `null` returns `/projects`. This keeps
the platform context explicit without inventing a fake slug, retains
`requirePlatformProjectsOrgId()` as a separate server-only concern, and keeps
the helper safe to import from client components.

## Changed files

- `apps/console/src/features/orgs/app-workspaces.ts` — added the shared
  `projectsBase()` export.
- `apps/console/src/app/(app)/projects/_lib/paths.ts` — deleted the now-unused
  platform-only constant module.
- `apps/console/src/app/(app)/projects/page.tsx` — uses the shared platform
  base.
- `apps/console/src/app/(app)/projects/board/page.tsx` — uses the shared
  platform base.
- `apps/console/src/app/(app)/projects/issues/layout.tsx` — uses the shared
  platform base.
- `apps/console/src/app/(app)/projects/issues/new/page.tsx` — uses the shared
  platform base for links, session return path, and form.
- `apps/console/src/app/(app)/projects/issues/[issueRef]/page.tsx` — uses the
  shared platform base.
- `apps/console/src/app/(app)/projects/issues/_components/issues-toolbar.tsx`
  — uses the client-safe shared platform base.
- `apps/console/src/app/(app)/projects/projects/layout.tsx` — uses the shared
  platform base.
- `apps/console/src/app/(app)/projects/projects/new/page.tsx` — uses the
  shared platform base.
- `apps/console/src/app/(app)/projects/projects/[projectId]/page.tsx` — uses
  the shared platform base.
- `apps/console/src/app/(app)/projects/projects/_components/projects-toolbar.tsx`
  — uses the client-safe shared platform base.
- `apps/console/src/app/(app)/workspace/[orgSlug]/projects/page.tsx` — uses
  the shared workspace base.
- `apps/console/src/app/(app)/workspace/[orgSlug]/projects/board/page.tsx` —
  uses the shared workspace base.
- `apps/console/src/app/(app)/workspace/[orgSlug]/projects/issues/layout.tsx`
  — uses the shared workspace base.
- `apps/console/src/app/(app)/workspace/[orgSlug]/projects/issues/new/page.tsx`
  — uses the shared workspace base.
- `apps/console/src/app/(app)/workspace/[orgSlug]/projects/issues/[issueRef]/page.tsx`
  — uses the shared workspace base.
- `apps/console/src/app/(app)/workspace/[orgSlug]/projects/issues/_components/issues-toolbar.tsx`
  — uses the client-safe shared workspace base.
- `apps/console/src/app/(app)/workspace/[orgSlug]/projects/projects/layout.tsx`
  — uses the shared workspace base.
- `apps/console/src/app/(app)/workspace/[orgSlug]/projects/projects/new/page.tsx`
  — uses the shared workspace base.
- `apps/console/src/app/(app)/workspace/[orgSlug]/projects/projects/[projectId]/page.tsx`
  — uses the shared workspace base.
- `apps/console/src/app/(app)/workspace/[orgSlug]/projects/projects/_components/projects-toolbar.tsx`
  — uses the client-safe shared workspace base.
- `plans/2026-09-03-console-workspace-and-sidebar/reports/codex/2026-09-04-projects-path-helper-consolidation.md`
  — records this implementation, decision, and verification evidence.

## Verification output

`pnpm --filter @876/console typecheck` (exit 2; only the documented
pre-existing failures):

```text
$ tsc --noEmit
src/features/orgs/workspace-contexts.test.ts(28,18): error TS2554: Expected 3 arguments, but got 2.
src/features/orgs/workspace-contexts.test.ts(34,7): error TS2554: Expected 3 arguments, but got 2.
src/features/orgs/workspace-contexts.test.ts(40,29): error TS2554: Expected 3 arguments, but got 2.
src/features/orgs/workspace-contexts.test.ts(59,29): error TS2554: Expected 3 arguments, but got 2.
src/features/orgs/workspace-contexts.test.ts(74,29): error TS2554: Expected 3 arguments, but got 2.
src/features/orgs/workspace-contexts.test.ts(84,29): error TS2554: Expected 3 arguments, but got 2.
src/features/orgs/workspace-contexts.test.ts(92,26): error TS2554: Expected 3 arguments, but got 2.
/root/projects/876/apps/console:
[ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL] @876/console@0.1.0 typecheck: `tsc --noEmit`
Exit status 2
```

`pnpm --filter @876/console lint`:

```text
$ eslint
```

`pnpm --filter @876/console exec vitest run 'src/app/(app)/projects' 'src/app/(app)/workspace' --maxWorkers=1`:

```text

 RUN  v4.1.11 /root/projects/876/apps/console


 Test Files  10 passed (10)
      Tests  23 passed (23)
   Start at  03:18:38
   Duration  25.58s (transform 1.30s, setup 1.98s, import 7.55s, tests 3.42s, environment 10.41s)
```

`node scripts/check-app-structure.mjs`:

```text
app-structure: OK (console, billing, couriers, 876, enterprise, invoice, crm, projects)
```

`npx prettier --write <every changed source file>`:

```text
apps/console/src/features/orgs/app-workspaces.ts 235ms (unchanged)
apps/console/src/app/(app)/projects/board/page.tsx 38ms (unchanged)
apps/console/src/app/(app)/projects/issues/[issueRef]/page.tsx 29ms (unchanged)
apps/console/src/app/(app)/projects/issues/_components/issues-toolbar.tsx 10ms (unchanged)
apps/console/src/app/(app)/projects/issues/layout.tsx 26ms (unchanged)
apps/console/src/app/(app)/projects/issues/new/page.tsx 35ms (unchanged)
apps/console/src/app/(app)/projects/page.tsx 19ms (unchanged)
apps/console/src/app/(app)/projects/projects/[projectId]/page.tsx 17ms (unchanged)
apps/console/src/app/(app)/projects/projects/_components/projects-toolbar.tsx 8ms (unchanged)
apps/console/src/app/(app)/projects/projects/layout.tsx 11ms (unchanged)
apps/console/src/app/(app)/projects/projects/new/page.tsx 16ms (unchanged)
apps/console/src/app/(app)/workspace/[orgSlug]/projects/board/page.tsx 16ms
apps/console/src/app/(app)/workspace/[orgSlug]/projects/issues/[issueRef]/page.tsx 27ms (unchanged)
apps/console/src/app/(app)/workspace/[orgSlug]/projects/issues/_components/issues-toolbar.tsx 7ms (unchanged)
apps/console/src/app/(app)/workspace/[orgSlug]/projects/issues/layout.tsx 16ms
apps/console/src/app/(app)/workspace/[orgSlug]/projects/issues/new/page.tsx 22ms (unchanged)
apps/console/src/app/(app)/workspace/[orgSlug]/projects/page.tsx 16ms
apps/console/src/app/(app)/workspace/[orgSlug]/projects/projects/[projectId]/page.tsx 15ms (unchanged)
apps/console/src/app/(app)/workspace/[orgSlug]/projects/projects/_components/projects-toolbar.tsx 10ms (unchanged)
apps/console/src/app/(app)/workspace/[orgSlug]/projects/projects/layout.tsx 4ms (unchanged)
apps/console/src/app/(app)/workspace/[orgSlug]/projects/projects/new/page.tsx 8ms
```

`npx prettier --write plans/2026-09-03-console-workspace-and-sidebar/reports/codex/2026-09-04-projects-path-helper-consolidation.md`:

```text
plans/2026-09-03-console-workspace-and-sidebar/reports/codex/2026-09-04-projects-path-helper-consolidation.md 97ms (unchanged)
```

## Maintainability review

No significant structural finding: the change deletes the duplicate
platform-only path module, preserves the independent platform-organization
lookup, introduces no casts or new shared types, and uses the existing
workspace path owner rather than adding another routing layer.
