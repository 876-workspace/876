# Brief D — the members list on a role

## Why

A role card in Billing and Invoice shows what a role *may do* (the permission
matrix) but never *who holds it*. The roles table has a Members column, so the
count is visible and the list behind it is not — the one question an operator
opens a role to answer. Add that list.

## Scope

```
packages/billing-ui/src/panels/access/role-members-panel.tsx
packages/billing-ui/src/panels/access/role-members-panel.test.tsx
packages/billing-ui/package.json                  ← one subpath export
packages/billing-ui/src/panels/access/role-card-panel.tsx   ← mount it
apps/billing/src/app/(app)/settings/roles/[roleId]/page.tsx ← feed it
apps/invoice/src/app/(app)/settings/roles/[roleId]/page.tsx ← feed it
```

Nothing else. Do not touch `packages/core`, `packages/billing`,
`apps/billing-api`, or any route handler.

## Read first

`.agents/rules/finance-app-parity.md` (a panel renders, never fetches),
`.agents/rules/shared-product-ui.md`, `.agents/rules/app-layout.md` §12 (table
cell hierarchy), `.agents/rules/error-handling.md`, `.agents/rules/testing.md`.

## The panel

`RoleMembersPanel` takes already-resolved data and renders the members holding
this role, in the **same table object as every other finance list**:
`876-card overflow-hidden` wrapping a `DataTable` with sortable
`DataTableColumnHeader`s, `className="text-[0.8125rem]"`, a sky-blue row title
(`font-medium text-sky-600 hover:text-sky-700 hover:underline dark:text-sky-400
dark:hover:text-sky-300`), muted supporting cells, and an em dash for an empty
value. `packages/billing-ui/src/customers-table.tsx` and
`packages/billing-ui/src/panels/access/roles-list-panel.tsx` are the reference —
copy their chrome exactly rather than inventing padding.

Columns: **Member** (name over email, name is the blue link to
`memberHref(userId)`), **Status** (a `Badge`, never bare text), **Joined**
(muted, formatted by a `formatDate` prop — date formatting is host policy).

Props:

```ts
type RoleMembersPanelProps = {
  members: FinanceMemberSummary[]
  state:
    | { status: 'loading' }
    | { status: 'ready' }
    | { status: 'error'; error: { code: string; message: string } }
  memberHref: (userId: string) => string
  formatDate: (value: number | null) => string
  /** Rendered above the table when the role holds nobody. */
  emptyLabel?: string
}
```

`FinanceMemberSummary` already exists in
`packages/billing-ui/src/panels/access/types.ts` — extend it with an optional
`joinedAt: number | null` rather than declaring a second member type.

Empty state: a short `Empty` title only — **no descriptive sentence**
(root `CLAUDE.md` → UI Copy). "No members hold this role" is the whole copy.

Loading: `DataTableSkeleton` with this table's real column set, exported from
the same file so the fallback cannot drift.

Error: keep the table shell mounted and render the failure above it, exactly as
`RolesListPanel` does. Never a toast.

## Mounting it

In `role-card-panel.tsx`, render the members panel **below** the permission
matrix inside `DetailCardBody`, under a quiet `DetailCardSectionTitle`
("Members"). It is optional: the card takes `members?: ReactNode` and renders
the section only when the host supplies it, so a host without the data does not
grow an empty section.

Each host passes the members it already loads for its roster, filtered to this
role. **Do not add a fetch** — Billing loads members in
`settings/users/_data.ts` (`loadBillingMembers`) and Invoice in its own roles
`_data.ts`; reuse those loaders. If a host genuinely has no member data on the
role route, pass nothing and say so in your report rather than adding a client.

## Tests — minimum 14 `it()` cases

Required by name: renders one row per member and no more; the member name links
to `memberHref(userId)` and is the sky-blue class; status renders as a `Badge`;
an empty list renders the `Empty` title and **no** descriptive paragraph; the
error state keeps the column headers mounted; the loading state renders the
skeleton with this table's exact columns; `role-card-panel` renders no Members
section when `members` is omitted; the security corpus from
`.agents/rules/testing.md` applied to member name and email.

## Verify

```bash
pnpm --filter @876/billing-ui typecheck
pnpm --filter @876/billing-ui test
pnpm --filter @876/billing-app typecheck && pnpm --filter @876/billing-app test
pnpm --filter @876/invoice-app typecheck && pnpm --filter @876/invoice-app test
```

All must pass. Report the counted `it()` number. No `as any`, no
`eslint-disable`, no barrel, no green buttons. Do not commit.

## Report

`plans/2026-09-06-billing-invoice-access-settings/reports/codex/2026-09-06-role-members-panel.md`
