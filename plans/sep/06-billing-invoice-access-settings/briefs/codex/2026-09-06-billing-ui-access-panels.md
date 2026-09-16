# Brief A — `@876/billing-ui` shared access panels (roles + members)

## Why this exists

876 Billing and 876 Invoice are two products over **one financial data plane**
(`apps/billing-api`). Billing already has a roles/members settings surface;
Invoice has none. Rather than copy Billing's screens into Invoice — which
`.claude/rules/finance-app-parity.md` forbids — the presentation moves into
`@876/billing-ui` as **panels** that both hosts render.

You are building **only the shared presentation package**. Two later briefs
mount these panels in `apps/invoice` and `apps/billing`. Do not touch either
app, and do not touch `apps/billing-api`.

## Read first (binding)

- `.agents/rules/finance-app-parity.md` — the panel/composition split, the word
  "panel", and the rule that a panel renders and never fetches.
- `.agents/rules/shared-product-ui.md` — no routing, no data clients, no
  session, no `fetch` inside the package; hrefs and actions are props.
- `.agents/rules/app-layout.md` §5a (list/detail split view), §10a (form field
  anatomy), §12 (table cell hierarchy), and the button/label rules.
- `.agents/rules/ai-code-quality.md`, `.agents/rules/types.md`,
  `.agents/rules/code-style.md`, `.agents/rules/testing.md`.
- Root `CLAUDE.md` "UI Copy" (no explanatory paragraphs under headings) and
  "UI Design" (**no green buttons**).

## Reference implementations to copy the pattern from

- `apps/console/src/app/(app)/settings/users/roles/_components/roles-shell.tsx`
  — the `ListDetailShell` + `ResourceToolbar` + `StatusFilterHeading` frame.
- `apps/console/src/app/(app)/settings/users/roles/_components/roles-list.tsx`,
  `roles-table-row.tsx`, `role-card-frame.tsx`, `permission-editor.tsx`,
  `permission-group-picker.tsx`.
- `apps/billing/src/features/access/components/role-editor.tsx`,
  `role-create-form.tsx`, `permission-picker.tsx`, `members-table.tsx`,
  `invite-form.tsx`, `pending-invites.tsx`, `revoke-invite-dialog.tsx` — the
  behaviour that must survive the move.
- `packages/billing-ui/src/panels/customer-receivables-panel.tsx` and
  `panel.ts` / `panel-frame.tsx` — the existing panel conventions in this
  package (discriminated `state` prop, own empty/loading/error presentation).

## Files to create — this is the entire file scope

```
packages/billing-ui/src/panels/access/permission-surface.ts
packages/billing-ui/src/panels/access/permission-surface.test.ts
packages/billing-ui/src/panels/access/roles-shell.tsx
packages/billing-ui/src/panels/access/roles-shell.test.tsx
packages/billing-ui/src/panels/access/roles-list-panel.tsx
packages/billing-ui/src/panels/access/roles-list-panel.test.tsx
packages/billing-ui/src/panels/access/role-card-panel.tsx
packages/billing-ui/src/panels/access/role-card-panel.test.tsx
packages/billing-ui/src/panels/access/role-form-panel.tsx
packages/billing-ui/src/panels/access/role-form-panel.test.tsx
packages/billing-ui/src/panels/access/permission-matrix-panel.tsx
packages/billing-ui/src/panels/access/permission-matrix-panel.test.tsx
packages/billing-ui/src/panels/access/members-table-panel.tsx
packages/billing-ui/src/panels/access/members-table-panel.test.tsx
packages/billing-ui/src/panels/access/member-invite-panel.tsx
packages/billing-ui/src/panels/access/member-invite-panel.test.tsx
packages/billing-ui/src/panels/access/types.ts
```

Plus one edit: add a subpath export per file to `packages/billing-ui/package.json`
`exports`, in the existing style (`"./panels/access/roles-shell": { ... }`).
**No barrel `index.ts`** — `.agents/rules/app-structure.md` forbids it.

## Contracts

`types.ts` owns the shared shapes. Money is not involved here; everything is
plain data crossing the RSC boundary, so **no functions, no React components,
no class instances in any data prop** — action callbacks are separate props.

