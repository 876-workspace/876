# Task: Console workspace header — org switcher, app switcher, return link

You are working in the monorepo at `/root/projects/876`. Package: `@876/console`
(`apps/console`). Branch is already checked out. **Do not create branches, do not
commit, do not push.** The orchestrator stages and commits.

## Context you need

Console recently moved each organization's product workspace from
`/orgs/[slug]/workspace/<app>` to a top-level `/workspace/[orgSlug]/<app>`.
Because it is no longer nested under the organization record, three things are
missing and you are adding them:

1. a **return link** back to wherever the operator entered from,
2. an **organization switcher** (same product, different organization),
3. an **app switcher** (same organization, different product).

These render as one compact header bar at the top of every workspace page.

## Files — produce exactly these, nothing else

| #   | Path                                                                                  | Action |
| --- | ------------------------------------------------------------------------------------- | ------ |
| 1   | `apps/console/src/features/orgs/components/workspace-switchers.tsx`                   | CREATE |
| 2   | `apps/console/src/features/orgs/components/workspace-switchers.test.tsx`              | CREATE |
| 3   | `apps/console/src/app/(app)/workspace/[orgSlug]/_components/workspace-header.tsx`     | CREATE |
| 4   | `apps/console/src/app/(app)/workspace/[orgSlug]/_components/app-workspace-layout.tsx` | MODIFY |
| 5   | `apps/console/src/features/orgs/app-tabs.tsx`                                         | MODIFY |

## Files you must NOT touch

- anything under `apps/console/src/components/shell/` — another agent is editing it right now
- `apps/console/src/features/orgs/workspace-return.ts` and its `.test.ts` — already written, just import it
- `apps/console/src/features/orgs/workspace-sidebar-context.ts` and its test
- `apps/console/src/app/(app)/@sidebar/**`
- `apps/console/src/features/orgs/components/workspace-icon.tsx`
- any file outside `apps/console`
- `plans/**`, `docs/**`, `README.md`

## Exact APIs available (do not invent, do not guess signatures)

```ts
// apps/console/src/features/orgs/workspace-return.ts  — ALREADY EXISTS, pure, safe to call on the client
export type WorkspaceReturn = { href: string; label: string }
export function resolveWorkspaceReturn(
  from: string | null | undefined,
  orgSlug: string,
  orgName: string
): WorkspaceReturn

// apps/console/src/features/orgs/app-workspaces.ts  — ALREADY EXISTS
export type WorkspaceIconKey =
  | 'dashboard'
  | 'customers'
  | 'requests'
  | 'settings'
  | 'billing'
  | 'packages'
  | 'items'
  | 'teams'
  | 'categories'
  | 'forms'
  | 'payments'
  | 'banking'
  | 'branches'
  | 'warehouses'
export type AppWorkspace = {
  appSlug: string
  key: string
  label: string
  summary: string
  iconKey: WorkspaceIconKey
  sections: readonly WorkspaceSection[]
}
export function workspaceBase(orgSlug: string, workspaceKey: string): string // '/workspace/acme/crm'
export function workspaceIndex(orgSlug: string): string // '/workspace/acme'
export function findAppWorkspace(workspaceKey: string): AppWorkspace | undefined
export function entitledWorkspaces(
  entitledAppSlugs: readonly string[]
): AppWorkspace[]

// apps/console/src/features/orgs/org-data.ts  — ALREADY EXISTS, all React.cache'd
export const resolveOrg: (slug: string) => Promise<AdminOrganization | null>
export const resolveOrgEntitledAppSlugs: (
  orgId: string
) => Promise<{ data: string[]; error: AppError | null }>

// apps/console/src/lib/services/platform.ts — ALREADY EXISTS
import { platform } from '@/lib/services/platform'
await platform.organizations.list({ limit: 50, status: 'active' })
// returns { data: { object: 'list', data: AdminOrganization[], has_more: boolean } | null, error }

// AdminOrganization has, among others: { id: string; name: string | null; slug: string; status: string }

// apps/console/src/features/orgs/components/workspace-icon.tsx — ALREADY EXISTS
export function WorkspaceIcon(props: {
  iconKey: WorkspaceIconKey
  colored?: boolean
  className?: string
}): JSX.Element
```

