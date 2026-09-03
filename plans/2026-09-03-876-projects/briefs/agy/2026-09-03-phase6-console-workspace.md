# Brief — Phase 6: Console operator workspace for 876 Projects

You are implementing **Phase 6** of 876 Projects. Read
`plans/2026-09-03-876-projects/plan.md` first — it is the authority on scope and
the data model.

**Repository root:** `/root/projects/876`
**Branch:** `feat/876-projects` (already checked out — do NOT create, switch, or
merge any branch, and do NOT commit. The orchestrator commits.)

**Depends on Phase 3.** `packages/projects` must already exist and export
`create876ProjectsOperatorClient` from `@876/projects/operator`. If it does not,
stop and report that rather than inventing a client.

---

## 0. The single most important instruction

**Copy how 876 CRM is wired into Console.** It is the reference for every
convention here. Read these before writing anything:

| Read this | To learn |
| --- | --- |
| `apps/console/src/features/orgs/app-workspaces.ts` | the workspace registry, its icon-key contract, and the CRM entry |
| `apps/console/src/lib/services/crm.ts` | the operator client module shape |
| `apps/console/src/app/(app)/orgs/[slug]/workspace/crm/layout.tsx` | the three-line workspace layout |
| `apps/console/src/app/(app)/orgs/[slug]/workspace/crm/requests/(list)/page.tsx` | a list page: toolbar, status filter, Suspense placement |
| `apps/console/src/app/(app)/orgs/[slug]/workspace/crm/requests/[requestId]/` | a **detail** route beside its list |
| `apps/console/src/app/(app)/orgs/[slug]/workspace/_components/app-workspace-layout.tsx` | `createWorkspaceLayout` |

Where this brief and CRM disagree, **this brief wins**. Where this brief is
silent, **do exactly what CRM does.**

---

## 1. What you are building

The operator view of an organization's 876 Projects workspace, at
`/orgs/[slug]/workspace/projects`, plus the shared `packages/projects-ui`
package that holds the screens Console and the standalone app will both render.

---

## 2. Registry entry

In `apps/console/src/features/orgs/app-workspaces.ts`:

1. Add `'projects'` and `'issues'` to `WorkspaceIconKey` **only if** they are not
   already present. Reuse an existing key where one fits rather than inventing a
   near-duplicate.
2. Add this entry to `APP_WORKSPACES`, after the CRM entry:

```ts
{
  appSlug: '876-projects',
  key: 'projects',
  label: '876 Projects',
  summary: 'Projects, issues, and the board this organization plans on.',
  iconKey: 'requests',
  sections: [
    { label: 'Overview', segment: '', iconKey: 'dashboard', exact: true },
    { label: 'Projects', segment: 'projects', iconKey: 'requests' },
    { label: 'Issues', segment: 'issues', iconKey: 'requests' },
    { label: 'Board', segment: 'board', iconKey: 'items' },
    { label: 'Labels', segment: 'labels', iconKey: 'categories' },
  ],
},
```

The file is **plain data** that crosses the RSC → client boundary. No icon
components, no functions — string keys only.

---

## 3. The operator client module

Create `apps/console/src/lib/services/projects.ts`, mirroring
`apps/console/src/lib/services/crm.ts`:

```ts
import 'server-only'

import { create876ProjectsOperatorClient } from '@876/projects/operator'
```

Read `PROJECTS_API_URL` and `PROJECTS_INTERNAL_KEY`. Export a `createProjects(requestId?)`
factory and a `projects` module singleton, exactly as CRM does. Do not construct
the client eagerly at module import time in a way that throws when the secret is
absent — match CRM's lifetime handling.

Add both variables to `apps/console/.env.example`. `PROJECTS_INTERNAL_KEY` is a
required secret; do NOT mark it optional.

---

## 4. Routes

Under `apps/console/src/app/(app)/orgs/[slug]/workspace/projects/`:

| Path | What it renders |
| --- | --- |
| `layout.tsx` | exactly `export default createWorkspaceLayout('projects')` |
| `page.tsx` | Overview — counts by status, recently updated issues |
| `projects/(list)/page.tsx` | project list, status-filtered |
| `projects/[projectId]/page.tsx` | **project detail** |
| `issues/(list)/page.tsx` | issue list, status-filtered |
| `issues/[issueRef]/page.tsx` | **issue detail**, keyed by identifier (`CONSOLE-12`) |
| `board/page.tsx` | issues grouped by status in columns |
| `labels/page.tsx` | label list |

**Ship the detail routes with the lists.** PR #463 shipped Console workspace
list pages with no `[id]` routes, so every row click 404'd
(`plans/2026-09-03-console-workspace-detail-routes/`). Do not repeat that. A row
that links somewhere must have a route at the other end.

---

## 5. Loading and layout rules — these are enforced by review

