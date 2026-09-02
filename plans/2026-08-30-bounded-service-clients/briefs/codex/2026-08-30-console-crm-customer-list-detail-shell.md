# Console CRM customers: restore the canonical list/detail shell

## The defect

`https://console-dev.87six.dev/orgs/efesto/workspace/crm/customers/crm_cus_…`
renders the customer record **alone and offset to the right**, instead of
opening as the detail panel beside the customer list.

Standalone 876 CRM gets this right. Console does not, and the reason is
structural, not cosmetic:

- `apps/crm/src/app/(app)/customers/layout.tsx` renders `CustomersShell`, which
  wraps `ListDetailShell` (`@876/ui/list-detail-shell`) with the list column on
  the left and the active route in the detail slot.
- Console has the route-group scaffolding for exactly this —
  `apps/console/src/app/(app)/orgs/[slug]/workspace/crm/customers/(list)/page.tsx`
  and `.../customers/[customerId]/layout.tsx` — but **no
  `customers/layout.tsx`**. With nothing hosting the shell, the record layout's
  `CustomerCardFrame` (`h-full min-w-0`, `876-card`) is the only thing in the
  content area, so it renders unanchored.

The `(list)` group exists to make a shared `customers/layout.tsx` possible. It
was never added. That is the whole bug.

## What to do

### 1. Promote the shell to `@876/crm-ui`

Create `packages/crm-ui/src/customer-list-shell.tsx` and export it from
`packages/crm-ui/package.json` as `./customer-list-shell` (follow the existing
export entries exactly — `types` + `default`, both pointing at the `.tsx`).

It must be a `'use client'` component owning **only** the product-level
composition: `ListDetailShell` + toolbar slot + list column + detail slot, plus
the takeover behaviour. It must **not** own routing, data loading, hrefs, or
authorization — hosts pass those in. Suggested shape (adjust names to fit):

```tsx
export type CustomerListShellProps = {
  toolbar: ReactNode
  list: ReactNode
  children: ReactNode
  /** Segments that replace the whole shell (a full-page form). */
  takeoverSegments?: readonly string[]
}
```

Read `useListDetailRoute` from `@876/ui/list-detail-shell` and honour the
`takeover` early-return the standalone shell already does.

### 2. Make standalone CRM delegate to it

`apps/crm/src/app/(app)/customers/_components/customers-shell.tsx` must become a
thin host adapter over the new shared shell. It keeps ownership of:
`useCustomerLinks`, `useSearchParams`, `CUSTOMER_STATUS_OPTIONS`,
`StatusFilterHeading`, the `Add` button and its `open ?` suppression, the
`Page className="h-full min-h-0"` wrapper, and `TAKEOVER_SEGMENTS = ['edit']`.

**Do not change any observable standalone CRM behaviour.** `CUSTOMER_STATUS_OPTIONS`
is imported elsewhere — keep it exported from the same module. PR #443's
`useDetailSegments()` behaviour must be preserved exactly.

### 3. Add the Console layout

Create
`apps/console/src/app/(app)/orgs/[slug]/workspace/crm/customers/layout.tsx`.

It renders the shared shell with:

- **toolbar** — Console's existing `ResourceToolbar title="Customers" refresh`.
  **No `Add` action**: Console is operator-tier and has no customer-create
  route in this workspace. Do not invent one.
- **list** — a `<Suspense>` boundary whose async child loads the org's
  customers and renders the shared `CustomersTable` /
  `CondensedCustomersTable` from `@876/crm-ui/customer-list`, with
  `customersHref={workspaceBase(slug, 'crm') + '/customers'}` and
  `newCustomerHref` omitted/null. Mirror the selected-row behaviour of
  `apps/crm/src/app/(app)/customers/_components/customer-list.tsx`
  (`useDetailSegments()[0]` selects the open record) — put the route-aware
  client adapter in `apps/console/src/features/crm/components/`, not in the
  route folder, per `.claude/rules/app-structure.md`.
- **children** — the detail slot.
- fallback — `DataTableSkeleton` with `CRM_CUSTOMERS_SKELETON_COLUMNS`.

Move the data fetch that currently lives in `(list)/page.tsx`'s `CustomersData`
into the layout's list column. `(list)/page.tsx` then renders the **empty
detail state** for `/customers` (no record open) — keep it a real page, keep
`generateMetadata`, and keep the `crm/tenant-not-found` → `<NoCrmWorkspace />`
and `AppError` handling wherever the fetch ends up. Do not duplicate the fetch
in two places.

`apps/console/src/features/crm/components/customers-table.tsx` must keep working
for any other caller; if it becomes unused, delete it rather than leaving a
second definition.

## Hard constraints

- **The Console floating/collapsible workspace rail is an invariant.** It lives
  in `WorkspaceShell` (`apps/console/src/features/orgs/components/workspace-shell.tsx`)
  and is covered by `workspace-shell.test.tsx`. The shared CRM shell fills only
  the workspace **content area**. Do not touch `WorkspaceShell`, the rail, or
  `createWorkspaceLayout`.
- No `eslint-disable`. No `as any` (use `as unknown as T` if truly required).
- No Server Actions. No `proxy.ts` / `middleware.ts`.
- No new dependencies, no lockfile edits, no commits, no branch operations.
- Do not touch: `pnpm-lock.yaml`, `scripts/shared-ui-packages.mjs`,
  `scripts/check-shared-ui-transpile.mjs`, any `next.config.ts`,
  `apps/console/src/lib/auth/guard-coverage.test.ts`, anything under
  `apps/console/src/app/api/`, or any `packages/work-ui` file.
- Follow `.claude/rules/app-layout.md` (containers, toolbars, headings),
  `.claude/rules/data-loading.md` (chrome renders before I/O; suspend only the
  region that waits), and `.claude/rules/app-structure.md` (component
  placement, no app-name prefixes on symbols inside their own app).

## Tests you must add

At least **4** new `it()` cases, jsdom, colocated beside their subject:

1. `packages/crm-ui` — the shared shell renders list + detail together when a
   record is open.
2. `packages/crm-ui` — a takeover segment replaces the shell entirely (list and
   toolbar absent).
3. `apps/console` — the CRM customers layout renders the list column and the
   detail child simultaneously (this is the regression under repair).
4. `apps/console` — the Console customers toolbar exposes **no** Add action.

Console's vitest environment: check `apps/console/vitest.config.ts` before
writing a jsdom test — some suites there run under `node`. A test that cannot
execute in its project's environment counts as not written.

## Verification (run all of these; report exact output)

```bash
pnpm --filter @876/crm-ui typecheck
pnpm --filter @876/crm-app typecheck
pnpm --filter @876/console typecheck
pnpm --filter @876/crm-app test
pnpm --filter @876/console test
node scripts/check-app-structure.mjs
```

Report the **counted** number of new `it()` cases. A truthful "not done" beats a
confident claim. Do not commit.
