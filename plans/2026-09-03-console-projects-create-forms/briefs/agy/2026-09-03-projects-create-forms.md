# Brief — Console Projects create forms

You are working in the monorepo at `/root/projects/876`, on branch
`feat/console-projects-forms-split`. Everything below is already on this branch;
you are adding to it, not creating it.

**Do not run `git commit`, `git add`, `git checkout`, `git branch`, or `git push`.**
The orchestrator stages and commits. Do not create a pull request.

## Goal

Four Console routes are placeholders that render an explanatory card and a Cancel
link. Turn them into working create forms:

1. `apps/console/src/app/(app)/projects/projects/new/page.tsx`
2. `apps/console/src/app/(app)/projects/issues/new/page.tsx`
3. `apps/console/src/app/(app)/orgs/[slug]/workspace/projects/projects/new/page.tsx`
4. `apps/console/src/app/(app)/orgs/[slug]/workspace/projects/issues/new/page.tsx`

There are exactly **two** forms, shared by all four routes.

## Files to create or change — this is the complete list

| #   | File                                                                              | Action                                |
| --- | --------------------------------------------------------------------------------- | ------------------------------------- |
| 1   | `apps/console/src/lib/client/projects.ts`                                         | create                                |
| 2   | `apps/console/src/lib/client/index.ts`                                            | edit — register the two new resources |
| 3   | `apps/console/src/features/projects/components/project-create-form.tsx`           | create                                |
| 4   | `apps/console/src/features/projects/components/issue-create-form.tsx`             | create                                |
| 5   | `apps/console/src/features/projects/components/project-create-form.test.tsx`      | create                                |
| 6   | `apps/console/src/features/projects/components/issue-create-form.test.tsx`        | create                                |
| 7   | `apps/console/src/app/(app)/projects/projects/new/page.tsx`                       | rewrite                               |
| 8   | `apps/console/src/app/(app)/projects/issues/new/page.tsx`                         | rewrite                               |
| 9   | `apps/console/src/app/(app)/orgs/[slug]/workspace/projects/projects/new/page.tsx` | rewrite                               |
| 10  | `apps/console/src/app/(app)/orgs/[slug]/workspace/projects/issues/new/page.tsx`   | rewrite                               |

**Do not touch any other file.** In particular do not edit anything under
`apps/projects-api/`, `packages/projects/`, `packages/projects-ui/`,
`apps/console/src/app/api/`, `apps/console/src/features/crm/`, or
`apps/console/src/components/shell/`. The backend routes and the shared UI package
are already correct and are out of scope.

## File 1 — `apps/console/src/lib/client/projects.ts`

Write it exactly in the style of the existing `apps/console/src/lib/client/requests.ts`:
derive the input and output types from the operator client rather than restating
them, and build the URL from an `encodeURIComponent`'d organization id.

```ts
import type { ProjectsOperatorClient } from '@876/projects/operator'

import { request } from './request'

type ProjectsResource = ProjectsOperatorClient['projects']
type IssuesResource = ProjectsOperatorClient['issues']

type CreateProjectInput = Parameters<ProjectsResource['create']>[1]
type CreateIssueInput = Parameters<IssuesResource['create']>[1]

type Project = NonNullable<
  Awaited<ReturnType<ProjectsResource['create']>>['data']
>
type Issue = NonNullable<Awaited<ReturnType<IssuesResource['create']>>['data']>

function organizationRoot(organizationId: string) {
  return `/api/organizations/${encodeURIComponent(organizationId)}`
}

export const projects = {
  create(organizationId: string, params: CreateProjectInput) {
    return request<Project>(`${organizationRoot(organizationId)}/projects`, {
      method: 'POST',
      body: JSON.stringify(params),
    })
  },
}

export const issues = {
  create(organizationId: string, params: CreateIssueInput) {
    return request<Issue>(`${organizationRoot(organizationId)}/issues`, {
      method: 'POST',
      body: JSON.stringify(params),
    })
  },
}
```

Only `create` — do not add `update`, `delete`, `list`, or `retrieve`. Nothing calls
them yet, and an unused method is a second permanent path to an operation.

## File 2 — `apps/console/src/lib/client/index.ts`

Add `import { issues, projects } from './projects'` in correct alphabetical position
among the existing imports, add `issues,` and `projects,` as members of the exported
`client` object, and add `export { issues, projects } from './projects'` alongside
the other named re-exports at the bottom. Change nothing else in the file.

## File 3 — `project-create-form.tsx`

A `'use client'` component. Copy the structure, spacing, card chrome, error handling
and button layout of `apps/console/src/features/crm/components/request-create-form.tsx`
— read that file first and follow it closely. Differences from it: this form has no
aside, so use a single `876-card` with `max-w-2xl` rather than the two-column grid.

Props:

```ts
type Props = {
  organizationId: string
  /** The host's Projects root, e.g. `/projects` or `/orgs/acme/workspace/projects`. */
  base: string
}
```

Fields, in this order, each wrapped in `FormRow` from `@876/ui/form-row`:

