# Brief: consolidate Console's `/projects` path helpers onto `workspaceBase()`

## Context

Console has two file-for-file-identical renderings of the same Projects UI:

- `apps/console/src/app/(app)/projects/**` — Console's own platform-tenant
  Projects (no `orgSlug` in the URL).
- `apps/console/src/app/(app)/workspace/[orgSlug]/projects/**` — the same
  screens mounted inside an organization's workspace.

Both correctly share `apps/console/src/features/projects/components` for
rendering. What has NOT converged is how each tree computes its own base
href:

- The workspace tree computes every href with
  `workspaceBase(orgSlug, 'projects')`, imported from
  `apps/console/src/features/orgs/app-workspaces.ts`. `workspaceBase` returns
  a string like `/workspace/<orgSlug>/projects`.
- The platform tree instead has its own local helpers in
  `apps/console/src/app/(app)/projects/_lib/`:
  - `base.ts` — exports `requirePlatformProjectsOrgId()` (server-only; calls
    `getPlatformOrganization()` from `@/lib/platform-org` and `notFound()`s if
    it's null) and the constant `PLATFORM_PROJECTS_BASE = '/projects'`.
  - `paths.ts` — currently just re-exports/duplicates
    `PLATFORM_PROJECTS_BASE = '/projects'` (it exists as a separate file
    because `base.ts` is `server-only` and some importers are client
    components that can't import a `server-only` module even for a plain
    string constant).

This is two mechanisms doing the same conceptual job (base href for the
current Projects context) with no shared abstraction. This brief asks you to
consolidate them WITHOUT changing behavior or URLs.

## What "consolidate" means here — read carefully before starting

Do **not** delete `PLATFORM_PROJECTS_BASE` or force the platform tree to call
`workspaceBase()` with a fake `orgSlug` — the platform tree genuinely has no
`orgSlug` in its URL and must keep producing `/projects/...` hrefs, not
`/workspace/undefined/projects/...`. The fix is architectural, not textual:

1. Read `apps/console/src/features/orgs/app-workspaces.ts` in full,
   especially `workspaceBase()` (around line 226) and its surrounding types,
   to understand the existing convention for a "base href for this Projects
   context" value.
2. Design ONE shared helper (or a small typed union) that both trees can call
   to get their base href, so a future reader sees one mechanism, not two.
   A reasonable shape (adjust based on what you find in `app-workspaces.ts`):

   ```ts
   // apps/console/src/features/orgs/app-workspaces.ts (or wherever the
   // existing workspaceBase lives — keep it in the same file/module family)
   export function projectsBase(orgSlug: string | null): string {
     return orgSlug ? workspaceBase(orgSlug, 'projects') : '/projects'
   }
   ```

   The exact name and signature are your call — the constraint is that BOTH
   `apps/console/src/app/(app)/projects/**` and
   `apps/console/src/app/(app)/workspace/[orgSlug]/projects/**` end up
   calling the same exported function/module for their base href, instead of
   the platform tree keeping a private duplicate.
3. `requirePlatformProjectsOrgId()` in `_lib/base.ts` is a DIFFERENT concern
   (resolving Console's own platform-tenant org id for server components) —
   do not conflate it with the base-href helper. It can stay where it is, or
   move if there's an obviously better home, but do not merge its
   responsibility into the new base-href helper.
4. Once the shared helper exists, update every file that currently imports
   `PLATFORM_PROJECTS_BASE` from `./_lib/paths.ts` (or `./_lib/base.ts`) to
   use the new shared helper instead. Find them with:

   ```bash
   grep -rln "PLATFORM_PROJECTS_BASE" apps/console/src/app/\(app\)/projects
   ```

   As of this brief that's 8 files:
   `page.tsx`, `issues/layout.tsx`, `issues/new/page.tsx`, `board/page.tsx`,
   `issues/_components/issues-toolbar.tsx`, `issues/[issueRef]/page.tsx`,
   `projects/layout.tsx`, `projects/_components/projects-toolbar.tsx`,
   `projects/new/page.tsx`, `projects/[projectId]/page.tsx` (grep again —
   this list may be stale by the time you run it).
5. Delete `_lib/paths.ts` once nothing imports `PLATFORM_PROJECTS_BASE` from
   it. If `_lib/base.ts` no longer needs to export the constant either
   (because the constant now lives in the shared helper's module), remove it
   from there too — but do NOT remove `requirePlatformProjectsOrgId` from
   `base.ts`.
6. If a client component currently imports the constant from `_lib/paths.ts`
   specifically to dodge `server-only` on `_lib/base.ts` (the comment in
   `paths.ts` explains why it's a separate file), make sure wherever the
   constant/helper now lives is importable from a client component. If the
   new shared function needs to stay server-only for some reason, you'll need
   the same client-safe/server-only split — read the existing comment in
   `apps/console/src/app/(app)/projects/_lib/paths.ts` before deciding.

## Do NOT touch

These files belong to another agent mid-edit in this same working tree.
Touching them will cause a collision:

```
apps/console/src/lib/operator-permissions.ts
apps/console/src/lib/permissions.ts
apps/console/src/lib/auth/access-context.ts
apps/console/src/features/orgs/workspace-contexts.ts
apps/console/src/app/(app)/@sidebar/workspace/[orgSlug]/[...section]/page.tsx
apps/console/src/app/(app)/@mobilenav/workspace/[orgSlug]/[...section]/page.tsx
```

Your scope is limited to:

```
apps/console/src/app/(app)/projects/**
apps/console/src/app/(app)/workspace/[orgSlug]/projects/**
apps/console/src/features/orgs/app-workspaces.ts   (adding one new export only)
```

Do not touch `workspaceBase()`'s existing signature or behavior — only add
alongside it. Do not touch anything under `apps/crm-api`, `packages/crm`, or
`apps/console/src/app/(app)/requests/**` — unrelated, already landed work.

## Verification (run all, report exact output)

```bash
pnpm --filter @876/console typecheck
pnpm --filter @876/console lint
pnpm --filter @876/console exec vitest run 'src/app/(app)/projects' 'src/app/(app)/workspace' --maxWorkers=1
node scripts/check-app-structure.mjs
npx prettier --write <every file you changed>
```

`pnpm --filter @876/console typecheck` will show PRE-EXISTING failures in
`src/features/orgs/workspace-contexts.test.ts` (unrelated agent's in-progress
work — "Expected 3 arguments, but got 2"). That is not yours to fix; confirm
your own changed files produce no NEW typecheck errors by checking the error
list does not grow beyond that pre-existing file.

Do not use `eslint-disable`, `as any`, or `@ts-ignore` to satisfy any check.

## Report

Write `plans/2026-09-03-console-workspace-and-sidebar/reports/codex/2026-09-04-projects-path-helper-consolidation.md`
listing: every file changed and why, the exact verification command output,
and any judgment call you made about the shared helper's name/shape.
