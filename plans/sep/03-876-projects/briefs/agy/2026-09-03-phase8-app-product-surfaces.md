# Brief — Phase 8: the 876 Projects product surfaces in `apps/projects`

You are implementing **Phase 8**: the Projects, Issues, Board and Labels screens
in the standalone app. Read `plans/2026-09-03-876-projects/plan.md` first.

**Repository root:** `/root/projects/876`
**Branch:** `feat/876-projects` (already checked out — do NOT create, switch, or
merge any branch, and do NOT commit. The orchestrator commits.)

---

## 0. The single most important instruction

**The presentational components already exist. Do not write new ones and do not
copy them.** `packages/projects-ui` exports `project-list`, `project-detail`,
`issue-list`, `issue-detail`, `issue-board`, `labels-list`, `status-badges` and
`priority-badges`. Your job is to give them data, hrefs and callbacks.

If a component cannot express something you need, **add a prop to it** — never
fork it into the app (`.claude/rules/shared-product-ui.md`).

Read these first:

| Read this | To learn |
| --- | --- |
| `packages/projects-ui/src/*.tsx` | the exact props each component takes |
| `apps/projects/src/app/(app)/page.tsx` | the page container and guard pattern |
| `apps/projects/src/app/(app)/settings/users/` | a list/detail section already wired |
| `apps/projects/src/lib/services/projects.ts` | the host's service module |
| `apps/projects/src/components/shell/nav-config.ts` | the navigation registry |
| `apps/projects/src/lib/modules/catalog.ts` | the module catalog and its `available` flags |
| `packages/projects/src/index.ts` | the **session** client entrypoint |
| `apps/console/src/app/(app)/orgs/[slug]/workspace/projects/` | the same screens already wired for the operator tier |

---

## 1. Caller authority — read this twice

The standalone app is used by a **signed-in human**, so it calls the
**`session`** entrypoint of `@876/projects`, not `operator`.

`apps/projects/src/lib/services/projects.ts` currently exposes an operator
client, which was correct for scaffolding and is **wrong for these screens**.
Add a request-scoped session factory beside it and use that. The session/access
token belongs to one request, so it must never be a module singleton
(`.claude/rules/sdk-conventions.md` → client lifetime).

Do not pass `PROJECTS_INTERNAL_KEY` from a page.

---

## 2. Routes to build

Under `apps/projects/src/app/(app)/`:

| Path | Renders |
| --- | --- |
| `projects/(list)/page.tsx` | `project-list`, status-filtered |
| `projects/[projectId]/page.tsx` | `project-detail` |
| `projects/new/page.tsx` | create form |
| `issues/(list)/page.tsx` | `issue-list`, status-filtered |
| `issues/[issueRef]/page.tsx` | `issue-detail`, resolved by identifier (`CONSOLE-12`) |
| `issues/new/page.tsx` | create form |
| `board/page.tsx` | `issue-board`, issues grouped by status |
| `labels/page.tsx` | `labels-list` |

**Every row that links must have a route at the other end.** A list whose rows
404 is the defect PR #463 shipped; do not repeat it.

---

## 3. Navigation, guards and the module catalog must move together

These four things are bound and are checked by an existing test:

1. add each destination to `src/components/shell/nav-config.ts` with its
   `requires.permission` — `projects.view`, `issues.view`, `labels.view`, and
   the board under `issues.view`;
2. guard each destination route with `requireAppPermission('<same key>')` from
   `@/lib/auth/require-projects-context`;
3. flip the matching entries in `src/lib/modules/catalog.ts` to
   `available: true`;
4. update `src/components/shell/nav-config.test.ts` and
   `src/lib/modules/catalog.test.ts` expectations.

`nav-config.test.ts` reads the guard **out of the destination file's source**
and compares it to the registry, so a mismatch fails the suite. Fix the route or
the registry — never weaken the test.

---

## 4. Mutations

