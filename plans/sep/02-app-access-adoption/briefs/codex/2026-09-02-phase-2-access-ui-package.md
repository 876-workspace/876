# Phase 2 — `@876/access-ui`: the shared app-access panel

**Model:** `gpt-5.6-terra`, `model_reasoning_effort=high`
**Repo:** `/root/projects/876`. **Branch:** `feature/app-access-adoption` — already checked out. Do not create, switch, merge, rebase, or delete any branch. **Do not commit.**

## Why

CRM, Invoice, Billing and Console all need the identical surface for "what can this
member do in this app": pick an app role, add or remove individual permission
grants/denies, and see the resulting effective permissions. Console has a first
sketch of it at `apps/console/src/app/(app)/orgs/[slug]/members/_components/member-apps.tsx`
— a bare `<select>` and a `<details>` dump of the catalog. Treat that as a spike to
replace, not a design to copy.

Building it once is required by `.claude/rules/shared-product-ui.md`. Four copies is
the failure this phase exists to prevent.

## Read first (binding)

- `.claude/rules/shared-product-ui.md` — the package owns presentation only.
- `.claude/rules/access-control.md` — permission vs feature vs experiment; navigation hiding is never security.
- `.claude/rules/app-layout.md` §10a (form field anatomy), §12 (table cell hierarchy).
- `CLAUDE.md` → "UI Copy" (no prose under headings) and "UI Design" (**no green buttons** — green is status-only).
- `.claude/rules/testing.md` — the prime directive: every test must be able to fail.

## Verified contracts — these are checked, build on them

`workspace` operator client (`packages/workspace/src/operator.ts`) exposes these
**flat**, not nested under `.apps`:

```ts
workspace.appPermissions   // platform catalog CRUD + sync
workspace.appRoles         // platform role templates
workspace.orgAppRoles      // organization-scoped app roles
workspace.appMemberships   // per-member app assignment
```

`workspace.appMemberships.listForMember(orgId, membershipId)` returns
`{ object: 'list', data: AdminAppMembership[], has_more, url, total_count? }` —
**one profile per entitled app for that member, in one request.**

`AdminAppMembership` (`packages/platform/src/resources/app-access.ts:37`) is exactly:

```ts
{
  object: 'app_membership'
  id: string
  organization_id: string
  user_id: string
  membership_id: string
  app_id: string
  app_slug: string
  app_name: string
  status: string
  assigned: boolean
  entitled: boolean
  app_role: AdminAppRole | null
  permission_grants: string[]
  permission_denies: string[]
  effective_permissions: string[]
  title: string | null
  attributes: Record<string, unknown> | null
  assigned_by: string | null
  assigned_at: number | null
  last_access_at: number | null
  revoked_at: number | null
  created_at: number | null
  updated_at: number | null
}
```

`AdminAppRole` carries `{ id, app_id, organization_id, key, name, description,
permissions: string[], is_system, is_default, template_key, position,
members_count: number | null, created_at, updated_at }`.

The canonical permission catalogs live in `@876/core/access/catalogs`
(`appPermissionCatalogs`, keyed by app slug — `876-billing`, `876-couriers`,
`876-crm`, `876-invoice`, `console`). `@876/core/access` also exports
`groupByModule` and `resolveEffectivePermissions`. **Read `packages/core/src/access/index.ts`
and `types.ts` for their exact signatures before using them** — do not assume.

**The API is the authority on effective permissions.** Render
`effective_permissions` as returned. You may use `resolveEffectivePermissions`
only to *preview* an unsaved edit; never to replace the server's answer once saved.

## Scope

### 1. New package `packages/access-ui`

Model it on `packages/crm-ui` — read its `package.json`, `tsconfig.json`, and
`vitest.config.ts` and mirror them.

`package.json`: name `@876/access-ui`, description
"Reusable React surfaces for 876 app access profiles.", `private: true`,
`type: "module"`, `sideEffects: false`, per-file `exports` entries exactly like
crm-ui's (one entry per component file — **no wildcard, no barrel**). Dependencies:
`@876/core` and `@876/ui` as `workspace:*`. Copy crm-ui's `peerDependencies`,
`devDependencies`, and `scripts` verbatim (versions included).

**Do not add `@876/platform`, `@876/workspace`, or any client package as a
dependency.** The package must not import a service client, a session, a route, or
`next/navigation`. Hosts pass data and callbacks.

Add `'@876/access-ui'` to `SHARED_UI_PACKAGES` in `scripts/shared-ui-packages.mjs`.
Then run `pnpm check:transpile` and make it pass — do not edit any app's
`next.config.ts` by hand if the shared list already covers it.

### 2. `src/types.ts` — the host contract

Define the package's own view types. Do **not** re-export `AdminAppMembership`;
the package must not depend on `@876/platform`. Mirror only what it renders:

```ts
export type AccessAppRole = {
  id: string
  key: string
  name: string
  description: string | null
  permissions: string[]
  isSystem: boolean
  isDefault: boolean
}

export type AccessAppEntry = {
  assignmentId: string | null   // null when not yet assigned
  appId: string
  appSlug: string
  appName: string
  entitled: boolean
  assigned: boolean
  status: string
  role: AccessAppRole | null
  roles: AccessAppRole[]        // roles assignable in this org for this app
  grants: string[]
  denies: string[]
  effectivePermissions: string[]
  catalog: AccessPermission[]   // the app's live catalog, flattened
}

export type AccessPermission = {
  key: string
  moduleKey: string
  moduleLabel: string
  action: string
  label: string
  isDangerous: boolean
}
```

### 3. `src/app-access-panel.tsx` — `AppAccessPanel`

`'use client'`. Props:

```ts
{
  entries: AccessAppEntry[]
  /** Called when the operator picks a role. Resolves to an error message, or null. */
  onRoleChange?: (entry: AccessAppEntry, roleId: string) => Promise<string | null>
  /** Called when a permission override is toggled. */
  onOverrideChange?: (
    entry: AccessAppEntry,
    next: { grants: string[]; denies: string[] }
  ) => Promise<string | null>
  /** Read-only when the viewer lacks the manage permission. */
  readOnly?: boolean
}
```

Behaviour:

- One section per entitled app, ordered by `appName`.
- Role picker: a real `Select` from `@876/ui/select` (not a bare `<select>`), labelled,
  disabled while saving or when `readOnly`.
- **An unassigned app renders as an explicit "No access" state with an assign
  affordance**, not as a blank select. `assigned: false` is a normal state.
- Permission matrix grouped by module, from `entry.catalog`. Each permission shows
  its state as one of: `from role`, `granted`, `denied`, `not granted`. A dangerous
  permission is visually marked (a badge — **not a green one**, and not a green button).
- Toggling produces the next `{ grants, denies }` and calls `onOverrideChange`.
  A permission the role already grants, when denied, moves to `denies`. A permission
  the role lacks, when granted, moves to `grants`. Removing an override removes the
  key from both arrays. **Never put the same key in both.**
- While a change is in flight the affected control is disabled; on a returned error
  string, render it inline beside the control with `AppError` (`@876/ui/app-error`,
  `variant="banner"`) and **keep the panel mounted with its values intact** — per
  `.claude/rules/error-handling.md`, an error does not own the page and is not a toast.
- Optimistic state must reconcile: when `entries` changes identity, the panel reflects
  the new server values rather than keeping stale local state.
- `readOnly` disables every control and hides the assign affordance, but still shows
  the effective permissions.

### 4. `src/effective-permissions.tsx` — `EffectivePermissionList`

Presentational, no `'use client'` needed if it has no state. Props
`{ permissions: string[]; catalog: AccessPermission[]; emptyLabel?: string }`.
Groups by module using the catalog, renders human labels, falls back to the raw key
for a permission the catalog does not know (a stale stored key — show it, marked
unknown; do not silently drop it, and do not throw).

### 5. `src/app-access-summary.tsx` — `AppAccessSummary`

A compact read-only strip for a member overview: per app, the app name, the role
name (or "No access"), and the effective-permission count. Props
`{ entries: AccessAppEntry[] }`. No interactivity.

### 6. Tests — `packages/access-ui/src/*.test.tsx`

**At least 34 `it()` cases across the package**, at least 20 of them on
`AppAccessPanel`. Use `@testing-library/react` + `userEvent`, matching crm-ui's setup.
Required coverage, each as its own `it()`:

**AppAccessPanel**
1. renders one section per entry, ordered by app name
2. renders the current role name for an assigned app
3. renders the "No access" state for `assigned: false`
4. calls `onRoleChange` with the entry and the chosen role id — assert exact args
5. does **not** call `onRoleChange` when `readOnly`
6. disables the role picker while a change is in flight
7. renders the error string returned by `onRoleChange` inline
8. keeps the panel and its values mounted after an error
9. granting a permission the role lacks adds it to `grants` only — assert the exact next object
10. denying a permission the role grants adds it to `denies` only
11. removing a grant removes the key from `grants` and leaves `denies` untouched
12. a key never appears in both `grants` and `denies`
13. `onOverrideChange` is not called when `readOnly`
14. permissions are grouped by module, in catalog module order
15. a dangerous permission is marked
16. an empty `entries` array renders an empty state and does not throw
17. an entry with an empty catalog renders the section without a matrix
18. an entry with `entitled: false` is not rendered
19. new `entries` replace stale optimistic state
20. no rendered `<button>` carries a green class (assert against `/bg-green|text-green/`)

**EffectivePermissionList**
21-26: groups by module; renders labels not raw keys; renders a raw unknown key marked unknown; empty list renders `emptyLabel`; does not mutate its props; duplicate keys render once.

**AppAccessSummary**
27-30: one row per entry; "No access" for unassigned; exact effective count; empty state.

**Security corpus** (`it.each`) — 31-34: an app name, role name, permission label, and
module label each containing `<script>alert(1)</script>`, `' OR '1'='1`, `__proto__`,
and a 10,000-character string render as text and do not throw.

## Hard constraints

- **No `eslint-disable`, no `@ts-ignore`, no `as any`.**
- No green on any interactive control.
- No barrel `index.ts`; one `exports` entry per component file.
- No client package, no `next/navigation`, no `server-only`, no session, no fetch.
- Do not branch on a host name inside a component. A host difference is a prop.
- Do not touch `apps/console`, `apps/crm`, `apps/billing`, `apps/invoice`, `apps/api`,
  `packages/ui`, or `packages/core` in this phase — Phase 1 is editing `packages/ui`
  and three settings pages concurrently. `scripts/shared-ui-packages.mjs` is the one
  file outside `packages/access-ui` you may change.
- Do not run `git commit`, `git push`, or any branch operation.

## Verification you must run and report

```bash
pnpm install                      # the new workspace package must be linked
pnpm --filter @876/access-ui typecheck
pnpm --filter @876/access-ui test
pnpm check:transpile
```

Report the **counted** number of `it()` cases per file and the tail of every command.

## Report

Write `plans/2026-09-02-app-access-adoption/reports/codex/2026-09-02-phase-2-access-ui-package.md`
with: a file table; per-file `it()` counts; each command's output tail and pass/fail;
every judgement call the brief left open; anything you could not do and why; and
anything you found that contradicts this brief. A truthful "not done" beats a
confident claim.