UI primitives (import from these exact subpaths):

```ts
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@876/ui/dropdown-menu'
import {
  ChevronDown,
  ArrowLeft,
  Building2,
  Squares2X2Icon,
} from '@876/ui/icons'
import { cn } from '@876/core/utils'
import Link from 'next/link'
```

## File 1 — `workspace-switchers.tsx` (client component)

Requirements, all mandatory:

- starts with `'use client'`
- props are **plain serializable data only** — no functions, no React components,
  no icon components. Icons are string keys.

```ts
export type WorkspaceSwitcherOrg = { slug: string; name: string }
export type WorkspaceSwitcherApp = {
  key: string
  label: string
  iconKey: WorkspaceIconKey
}
export type WorkspaceSwitchersProps = {
  orgSlug: string
  orgName: string
  workspaceKey: string
  workspaceLabel: string
  /** Organizations an operator can jump to, already resolved and sorted. */
  orgs: readonly WorkspaceSwitcherOrg[]
  /** Products this organization is entitled to. */
  apps: readonly WorkspaceSwitcherApp[]
}
```

Behaviour:

1. Read the entry point with `useSearchParams()`:
   `const from = useSearchParams().get('from')`.
   Then `const back = resolveWorkspaceReturn(from, orgSlug, orgName)`.
2. Render a return link: `<Link href={back.href}>` containing an `ArrowLeft`
   icon (`className="size-3.5"`) and the text `back.label`. Give the link
   `aria-label={`Back to ${back.label}`}`.
3. Render the **organization switcher**: a `DropdownMenu` whose trigger shows
   `orgName` plus a `ChevronDown` (`className="size-3.5"`), with
   `aria-label="Switch organization"`. Its content lists every entry of `orgs`
   as a `DropdownMenuItem` rendering a `<Link href={`/workspace/${org.slug}/${workspaceKey}`}>`
   with the org's `name`. Mark the current one with `aria-current="page"` when
   `org.slug === orgSlug`. Above the list put
   `<DropdownMenuLabel>Organizations</DropdownMenuLabel>`. Below the list put a
   `DropdownMenuSeparator` and a final `DropdownMenuItem` linking to `/orgs`
   with the text `Browse all organizations`.
   **The switcher keeps the operator in the same product** — that is why the
   href ends with `workspaceKey`.
4. Render the **app switcher**: a `DropdownMenu` whose trigger shows
   `workspaceLabel` plus a `ChevronDown`, with `aria-label="Switch app"`. Its
   content lists every entry of `apps` as a `DropdownMenuItem` rendering
   `<Link href={`/workspace/${orgSlug}/${app.key}`}>` with a
   `<WorkspaceIcon iconKey={app.iconKey} className="size-4" />` and `app.label`.
   Mark the current one with `aria-current="page"` when `app.key === workspaceKey`.
   Above the list put `<DropdownMenuLabel>Apps</DropdownMenuLabel>`. Below it a
   `DropdownMenuSeparator` and a final item linking to `workspaceIndex(orgSlug)`
   with the text `All workspaces`.
5. When `apps` is empty, still render the app trigger showing `workspaceLabel`,
   with only the `All workspaces` item beneath it. Do not hide the control.
6. Layout: one flex row, `className="flex flex-wrap items-center gap-2 text-sm"`.
   Put a `<span aria-hidden="true" className="text-muted-foreground/50">/</span>`
   between the two dropdown triggers. The return link comes first, then a
   `<span aria-hidden="true" className="text-muted-foreground/40">|</span>`,
   then the two switchers.