**No server actions.** A client mutation goes through a thin route handler under
`src/app/api/<resource>/`, which authorizes the session, then calls the owning
client once and returns the standard envelope. No business logic in the handler.
Call it from the app's typed browser client under `src/lib/client/`, following
the existing `onboarding` and `app-memberships` resources.

---

## 5. Loading and layout rules — enforced by review

1. **Chrome is never a skeleton.** The `ResourceToolbar`, the status-filter
   heading, the Add button and a table's `<thead>` render immediately. Only rows
   shimmer.
2. Keep the page component synchronous where possible; `await` the data inside a
   component behind `<Suspense>`, not at the top of the page.
3. A table fallback is a `DataTableSkeleton` with that table's **real columns**,
   kept in a `*-skeleton-columns.ts` beside it.
4. The section heading is a `StatusFilterHeading` passed as `ResourceToolbar`'s
   `titleFilter`. Resolve the status server-side from `searchParams` and **pass
   it into the list call** — never fetch unfiltered and filter rows in the page,
   which silently breaks pagination.
5. Create/edit are **routes, not dialogs**. Dialogs are for destructive
   confirmations only.
6. Fields use `FormRow`; guidance goes in its `hint` tooltip, never a `<p>` under
   the control.
7. One page-title size: `876-page-title`. Add button is `primaryVariant="info"`.
   **No green buttons.** No explanatory paragraph under a heading.

---

## 6. Errors

Expected failures stay values. Render `AppError` at the smallest useful scope and
**keep the toolbar and table shell mounted** — a failed dataset must not own the
page, and an empty table during a failure must carry a visible notice so it is
not mistaken for "no records". Never `throw new Error(result.error.message)`.

---

## 7. Do NOT

- Do NOT create, switch, rebase, merge, or delete any git branch.
- Do NOT run `git commit`, `git add`, or `git push`.
- Do NOT run `pnpm install` or edit `pnpm-lock.yaml`.
- Do NOT modify `apps/projects-mcp/`, `apps/console/`, `apps/projects-api/`,
  `packages/projects/`, or any other app — another agent is working in
  `apps/projects-mcp` right now.
- Do NOT edit `packages/projects-ui` except to **add a prop** you genuinely need.
- Do NOT add a server action, a `proxy.ts`, or a `middleware.ts`.
- Do NOT write `eslint-disable`, `as any`, `@ts-ignore`, or `@ts-expect-error`.
- Do NOT add a permission key or a feature flag — the catalog is fixed.
- Do NOT use the operator client from a page.
- Do NOT write a `README.md`.

---

## 8. Tests

Minimum **20** `it()` cases. Required:

- each list page renders its toolbar and column headers while data is pending;
- the status filter is threaded into the client call (assert exact arguments);
- an unknown status resolves to `all`;
- `limit` is capped;
- a failed list keeps the toolbar mounted and renders an `AppError`;
- an empty list and a failed list are visibly different states;
- an issue detail resolves by identifier, and an unknown one renders not-found;
- a create form submits through the route handler, not a server action;
- a route handler denies without the permission and the client is
  `not.toHaveBeenCalled()`;
- the nav/guard binding test still passes with the new entries;
- the module catalog matches the permission catalog after the `available` flips.

Assert complete shapes and exact call arguments. `expect(x).toBeDefined()` as a
test's only assertion is a failed test.

---

## 9. Verify before you report

```bash
cd /root/projects/876
pnpm --filter @876/projects-app typecheck
pnpm --filter @876/projects-app lint
pnpm --filter @876/projects-app test
node scripts/check-app-structure.mjs
```

Report the real output, or say plainly that you could not run a command.

---

## 10. Report

Write to
`plans/2026-09-03-876-projects/reports/agy/2026-09-03-phase8-app-product-surfaces.md`
with every file created or changed, the **counted** `it()` cases per file, the
exact output of §9, decisions this brief did not settle, and anything you could
not do. A truthful "not done" is worth far more than a confident claim that
turns out to be false.