| Label       | `name`        | Control        | Required | Notes                                                                                                                  |
| ----------- | ------------- | -------------- | -------- | ---------------------------------------------------------------------------------------------------------------------- |
| Name        | `name`        | `Input`        | yes      | `autoFocus`, placeholder `What is this project called?`                                                                |
| Key         | `key`         | `Input`        | yes      | placeholder `CONSOLE`, `hint` on the FormRow: `Issues in this project are numbered with this prefix, e.g. CONSOLE-12.` |
| Description | `description` | `Textarea`     | no       | `className="min-h-32 resize-y"`                                                                                        |
| Status      | `status`      | `NativeSelect` | no       | options from `PROJECT_STATUSES`                                                                                        |
| Health      | `health`      | `NativeSelect` | no       | options from `PROJECT_HEALTHS`                                                                                         |

Put Status and Health side by side in a `grid gap-5 sm:grid-cols-2`, exactly as the
CRM form does with Priority and Channel.

Import the two enum tuples from the contracts package:

```ts
import { PROJECT_HEALTHS, PROJECT_STATUSES } from '@876/projects/contracts'
```

Render each option's label by upper-casing the first letter and replacing `-` with a
space (`on-track` → `On track`). Write that as one small local `function label(value: string)`
helper in the file; do not add a new shared utility for it.

Submit behaviour:

- `event.preventDefault()`, read a `FormData` off `event.currentTarget`.
- Trim `name` and `key`. If either is empty, return without submitting.
- Upper-case the key before sending it (`key.toUpperCase()`).
- `setSubmitting(true)`, `setError(null)`.
- Call `client.projects.create(organizationId, { name, key, description: description || null, status, health })`.
  Omit `status`/`health` from the body when the select is left on its empty default —
  spread them conditionally, the way the CRM form spreads `priorityId`.
- On `result.error`, `setError(result.error)` and stop — do not navigate, do not clear
  the form. Render it with `<AppError title="Project could not be created" error={error} variant="form" showCode />`
  at the top of the card body.
- On success, `router.push(`${base}/projects/${result.data.id}`)` then `router.refresh()`.

The submit `<Button type="submit" variant="info" disabled={submitting}>` reads
`Saving…` while submitting and `Save` otherwise. The Cancel button is
`variant="outline"` and calls `router.push(`${base}/projects`)`.

## File 4 — `issue-create-form.tsx`

Same shape and same rules. Props:

```ts
type ProjectOption = { id: string; name: string; key: string }

type Props = {
  organizationId: string
  base: string
  projects: ProjectOption[]
  /** The signed-in Console operator, recorded as the issue's creator. */
  currentUserId: string
}
```

Fields:

| Label       | `name`        | Control        | Required | Notes                                                                                                                      |
| ----------- | ------------- | -------------- | -------- | -------------------------------------------------------------------------------------------------------------------------- |
| Project     | `projectId`   | `NativeSelect` | yes      | first option `value=""` labelled `Select a project…`; then one per `projects`, labelled `${project.name} (${project.key})` |
| Title       | `title`       | `Input`        | yes      | `autoFocus`, placeholder `What needs to be done?`                                                                          |
| Description | `description` | `Textarea`     | no       | `min-h-40 resize-y`                                                                                                        |
| Status      | `status`      | `NativeSelect` | no       | from `ISSUE_STATUSES`                                                                                                      |
| Priority    | `priority`    | `NativeSelect` | no       | from `ISSUE_PRIORITIES`                                                                                                    |

`import { ISSUE_PRIORITIES, ISSUE_STATUSES } from '@876/projects/contracts'`.
Status and Priority sit side by side in the same two-column grid.

Submit calls
`client.issues.create(organizationId, { projectId, title, description: description || null, creatorUserId: currentUserId, ...conditional status/priority })`
and on success navigates to `` `${base}/issues/${result.data.identifier}` `` — the
**identifier**, not the id: `packages/projects-ui/src/issue-list.tsx:57` links issue
rows by identifier, so the detail route resolves that.

When `projects` is empty, render the card body as a short empty state instead of the
form: the text `Create a project before opening an issue.` and a single
`Link`-styled button to `` `${base}/projects/new` `` labelled `New project`. Do not
render a disabled form.

The submit button is disabled while `submitting`.

## Files 7–10 — the four pages

Each page is a **server** component that resolves the organization, loads what the
form needs, and renders the shared form. Keep each page's existing `metadata` /
`generateMetadata` export and its existing "Back to …" `Link` block verbatim —
copy those from the file you are rewriting. Replace only the placeholder
`876-card` block with the form.

**Page 7 — `(app)/projects/projects/new/page.tsx`**

```tsx
import { ProjectCreateForm } from '@/features/projects/components/project-create-form'

import {
  PLATFORM_PROJECTS_BASE,
  requirePlatformProjectsOrgId,
} from '../../_lib/base'

export const metadata = { title: 'New Project • Projects' }

export default async function PlatformNewProjectPage() {
  const organizationId = await requirePlatformProjectsOrgId()

  return (
    <Page className="space-y-6">
      {/* the existing Back link, unchanged */}
      <ProjectCreateForm
        organizationId={organizationId}
        base={PLATFORM_PROJECTS_BASE}
      />
    </Page>
  )
}
```

