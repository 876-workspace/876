# Brief B — 876 Invoice: roles + users settings (full CRUD)

## Why this exists

876 Invoice has `/settings/users` (org member roster + app-access panel) but no
way to see or change what a member may **do** with finance data. That is
governed by the finance workspace roles in `apps/billing-api`
(`billing_roles` / `billing_members`), which 876 Billing already surfaces and
Invoice does not. Invoice reaches `billing-api` with the signed-in user's own
access token, so these are the roles that actually decide what an Invoice user
can do.

You are building **only `apps/invoice`**. Do not touch `apps/billing`,
`apps/billing-api`, `packages/billing`, `packages/billing-ui`, or
`packages/core` — every dependency you need already exists there.

## What already exists — use it, do not rebuild it

| Thing | Where |
| --- | --- |
| Shared presentation panels (roles shell/list/card/form, permission matrix, members table, invite) | `@876/billing-ui/panels/access/*` — see that directory for the exact prop shapes |
| Finance permission catalog + Invoice surface + merge/partition helpers | `@876/core/access/finance-catalog` — `financePermissionSurface('invoice')`, `partitionFinancePermissions`, `mergeFinancePermissions`, `withImpliedFinancePermissions`, `withoutFinancePermission` |
| Typed finance role client (`list`/`create`/`retrieve`/`update`/`delete`) | `@876/billing` → `client.roles.*`, reached through `getBilling(organizationId)` in `apps/invoice/src/lib/services/billing.ts` |
| Typed finance **member** write, at session authority | `@876/billing` → `client.members.update(userId, { roleId, status })`, same `getBilling(organizationId)` client |
| Typed finance **member projections**, server-only (internal key) | `create876BillingServerClient({ internalKey, requestId }).members.list(tenantId)` and `.members.resolve({ tenantId, userId, organizationRole })` from `@876/billing/server`. `resolve` returns the acting account's effective finance permissions, falling back to the role their 876 organization role implies when they hold no explicit grant; it resolves to `null` for no access, which is a value, not an error. |
| Org member roster and app-access reads | `apps/invoice/src/app/(app)/settings/users/_data.ts` |
| Request-scoped access resolution and guards | `apps/invoice/src/lib/auth/access-context.ts`, `app-access.ts`, `guards.ts` |
| Acting organization | `getInvoiceContext()` in `apps/invoice/src/lib/auth/context.ts` returns `InvoiceContext \| null` with `orgId`, `userId`, `role`, `accessStatus`. Prefer `getInvoiceContextResult()` in a route handler so `unavailable` answers 503 and `signed-out` answers 401 — collapsing them to `null` tells a signed-in operator they have no organization. |
| Browser mutation client | `apps/invoice/src/lib/client/` (`client.customers`, `client.items`, …) |

## Read first (binding)

- `.agents/rules/app-layout.md` — §1 (pages, not pop-ups), §5a (list/detail
  split view **including the height rules — read them, this is where this
  layout is usually shipped broken**), §7 (`PageBreadcrumb`), §10, §10a, §12.
- `.agents/rules/app-api-routing.md` — the browser only ever sees
  `/api/<resource>` on Invoice's own origin; route handlers authorize and adapt
  transport and contain **no business logic**; **no server actions**.
- `.agents/rules/data-loading.md` — chrome renders immediately, only the
  fetching component suspends, fallbacks match the real shape.
- `.agents/rules/error-handling.md` — expected failures are values; a failure
  never takes over the page.
- `.agents/rules/access-control.md` — navigation visibility, route guard, and
  API authorization are three separate layers and all three are required.
- `.agents/rules/app-structure.md`, `types.md`, `code-style.md`,
  `ai-code-quality.md`, `testing.md`.

## Authorization — get this exactly right

Two different permissions gate two different things, and they are not
interchangeable:

- **Reading and writing finance roles/members** is gated by the *finance*
  permissions `roles:read` / `roles:write` / `members:read` / `members:write`,
  which come from the acting member's finance role. Resolve them once per
  request and reuse. `billing-api` enforces the same permission on every call —
  the guard here is defence in depth and a better UX, never the only check.
- **Deciding who may open 876 Invoice at all** is the *organization*
  permission `apps:assign`, already handled by
  `apps/invoice/src/lib/auth/app-access.ts`. Do not reuse it for role editing
  and do not reuse `roles:write` for app assignment.

Resolve the acting member's finance permissions with
`create876BillingServerClient(...).members.resolve(...)` — that is the same
projection 876 Billing uses, so the two products cannot disagree about what a
member may do. You will need the workspace's `tenantId`; resolve it the way
Invoice already resolves Billing context, and if Invoice has no tenant lookup
yet, add one under `src/lib/services/` rather than inlining a path.

Add a request-scoped resolver beside the existing ones (memoized with
`React.cache`, taking **primitive** arguments — `React.cache` compares with
`Object.is`, so an options object never hits) that returns the acting member's
finance permissions, plus a `requireFinanceRoleManager(organizationId)` helper
for route handlers that mirrors `requireAppAccessManager`: a `Response` when
the caller may not act, the viewer otherwise, **503 for an unresolved outcome
and 403 for a denial**, and never a redirect.

## Routes to build