7. Trigger styling for both dropdowns, use verbatim:
   `className="hover:bg-muted/70 text-foreground flex min-w-0 items-center gap-1 rounded-lg px-2 py-1 font-medium"`
   Return-link styling, use verbatim:
   `className="text-muted-foreground hover:text-foreground hover:bg-muted/70 flex min-w-0 items-center gap-1.5 rounded-lg px-2 py-1"`

Write a JSDoc block above the component saying **why** it exists: a workspace is
a top-level context, so nothing above it names the organization or offers a way
back; the two switchers are the cross-organization and cross-product axes an
operator actually moves along.

## File 2 — `workspace-switchers.test.tsx`

Use Vitest + React Testing Library, matching the style of
`apps/console/src/features/orgs/components/workspace-icon.test.tsx` and other
`*.test.tsx` files in this package. `describe`/`it`/`expect` are globals but
importing them is also fine — match neighbouring files.

You must mock `next/navigation`'s `useSearchParams`. Use this exact pattern:

```tsx
const { searchParamsRef } = vi.hoisted(() => ({
  searchParamsRef: { current: new URLSearchParams() },
}))

vi.mock('next/navigation', () => ({
  useSearchParams: () => searchParamsRef.current,
}))
```

and set `searchParamsRef.current = new URLSearchParams('from=/orgs/acme')` inside
individual tests. Reset it in `beforeEach`.

Write **at least 10** `it()` cases covering:

1. renders the organization name in the org trigger
2. renders the workspace label in the app trigger
3. the return link defaults to `/orgs/acme` labelled with the org name when there is no `from`
4. the return link honours a valid `from` of `/workspace/acme` and reads `All workspaces`
5. a hostile `from` of `//evil.example` falls back to `/orgs/acme` — assert the rendered `href` is exactly `/orgs/acme`
6. opening the org switcher lists every supplied organization
7. an org switcher entry links to the **same product** under the other org (`/workspace/globex/crm`)
8. the current organization is marked `aria-current="page"`
9. opening the app switcher lists every supplied app, each linking to `/workspace/acme/<key>`
10. the app switcher still renders its trigger and the `All workspaces` item when `apps` is empty

Assert exact `href` attribute values with `toHaveAttribute('href', '...')` — not
`toContain`. Open a dropdown with `fireEvent.click` (or `userEvent`) on the
trigger found by its `aria-label` before asserting its items.

## File 3 — `workspace-header.tsx` (server component)

Path: `apps/console/src/app/(app)/workspace/[orgSlug]/_components/workspace-header.tsx`

```tsx
import { Suspense } from 'react'

export function WorkspaceHeader({
  orgSlug,
  workspaceKey,
}: {
  orgSlug: string
  workspaceKey: string
}) {
  // Streams: the header is chrome and must not wait on the organization lookup
  // or the entitlement list.
  return (
    <Suspense fallback={<div className="h-7" />}>
      <WorkspaceHeaderData orgSlug={orgSlug} workspaceKey={workspaceKey} />
    </Suspense>
  )
}
```

`WorkspaceHeaderData` is an `async` function in the same file that:

1. `const workspace = findAppWorkspace(workspaceKey)`; if undefined, `return null`.
2. `const org = await resolveOrg(orgSlug)`.
3. Resolves the entitled apps: if `org` exists,
   `const entitlement = await resolveOrgEntitledAppSlugs(org.id)` then
   `entitledWorkspaces(entitlement.data)`; otherwise an empty array.
4. Resolves organizations: `await platform.organizations.list({ limit: 50, status: 'active' })`.
   On error, use an empty list — **but** always include the current organization
   in the list so the trigger is never empty. Map to `{ slug, name: name ?? slug }`,
   and sort by `name` with `localeCompare`.
5. Renders `<WorkspaceSwitchers ... />` with plain data, passing
   `orgName={org?.name ?? orgSlug}`, `workspaceLabel={workspace.label}`, and
   `apps` mapped to `{ key, label, iconKey }`.