**Page 8 — `(app)/projects/issues/new/page.tsx`** — same, plus it must load the
project options and the current user:

```tsx
const organizationId = await requirePlatformProjectsOrgId()
const sessionUser = await requireSession('/projects/issues/new')
const result = await projects.projects.list(organizationId, {})
const options = (result.data?.data ?? []).map((project) => ({
  id: project.id,
  name: project.name,
  key: project.key,
}))
```

with `import { projects } from '@/lib/services/projects'` and
`import { requireSession } from '@/lib/auth/guards'`. Read
`apps/console/src/app/(app)/requests/new/page.tsx` first and match exactly how it
obtains the signed-in user — use the same helper and the same call shape rather
than inventing one.

**Pages 9 and 10 — the org workspace** — identical, except the organization comes
from the slug. Follow
`apps/console/src/app/(app)/orgs/[slug]/workspace/projects/projects/(list)/page.tsx`
verbatim for this part:

```tsx
const { slug } = await params
const org = await resolveOrg(slug)
if (!org) notFound()
```

with `import { resolveOrg } from '../../../../_data'` and
`import { workspaceProjectsBase } from '../../_lib/base'`, passing
`organizationId={org.id}` and `base={workspaceProjectsBase(slug)}`. Check the number
of `../` segments against the file's actual depth — page 9 and page 10 are one level
deeper than the `(list)` page you are copying from is not guaranteed; verify by
counting directories, and if an import path is wrong the typecheck will say so.

These pages return a plain `<div className="space-y-6">`, not `<Page>`, matching the
workspace pages beside them.

## Files 5 and 6 — the tests

Console's vitest is jsdom with globals, `clearMocks: true`, setup at
`src/test/setup.ts`. Follow
`apps/console/src/features/plans/components/plan-module-picker.test.tsx` for the
header lines and import style.

Mock the browser client and the router at the top of each file:

```tsx
const { createProject } = vi.hoisted(() => ({ createProject: vi.fn() }))
const { push, refresh } = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
}))

vi.mock('@/lib/client', () => ({
  client: { projects: { create: createProject } },
}))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh }) }))
```

Write **at least 7** `it()` cases for the project form and **at least 8** for the
issue form. Each must be able to fail — assert exact values, never
`toBeDefined()`. Cover, at minimum:

Project form:

1. submits with the exact body for a name + key only (assert `toHaveBeenCalledWith('org_1', { name: 'Console', key: 'CONSOLE', description: null })` — no `status`/`health` keys present when the selects are untouched);
2. upper-cases a lower-case key before sending;
3. includes `status` and `health` when they are chosen;
4. does **not** call `client.projects.create` when the name is blank (`expect(createProject).not.toHaveBeenCalled()`);
5. does **not** call it when the key is blank;
6. navigates to `` `${base}/projects/${id}` `` and calls `refresh` exactly once on success (`toHaveBeenCalledTimes(1)` on each);
7. renders the error message and does **not** navigate when the result carries an error.

Issue form:

1. submits the exact body including `creatorUserId`;
2. omits `status`/`priority` when untouched and includes them when chosen (two cases);
3. does not submit with no project selected;
4. does not submit with a blank title;
5. navigates to the **identifier** on success, not the id;
6. renders the error and does not navigate on failure;
7. renders the "Create a project before opening an issue." empty state, with no form
   controls, when `projects` is `[]`.

Use realistic fixture data (`org_1`, `Console`, `CONSOLE`, `CONSOLE-12`) — not
`foo`/`test`.

## Rules you must follow

- No `as any`. Use `as unknown as T` only at a genuine boundary, and only if you
  cannot type it properly.
- No `eslint-disable` comments and no `@ts-ignore`, anywhere, for any reason. A lint
  gate satisfied by disabling the rule is a failed task.
- No server actions. The forms call the browser client, which calls the existing
  route handlers.
- No `<p>` of explanatory prose under a heading (`CLAUDE.md` → UI Copy). Field
  guidance goes in `FormRow`'s `hint` prop, which renders a tooltip.
- Single quotes, no semicolons at end of statements — match the surrounding files.
- Do not weaken any existing type or signature to make a test easier to write.

## Verification

Run these and fix what they report before you finish:

```bash
pnpm --filter @876/console typecheck
pnpm --filter @876/console lint
pnpm --filter @876/console test
```

The full console suite currently reports **151 files / 1458 tests** passing. Your
run must still be green and the test count must have gone **up** by the number of
cases you wrote.

## Report

Write your report to
`plans/2026-09-03-console-projects-create-forms/reports/agy/2026-09-03-projects-create-forms.md`
containing: every file you changed and why; the **counted** number of `it()` cases
you added per file; the exact output of each verification command; anything you
could not do and why. A truthful "not done" is worth more than a confident claim.
