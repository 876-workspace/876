# Brief — build out Console's 876 Couriers workspace

Repo `/root/projects/876`, branch `feature/console-finance-workspaces`.
Do **not** create branches, commit, or push. Leave changes in the working tree.

## Why

Console's organization workspace opens a product as that organization sees it.
876 CRM and now 876 Billing / 876 Invoice are built out; 876 Couriers still has
two placeholder screens (`EmptyWorkspaceView`) and no real data. Replace them
with real, read-only operator screens.

## The reference you must follow — read these three files first

1. `apps/console/src/app/(app)/orgs/[slug]/workspace/_components/finance-workspace-pages.tsx`
   — the page-factory shape: static `ResourceToolbar` chrome outside a
   `<Suspense>`, an `async …Data` component inside it, `AppError` on a failed
   result, a `DataTableSkeleton` fallback with the table's real columns.
2. `apps/console/src/features/billing/components/finance-tables.tsx`
   — **the rule that matters most**: a server page must never pass a function
   prop to a client component. Any table taking a formatter callback is bound
   in a `'use client'` module and the page passes rows alone.
3. `apps/console/src/features/billing/customer-rows.ts` — the row-projection shape.

## Data access

Console reads Couriers through `apps/console/src/lib/services/couriers.ts`
(`couriers`, the operator client). **Couriers is keyed by tenant, not by
organization**, so every screen resolves the tenant first:

```ts
const tenant = await couriers.tenants.retrieve({ organizationId: org.id })
```

then calls `couriers.<resource>.list(tenantId)`. Available resources:
`tenants`, `branches`, `warehouses`, `addresses`, `customers`, `mailboxes`,
`packages`, `roles`, `team`, `settings`.

Read the serialized types in `packages/couriers/src/admin/` (each resource file
names its schema/type) and project them onto your own row types. **Do not
invent fields** — if a field you want is not on the type, leave the column out.

The organization may have no Couriers tenant at all. That is a normal state,
not an error: render a short, calm empty view (see
`apps/console/src/features/crm/components/no-crm-workspace.tsx` for the CRM
equivalent) rather than an `AppError`.

## What to build

Five screens under
`apps/console/src/app/(app)/orgs/[slug]/workspace/couriers/`:

| Segment      | Screen     | Source                        |
| ------------ | ---------- | ----------------------------- |
| `customers`  | Customers  | `couriers.customers.list`     |
| `packages`   | Packages   | `couriers.packages.list`      |
| `branches`   | Branches   | `couriers.branches.list`      |
| `warehouses` | Warehouses | `couriers.warehouses.list`    |
| `team`       | Team       | `couriers.team.list`          |

**Delete** the two placeholder routes `couriers/deliveries/` and
`couriers/couriers/` — Packages and Team replace them.

Put the shared page bodies in a new
`workspace/_components/couriers-workspace-pages.tsx`, following the finance
factory file, and make each `page.tsx` a thin file that calls the factory and
re-exports `generateMetadata` + the default. One factory per screen; they do
not need a workspace-key parameter because only one workspace uses them.

Tables: use `DataTable` + `DataTableColumnHeader` from `@876/ui` directly in
app-local client components under
`apps/console/src/features/couriers/components/`. Follow
`.claude/rules/app-layout.md` §12 — exactly one `font-medium` tier-1 cell per
row (the row subject, linked), supporting values plain, metadata muted, status
always a `<Badge>`, numbers `tabular-nums`, empty values an em dash.
Keep a `*-skeleton-columns.ts` beside each table whose labels match its real
`<thead>`, as `apps/console/src/features/billing/components/` does.

Rows link to `${workspaceBase(slug, 'couriers')}/<segment>/${id}` even though
the detail routes do not exist yet — the base href stays a prop so the link is
correct the moment they do.

## Registry

In `apps/console/src/features/orgs/app-workspaces.ts`, replace the Couriers
`sections` array with Overview, Customers, Packages, Branches, Warehouses,
Team. Leave `entryKey` **off** every Couriers section — Couriers has no
navigation registry in a package yet, and `resolveWorkspaceNavigation` returns
`[]` for it, so the rail falls back to showing all sections. Reuse existing
`WorkspaceIconKey` values; add a new key only if none fits, and if you do, add
it to **both** maps in
`apps/console/src/features/orgs/components/workspace-icon.tsx`.

## Rules you must not break

- No `as any`, `@ts-ignore`, or `eslint-disable`. Fix types instead.
- No function prop from a server component to a client component.
- No business logic in a page; read, project, render.
- Do not swallow a failed result into an empty list — render `AppError` with
  `showCode`, keeping the toolbar mounted.
- Do not touch `packages/`, `apps/billing`, `apps/invoice`, `apps/couriers`,
  `apps/api`, or anything under `features/billing`.

## Verify before reporting

```bash
pnpm --filter @876/console typecheck
pnpm --filter @876/console exec vitest run src/features/orgs
node scripts/check-app-structure.mjs
```

The `app-workspaces` test binds every registered section to a route file, so it
fails if a section has no `page.tsx`. Make it pass.

## Report

Write `plans/2026-09-02-console-finance-workspaces/reports/agy/2026-09-02-couriers-workspace-pages.md`:
every file created/changed/deleted with one line of why, the exact output of
each verification command, which fields you took from which serialized type,
and anything you could not do.
