# Implementation Plan: Console Projects create forms

- **Run ID:** `2026-09-03-console-projects-create-forms`
- **Branch:** `feat/console-projects-forms-split` (from `main` @ `203373f9`)
- **Status:** IN_PROGRESS

## Overview

876 Projects and its two Console surfaces landed in #468. Four routes were left as
placeholders in that PR:

| Route                                          | Surface                   |
| ---------------------------------------------- | ------------------------- |
| `/projects/projects/new`                       | 876's own Projects tenant |
| `/projects/issues/new`                         | 876's own Projects tenant |
| `/orgs/[slug]/workspace/projects/projects/new` | any organization's tenant |
| `/orgs/[slug]/workspace/projects/issues/new`   | any organization's tenant |

Each renders a card saying what a project or an issue is and a Cancel link. The
`Add` button on both list toolbars therefore leads nowhere. This run makes them
real create forms.

## Key design decisions

**One form, two hosts.** The forms are client components under
`features/projects/components/`, taking `organizationId` and `base` exactly as the
existing `ProjectsData` / `IssuesData` server components do. The platform section
passes `/projects`; the org workspace passes `/orgs/<slug>/workspace/projects`. This
is the same host/product split the data components already use, so there is one
implementation of each form rather than a copy per surface
(`.claude/rules/ai-code-quality.md`).

**No new backend work.** `POST /api/organizations/[id]/projects` and
`POST /api/organizations/[id]/issues` already exist, already authorize
`console:organizations`, and already write an audit event. The forms call them
through the typed browser client, per `.claude/rules/api-access.md` — no server
actions, no business logic in the route.

**`key` is required on the project form.** The route handler rejects a body without
one (`!body.key` → 400) even though `CreateProjectInput.key` is optional in the
contract. The form must therefore collect it rather than rely on server derivation.

**The issue form's project list is loaded server-side** and passed down as plain
options, so the form is a shell that renders immediately
(`.claude/rules/data-loading.md` — a form is not suspended because one select needs
live data).

## Task checklist

- [ ] A1 — `src/lib/client/projects.ts`: browser `projects.create` / `issues.create`
- [ ] A2 — `features/projects/components/project-create-form.tsx`
- [ ] A3 — `features/projects/components/issue-create-form.tsx`
- [ ] A4 — wire the four `new` pages
- [ ] A5 — tests for both forms
- [ ] B — list/detail split view for Projects and Issues (separate brief; quota permitting)

## Dispatched briefs

| Brief                                                            | Tool  | Model                   |
| ---------------------------------------------------------------- | ----- | ----------------------- |
| [create forms](./briefs/agy/2026-09-03-projects-create-forms.md) | `agy` | `gemini-3.8-flash-high` |

## Verification

```bash
pnpm --filter @876/console typecheck
pnpm --filter @876/console lint
pnpm --filter @876/console test
node scripts/check-app-structure.mjs
```

## Handoff state

Branch cut from an up-to-date `main`; #468 is merged, so the whole Projects product
is on `main` now. Nothing committed yet.

## Orchestrator review notes (before agy's output lands)

**Defect in my own brief, to fix by hand in review.** The brief tells agy to `await`
the org, the session and the project list at the top of each `new` page. That blocks
the page shell on live I/O, which `.claude/rules/data-loading.md` forbids: the
heading and the Back link are known without fetching anything.

`apps/console/src/app/(app)/requests/new/page.tsx` has the correct shape and is the
one to match — a synchronous page component whose async data child sits inside a
`<Suspense>` with a form-shaped fallback. The issue pages are the ones that matter,
since they load the project options; the project pages only need the org id.

Verified premises the brief relies on:

- `requireSession` is exported from `@/lib/auth/guards` and its result carries `.id`
  (`requests/new/page.tsx:38,64`).
- `requirePlatformProjectsOrgId` exists in `(app)/projects/_lib/base.ts` and calls
  `notFound()` on a misconfigured slug.
- The issue detail route resolves by `identifier`, not `id`
  (`packages/projects-ui/src/issue-list.tsx:57`).
- `POST /api/organizations/[id]/projects` rejects a body with no `key`.

## Phase B — split view (agy, cut off)

The split-view run **failed** at step 283 with `timeout waiting for response` and
never wrote a report. It had already written the four sections, so the work was
picked up and finished by hand.

### What it got right

- `ProjectsList` / `IssuesList` in `@876/projects-ui`: both forms in one file so the
  column is one element across open and close; the condensed row keeps the status
  badge; the query string is preserved on hrefs; issues select by `identifier`, not
  `id`.
- Height handled correctly on both hosts — the workspace layouts wrap the section in
  the `svh` measure, the platform section relies on `AppShell`.
- Detail routes return the card directly, with no wrapper div.
- No `eslint-disable`, `@ts-ignore`, `as any`, or `overscroll-contain` anywhere.

### Defects found in review, fixed by hand

1. **A `server-only` module imported from client components.** Both platform
   toolbars are `'use client'` and imported `PLATFORM_PROJECTS_BASE` from
   `_lib/base.ts`, which begins `import 'server-only'`. That is a build error that
   **no test could catch** — vitest aliases `server-only` to an empty module and
   `tsc` does not model it, so typecheck and 1477 tests were green while
   `next build` would fail. Split the constant into `_lib/paths.ts` (the pattern
   `requests/customers/_lib/paths.ts` already established) and repointed 10 files.

2. **Four copies of the list-data component.** It created
   `_components/<x>-list-data.tsx` in each of the four sections — 134 lines
   duplicating `features/projects/components/{projects,issues}-data.tsx`, which
   commit `bfd62a0d` had deliberately given `organizationId` + `base` props for
   exactly this reuse. The shared pair was left orphaned, used only by stale tests.
   Deleted the copies, updated the shared pair to render the dual-form list, and
   repointed all four layouts.

3. **Stale list-page tests.** The two workspace `(list)/page.test.tsx` files still
   called the page with props after it became `() => null`, which is what broke
   typecheck. Their toolbar and null-page coverage is now in the `layout.test.tsx`
   files, so they were deleted rather than repointed.

## Verification (2026-09-03, final)

| Check                                               | Result                                |
| --------------------------------------------------- | ------------------------------------- |
| `pnpm --filter @876/console typecheck`              | pass                                  |
| `pnpm --filter @876/console lint`                   | 0 errors, 21 pre-existing warnings    |
| `pnpm --filter @876/console test`                   | 155 files, 1477 tests (from 151/1458) |
| `pnpm --filter @876/projects-ui typecheck` · `test` | pass · 3 files, 13 tests (from 5)     |
| `node scripts/check-app-structure.mjs`              | OK                                    |

## Follow-ups deliberately left out

- `[projectId]/page.tsx` fetches the record twice per load — once in
  `generateMetadata`, once in `ProjectDetailData` — because the Projects client is
  not `React.cache`-wrapped. Pre-existing from #468, unrelated to this change.
- The `viewer` Console role holds `console:requests` but not `console:projects`,
  so a read-only operator sees Requests and not Projects. Looks like an oversight
  when the permission was added; deserves its own commit.
- Promotion of Console-local CRM/Billing UI into their `-ui` packages — filed as
  TRI-2 in the 876 Projects workspace.