1. **Chrome is never a skeleton.** `ResourceToolbar`, the status-filter heading,
   the Add button and a table's `<thead>` render immediately, on hard load and
   on client navigation. Only rows shimmer.
2. A page component is **synchronous** where possible; `await` the data inside
   the component behind `<Suspense>`, not at the top of the page.
3. A table fallback is a `DataTableSkeleton` with that table's **real columns**,
   kept in a `*-skeleton-columns.ts` beside the table. Never a bare
   `<Skeleton className="h-96 w-full" />`.
4. Do **not** add a `loading.tsx` above a route group that has its own.
5. The section heading is a `StatusFilterHeading` passed as `ResourceToolbar`'s
   `titleFilter`; resolve the status server-side from `searchParams` and **pass
   it into the list call**. Never fetch unfiltered and filter rows in the page —
   that silently breaks pagination.
6. No wordy `<p>` under a heading restating the table below it.
7. No green buttons. The Add affordance is `primaryVariant="info"`.

---

## 6. `packages/projects-ui`

Screens more than one host will render live in `packages/projects-ui`, following
`.claude/rules/shared-product-ui.md`. Model it on an existing `@876/*-ui`
package.

- It owns **presentation only**: list tables, the board, the issue record card,
  empty and loading states.
- It must **not** import a service client, a session, a route guard, or
  `server-only`. Hosts pass plain data, hrefs, and callbacks.
- It must **not** branch on the host name.
- Register it in `scripts/shared-ui-packages.mjs` — **not** in each app's
  `transpilePackages`.

If a screen has exactly one host today, build it app-locally in
`apps/console/src/features/projects/` and leave it out of the package. Do not
create a package entry for a single caller.

---

## 7. Authorization

Every route in the workspace is operator-tier. Console permission checks and
audit writes follow `.claude/rules/access-tiers.md`: a route handler calls
`requireConsolePermission` **before** the operator client is touched, and any
mutation writes an audit event. Read `apps/console`'s existing CRM workspace
routes for the exact call shape.

The permission keys already exist in `packages/core/src/access/catalogs.ts`
under `876-projects` — `dashboard.view`, `projects.view`, `issues.view`,
`labels.view`, and so on. Use those keys. Do **not** add new ones.

---

## 8. Do NOT

- Do NOT create, switch, rebase, merge, or delete any git branch.
- Do NOT run `git commit`, `git add`, or `git push`.
- Do NOT run `pnpm install` or edit `pnpm-lock.yaml`. Report a needed dependency
  instead; the orchestrator owns the lockfile.
- Do NOT modify `apps/projects-api/` or `packages/projects/`.
- Do NOT add a `proxy.ts` or `middleware.ts`.
- Do NOT use a server action. Browser mutations go through a thin authorized
  route handler under `apps/console/src/app/api/` and the typed browser client.
- Do NOT write `eslint-disable`, `as any`, `@ts-ignore`, or `@ts-expect-error`.
- Do NOT add a permission key, feature flag, or role.
- Do NOT ship a list page whose rows link to a route you did not create.
- Do NOT write a `README.md`.

---

## 9. Tests

Minimum **16** `it()` cases. Required:

- the registry entry exists with `appSlug: '876-projects'` and its five sections
  in order;
- every section's `iconKey` is a declared `WorkspaceIconKey`;
- the registry stays structurally cloneable (no functions or components);
- every section segment has a matching route file on disk — walk
  `src/app/(app)/orgs/[slug]/workspace/projects/` and assert it, so a section
  can never point at a 404;
- each list page renders its toolbar and column headers while data is pending;
- the status filter is threaded into the client call
  (`toHaveBeenCalledWith` including the status);
- an unknown status resolves to `all`;
- a failed list keeps the toolbar mounted and renders an `AppError` notice;
- a route denies without the Console permission and the operator client is
  `not.toHaveBeenCalled()`.

Assert complete shapes and exact call arguments. `expect(x).toBeDefined()` as a
test's only assertion is a failed test.

---

## 10. Verify before you report

```bash
cd /root/projects/876
pnpm --filter @876/console typecheck
pnpm --filter @876/console lint
pnpm --filter @876/console test
node scripts/check-app-structure.mjs
pnpm check:transpile
```

Report the real output. If a command is unavailable to you, say so plainly
rather than claiming it passed.

---

## 11. Report

Write to
`plans/2026-09-03-876-projects/reports/agy/2026-09-03-phase6-console-workspace.md`:

1. A table of every file created or changed, with a one-line reason.
2. The **counted** number of `it()` cases per test file.
3. The exact output of each command in §10, or an explicit statement that you
   could not run it.
4. Any decision this brief did not settle, and what you chose.
5. Anything you could not do, and why. A truthful "not done" is worth far more
   than a confident claim that turns out to be false.