```ts
/** One permission the finance plane can grant, e.g. `customers:read`. */
export type FinancePermissionKey = string

export type FinancePermissionModule = {
  /** Stable module key, e.g. `customers`. */
  key: string
  /** Human label, e.g. `Customers`. */
  label: string
  /** The permission keys in this module, in display order. */
  permissions: { key: FinancePermissionKey; label: string }[]
}

/**
 * The permission surface a host may edit. Billing's surface is a superset of
 * Invoice's. A role may legitimately hold permissions outside the surface the
 * current host edits; those are shown read-only and preserved on save.
 */
export type FinancePermissionSurface = {
  /** Which product is editing, for copy and telemetry only. */
  app: 'billing' | 'invoice'
  modules: FinancePermissionModule[]
  /** Every key in `modules`, precomputed. */
  editable: FinancePermissionKey[]
}

export type FinanceRoleSummary = {
  id: string
  slug: string
  name: string
  description: string
  permissions: FinancePermissionKey[]
  isSystem: boolean
  isDefault: boolean
  memberCount: number
}

export type FinanceMemberSummary = {
  id: string
  userId: string
  name: string
  email: string
  avatarUrl: string | null
  roleId: string
  roleName: string
  status: 'ACTIVE' | 'SUSPENDED'
}

export type FinanceInviteSummary = {
  id: string
  email: string
  roleId: string
  roleName: string
  expiresAt: number | null
}
```

## Panel-by-panel requirements

### `permission-surface.ts`

Pure helpers, no JSX:

- `partitionPermissions(role, surface)` → `{ editable, external }` where
  `external` are the role's permissions **not** in `surface.editable`.
- `mergePermissions(nextEditable, external)` → the sorted, deduplicated set to
  submit. This is the function that guarantees editing a shared role from
  Invoice cannot strip Billing grants; it must be covered by a test that says
  exactly that.
- `impliedPermissions(selected, surface)` — the finance plane requires that a
  `:write` permission is accompanied by its `:read`, and that every role holds
  `billing:access` (see `apps/billing-api/src/modules/access/access.schemas.ts`).
  Selecting a `:write` must auto-select its `:read`; clearing a `:read` must
  clear its `:write`. Implement that here, not in the component.

### `roles-shell.tsx`

A near-copy of Console's `roles-shell.tsx`, with the host-specific parts as
props: `title`, `newHref`, `canCreate`, and the same `type` filter
(`all` / `system` / `custom`, `paramKey="type"`, headingLabels
`All Roles` / `System Roles` / `Custom Roles`). Reads `useSearchParams()` — a
layout gets no `searchParams`, so this stays a client component. `'use client'`.

### `roles-list-panel.tsx`

Renders both forms from one file, as `app-layout.md` §5a requires: the full
`DataTable` when closed and the condensed `ListPane` when a role is open, read
from `useDetailSegments()`. Columns: Name (tier 1, `font-medium`, links to
`detailHref(role.id)`), Type (`Badge` — `System` / `Custom`, never bare text),
Default (`Badge` when `isDefault`), Permissions count, Members count
(`tabular-nums`). Everything the table encodes must survive into the condensed
row. Props: `roles`, `state` (`'loading' | 'ready' | 'error'` with an `error`
message), `detailHref: (roleId: string) => string`, `typeFilter`.
Also export `ROLES_SKELETON_COLUMNS` from a `roles-skeleton-columns.ts`? **No** —
put the column list in this same file and export it, so the fallback and the
loaded table cannot drift.

### `role-card-panel.tsx`

The record card for one role, built from `@876/ui/detail-card`
(`DetailCard`, `DetailCardHeader`, `DetailCardBody`, `DetailCardFooter`,
`DetailCardIdBar`). Header: role name, System/Custom badge, Default badge,
`closeHref`. Body: description, then `permission-matrix-panel`. Footer:
Save / Delete when `canManage`. A **system role is read-only** — the matrix
renders disabled and no Save/Delete appears; say so in one short line, not a
paragraph. Delete uses an `AlertDialog` confirmation and is the only red
control on the card; it must be absent when `memberCount > 0` and instead show
that the role is in use (the API rejects it — do not let the UI pretend
otherwise).