```
apps/invoice/src/app/(app)/settings/roles/layout.tsx        ← renders the shared shell
apps/invoice/src/app/(app)/settings/roles/(list)/page.tsx   ← null page (the list lives in the layout)
apps/invoice/src/app/(app)/settings/roles/new/page.tsx      ← create, in the detail column
apps/invoice/src/app/(app)/settings/roles/[roleId]/page.tsx ← the role card
apps/invoice/src/app/(app)/settings/roles/_components/roles-section.tsx
apps/invoice/src/app/(app)/settings/roles/_components/roles-list.tsx
apps/invoice/src/app/(app)/settings/roles/_components/roles-list-data.tsx
apps/invoice/src/app/(app)/settings/roles/_data.ts
apps/invoice/src/app/(app)/settings/users/invite/page.tsx
apps/invoice/src/app/(app)/settings/users/[membershipId]/finance/page.tsx  ← this member's finance role
```

Follow the five-file split-view shape worked through in
`apps/billing/src/app/(app)/settings/customers/` and
`apps/console/src/app/(app)/settings/users/roles/`. The shell is rendered from
`layout.tsx`, never from a page — that is what keeps the toolbar and list from
remounting when a role opens.

Invoice's settings content sits inside `AppShell`, so the shell container is
`h-full min-h-0` (not a `svh` measure — that is only for Console workspaces).

## Route handlers

```
apps/invoice/src/app/api/roles/[[...path]]/route.ts     ← or explicit files; see below
apps/invoice/src/app/api/members/[userId]/route.ts
```

Prefer **explicit typed resource routes** (`app-api-routing.md` Pattern A) over
a catch-all proxy: Invoice adds its own permission decision on top, and Pattern
B is only permitted for a faithfully-mirrored resource family with a manifest.
So: `POST /api/roles`, `PATCH /api/roles/:roleId`, `DELETE /api/roles/:roleId`,
`PATCH /api/members/:userId`.

Each handler, in this order: resolve the session and organization → check the
finance permission → parse the body → call **one** `billing.roles.*` /
`billing.members` operation → return `{ data, error }`. No business logic, no
recomputation of what the service decides.

**The update handler must preserve out-of-surface permissions.** Invoice's
surface has no `subscriptions:*`, `banking:*`, `purchases:*` or `vendors:*`
keys, so a naive save of the visible selection would silently revoke a shared
role's Billing grants. Retrieve the role, `partitionFinancePermissions` it
against `financePermissionSurface('invoice')`, and
`mergeFinancePermissions(submitted, external)` before writing. This must have
its own named test.

## Browser client

Add `apps/invoice/src/lib/client/roles.ts` and `members.ts` in the exact style
of `customers.ts`, and register them in `apps/invoice/src/lib/client/index.ts`.
Browser components call `client.roles.*` — never `fetch`, never a service URL.

## Navigation

Add a **Roles** item to the Workspace group in
`apps/invoice/src/app/(app)/settings/_lib/settings-nav.ts`
with `icon: 'roles'` — that key already exists in `SETTINGS_HUB_ICON_KEYS`
(`packages/ui/src/components/settings-hub.tsx`); do not invent a new one.
`availability: 'available'`, `href: '/settings/roles'`.

Per `.agents/rules/access-control.md` the navigation entry's requirement and
the destination route's guard must check the **same** permission, and that
relationship needs a binding test. Add one if `settings-nav.test.ts` does not
already carry the pattern.

## Copy and layout rules that are easy to get wrong

- Toolbar title `Roles`, primary button label is the bare verb **`Add`** with
  `primaryVariant="info"`. Never `Add role`.
- **No green buttons anywhere.** Green is status only.
- **No explanatory `<p>` under a heading.** The one exception is the
  out-of-surface permissions note the shared panel already renders.
- Detail dropdown order: entity actions → separator → Export → separator →
  Delete (destructive, last). Never a separator as the first child.
- One `876-page-title` size for every page heading; never `text-xl` +
  `font-semibold` at a call site.

## Tests — minimum 45 `it()` cases

`.agents/rules/testing.md` is binding: every test must be able to fail, exact
call counts and exact arguments on every mock, and both halves of every
`{ data, error }` result asserted. Required by name:

- the update handler preserves `subscriptions:write` on a role edited from
  Invoice;
- a caller without `roles:write` gets **403** and the billing client is
  `not.toHaveBeenCalled()`;
- an unresolved permission outcome gets **503**, not 403;
- a system role renders no destructive action in Invoice;
- the settings-nav Roles entry and the `/settings/roles` guard require the same
  permission;
- an invalid JSON body gets 400 without touching the billing client;
- the security corpus from `.agents/rules/testing.md` applied to every
  user-supplied string that reaches a handler.

Check `apps/invoice/vitest.config.ts` for the test environment before writing
component tests.

## Verify before reporting

```bash
pnpm --filter @876/invoice-app typecheck
pnpm --filter @876/invoice-app lint
pnpm --filter @876/invoice-app test
node scripts/check-app-structure.mjs
```

All four must pass. Report the **counted** number of `it()` cases added.

## Hard constraints

- No server actions. No `proxy.ts` or `middleware.ts`.
- No raw `fetch` to `billing-api` from Invoice feature code.
- No `as any`, `@ts-ignore`, or `eslint-disable`.
- No barrel `index.ts` re-exporting a directory.
- Do not commit; do not create or switch branches. The orchestrator commits.

## Report

`plans/2026-09-06-billing-invoice-access-settings/reports/codex/2026-09-06-invoice-access-settings.md`
— files changed with reasons, counted test number, decisions the brief did not
settle, and anything you could not verify.