Because `WorkspaceSwitchers` calls `useSearchParams()`, it **must** sit inside a
`<Suspense>` boundary — the one above satisfies this. Do not remove it.

## File 4 — wire it into the layout

Edit `apps/console/src/app/(app)/workspace/[orgSlug]/_components/app-workspace-layout.tsx`.
It currently returns:

```tsx
return (
  <div className="space-y-6">
    <Suspense fallback={null}>
      <EntitlementNotice
        orgSlug={orgSlug}
        appSlug={workspace.appSlug}
        appLabel={workspace.label}
      />
    </Suspense>
    {children}
  </div>
)
```

Change it to render the header first:

```tsx
return (
  <div className="space-y-6">
    <WorkspaceHeader orgSlug={orgSlug} workspaceKey={workspaceKey} />
    <Suspense fallback={null}>
      <EntitlementNotice
        orgSlug={orgSlug}
        appSlug={workspace.appSlug}
        appLabel={workspace.label}
      />
    </Suspense>
    {children}
  </div>
)
```

Add the import. Change nothing else in that file.

## File 5 — pass the entry point from the organization record

Edit `apps/console/src/features/orgs/app-tabs.tsx`. In `orgTabs`, the entitled-app
tabs are currently built as:

```tsx
const dynamicAppTabs: RouteTabItem[] = normalized.map((app) => ({
  label: (
    <AppTabLabel
      name={app.name ?? app.slug}
      slug={app.slug}
      logoUrl={app.logoUrl}
    />
  ),
  href: entitledAppHref(orgSlug, app.slug),
}))
```

Change the `href` so it carries the entry point:

```tsx
    href: `${entitledAppHref(orgSlug, app.slug)}?from=${encodeURIComponent(base)}`,
```

`base` is already in scope (`const base = orgBase(orgSlug)`). Add a short comment
above it explaining that the workspace is no longer nested under the organization
record, so the record has to say where the operator came from.

**Do not change `entitledAppHref` itself** — it stays a pure base builder, and
other callers depend on it.

If `apps/console/src/features/orgs/app-tabs.test.ts` or
`app-tabs.test.tsx` asserts on those hrefs, update the expectations to include
the `?from=` suffix. Do not weaken an assertion to make it pass — update it to
the new exact expected string.

## Style rules that will fail review if broken

- No `any`. No `as any`. No `@ts-ignore`. No `eslint-disable`.
- No barrel `index.ts` files.
- Do not prefix component names or files with `Console`/`console-`.
- Comments explain **why**, never restate what the code obviously does.
- No descriptive `<p>` paragraphs under headings.
- Never style a button green.
- Single quotes, no semicolons at end of statements — the repo's Prettier config
  decides; just run Prettier (below) and accept its output.

## Verification — run these and make them all pass before you report done

```bash
cd /root/projects/876
npx prettier --write "apps/console/src/features/orgs/components/workspace-switchers.tsx" "apps/console/src/features/orgs/components/workspace-switchers.test.tsx" "apps/console/src/app/(app)/workspace/[orgSlug]/_components/workspace-header.tsx" "apps/console/src/app/(app)/workspace/[orgSlug]/_components/app-workspace-layout.tsx" "apps/console/src/features/orgs/app-tabs.tsx"
pnpm --filter @876/console typecheck
pnpm --filter @876/console lint
pnpm --filter @876/console test
```

`typecheck` must print no errors. `lint` must report **0 errors** (warnings are
acceptable). `test` must report 0 failed.

If a command fails, fix the cause and run it again. Do not report success on a
command you did not actually run and see pass.

## Report

Write your report to
`plans/2026-09-03-console-workspace-and-sidebar/reports/agy/2026-09-03-workspace-switchers.md`
containing: each file you changed and why, the **counted** number of `it()` cases
you added, the exact output lines of the four verification commands, anything you
could not do, and any decision the brief did not settle.