Props: `role`, `surface`, `canManage`, `closeHref`,
`onSave(params: { name: string; description: string; permissions: string[] })`,
`onDelete()`, both returning
`Promise<{ error: { code: string; message: string } | null }>`. Render a failure
with `AppError` (`@876/ui/app-error`) **inside the card**, keeping the form and
the entered values mounted — `.agents/rules/error-handling.md`. Never a toast
for an error; a success toast is fine.

### `role-form-panel.tsx`

Create form, same card chrome, in the detail column (create opens at
`/settings/roles/new`, not a dialog). Fields via `FormRow` (`@876/ui/form-row`):
Name (required), Slug (required, lowercase/digits/underscore, 2–50 — match
`RoleSlugSchema` in `apps/billing/src/types/access.ts`), Description, then the
permission matrix. Slug auto-derives from Name until the user edits Slug, and a
derived value must never overwrite one the user typed.

### `permission-matrix-panel.tsx`

Modules down, actions across, grouped by `surface.modules`. Per-module
select-all/none. Applies `impliedPermissions` on every change. Shows the
`external` permissions from `partitionPermissions` in a quiet, disabled section
titled e.g. `Also granted in 876 Billing` with a one-line explanation that they
are kept — this is the only place a sentence is justified, because the
behaviour is genuinely non-obvious. Fully keyboard operable; every checkbox has
an accessible name.

### `members-table-panel.tsx`

Roster: member (tier 1, name over email), Role (a `Select` of assignable roles
when `canManage`, otherwise text), Status badge, row actions (Suspend /
Reactivate / Remove) behind a `···` dropdown with Remove last and destructive.
Props include `onChangeRole(memberId, roleId)` and
`onChangeStatus(memberId, status)` returning the same result envelope.

### `member-invite-panel.tsx`

Email + role `Select` + submit, plus a pending-invites list with revoke.
Migrate the behaviour in `apps/billing/src/features/access/components/invite-form.tsx`
and `revoke-invite-dialog.tsx` verbatim in substance; only the transport becomes
a prop. Submit stays disabled while in flight and the form keeps its values on
failure.

## Tests — this is not optional

`.agents/rules/testing.md` is binding. Minimum **60 `it()` cases** across the
package, and every one must be able to fail. Specifically required:

- `mergePermissions` preserves out-of-surface permissions (the Invoice-editing-
  a-Billing-role case), stated as its own named test.
- `impliedPermissions`: selecting `:write` selects `:read`; clearing `:read`
  clears `:write`; `billing:access` cannot be removed.
- A system role renders no Save and no Delete.
- A role with members renders no Delete.
- A failed save keeps the entered name/description mounted and renders the
  error code.
- The condensed list row carries the same System/Custom/Default badges as the
  table row.
- Security corpus (`.agents/rules/testing.md` "Security Input Corpus") applied
  to the name, slug, description, and invite email inputs via `it.each`.
- Exact call counts and exact arguments on every action prop
  (`toHaveBeenCalledTimes(1)`, `toHaveBeenCalledWith(...)`), and
  `not.toHaveBeenCalled()` for every guard that must block a submit.

Check `packages/billing-ui/vitest.config.ts` for the environment before writing
component tests.

## Hard constraints

- No `fetch`, no `@876/billing`, `@876/account`, `@876/workspace`,
  `@876/platform`, no `next/navigation` `redirect`, no session, no permission
  check inside the package.
- No hard-coded hrefs — every link is a prop or built from an href-builder prop.
- No `as any`, no `@ts-ignore`, no `eslint-disable`. `as unknown as T` only for
  a genuine external mismatch, and say so in your report.
- No barrel file. No green buttons. No explanatory `<p>` under a heading.
- Do not commit. Do not create, rename, or delete a branch. The orchestrator
  stages and commits.

## Verify before reporting

```bash
pnpm --filter @876/billing-ui typecheck
pnpm --filter @876/billing-ui lint
pnpm --filter @876/billing-ui test
```

All three must pass. Report the **counted** number of `it()` cases you added.

## Report

Write `plans/2026-09-06-billing-invoice-access-settings/reports/codex/2026-09-06-billing-ui-access-panels.md`
with: files created, the counted test number, decisions the brief did not
settle, anything you could not verify, and any prop you added beyond this brief
with the reason.
