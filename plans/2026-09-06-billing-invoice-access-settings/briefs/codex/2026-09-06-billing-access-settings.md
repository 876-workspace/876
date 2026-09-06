# Brief C — 876 Billing: move roles + users settings onto the shared panels

## Why this exists

876 Billing already has working finance role CRUD, an invite flow, and a
members table — but they live in `apps/billing/src/features/access/components/`
as app-local components, and the roles list is a card grid rather than the
list/detail split view every other 876 settings section uses. 876 Invoice is
now getting the same surface, and
`.agents/rules/finance-app-parity.md` is explicit: a finance screen more than
one host renders is defined **once**, in `@876/billing-ui`, and adapted by each
host. Two copies is the failure this rule exists to prevent.

You are moving Billing onto the shared panels. **This is a refactor with a
layout change — no capability may be lost.** Everything Billing can do today it
must still do afterwards.

You are building **only `apps/billing`**. Do not touch `apps/invoice`,
`apps/billing-api`, `packages/billing`, `packages/billing-ui`, or
`packages/core`.

## What already exists

| Thing | Where |
| --- | --- |
| Shared panels | `@876/billing-ui/panels/access/*` — read that directory for the exact prop shapes |
| Finance catalog, Billing surface, merge/partition helpers | `@876/core/access/finance-catalog` — use `financePermissionSurface('billing')` |
| Typed finance role client | `@876/billing` → `client.roles.*` |
| Billing's current implementation (the behaviour to preserve) | `apps/billing/src/app/(app)/settings/roles/*`, `apps/billing/src/features/access/components/*` |
| Billing's server facade and guards | `apps/billing/src/lib/service/`, `apps/billing/src/lib/auth/billing-context.ts` |

## Read first (binding)

`.agents/rules/finance-app-parity.md`, `.agents/rules/app-layout.md` (§1, §5a
including the **height rules**, §7, §10, §10a, §12),
`.agents/rules/app-api-routing.md`, `.agents/rules/data-loading.md`,
`.agents/rules/error-handling.md`, `.agents/rules/ai-code-quality.md`,
`.agents/rules/app-structure.md`, `.agents/rules/testing.md`.

## The work

1. **Replace the roles card grid with the shared split view.** Reshape
   `apps/billing/src/app/(app)/settings/roles/` into the five-file layout
   pattern (`layout.tsx` rendering the shell, `(list)/page.tsx` null,
   `new/page.tsx`, `[roleId]/page.tsx`, `_components/`, `_data.ts`) exactly as
   `apps/billing/src/app/(app)/settings/customers/` already does in this same
   app. Billing sits inside `AppShell`, so the shell container is
   `h-full min-h-0`.

2. **Delete the app-local duplicates that the shared panels replace** —
   `role-editor.tsx`, `role-create-form.tsx`, `permission-picker.tsx`,
   `members-table.tsx`, `invite-form.tsx`, `pending-invites.tsx`,
   `revoke-invite-dialog.tsx` and their tests, once the shared panels carry
   their behaviour. `.agents/rules/ai-code-quality.md`: a migration meant to be
   complete deletes the obsolete implementation rather than leaving a second
   path. If a panel genuinely cannot express something one of these does, **do
   not fork it** — report the gap instead and leave that one file in place with
   a comment saying why.

3. **Point the permission editor at the shared catalog.** Billing's
   `apps/billing/src/types/permission-values.ts` and
   `apps/billing/src/types/access.ts` currently restate the permission list and
   its `:write`-implies-`:read` / `billing:access` rules. Keep
   `BILLING_PERMISSION_VALUES` as a literal tuple — `z.enum` needs it for the
   union every caller is typed against — but **add a drift test** asserting
   `[...BILLING_PERMISSION_VALUES].sort()` deep-equals `FINANCE_PERMISSION_VALUES`
   from `@876/core/access/finance-catalog`, and delete the hand-written
   implication logic in favour of `withImpliedFinancePermissions` /
   `withoutFinancePermission`. One owner for that rule, not three.
   `apps/billing-api/src/modules/access/__tests__/finance-catalog-drift.test.ts`
   is the pattern to copy.

4. **Keep the invite and members surfaces working**, rendered through the
   shared panels, with the same permissions they use today
   (`members:write` for invite and member changes, `roles:write` for role
   writes). Route handlers keep their existing paths — do not rename a browser
   URL.

5. **Preserve out-of-surface permissions on save.** Billing's surface is the
   full catalog today, so `external` will be empty — but the save path must
   still route through `partitionFinancePermissions` /
   `mergeFinancePermissions`, so Billing and Invoice share one save shape and a
   future Billing-only module cannot regress it.

## Do not

- Do not change the browser URLs (`/settings/roles`, `/settings/users`,
  `/api/roles`, `/api/members`, `/api/team/invites`).
- Do not change `requirePagePermission` or Billing's enforcement plane. Moving
  Billing onto the platform app-access plane is a separate, planned migration
  and is explicitly out of scope here.
- Do not add a green button, an explanatory `<p>` under a heading, or a
  suffixed button label (`Add`, never `Add role`).
- No `as any`, `@ts-ignore`, `eslint-disable`, or barrel `index.ts`.
- Do not commit; do not create or switch branches.

## Tests — minimum 35 `it()` cases

Every test able to fail; exact call counts and arguments; both halves of every
`{ data, error }`. Required by name:

- the permission-values drift test against the core catalog;
- creating a role sends exactly the permissions the matrix shows, with implied
  reads added;
- a system role offers neither save nor delete;
- a role with members offers no delete;
- a failed save keeps the form values mounted and renders the error code, and
  fires no toast;
- opening a role leaves the list beside it (the split view is mounted from the
  layout, not the page);
- every mutating route handler denies a caller without its permission and does
  not touch the billing client.

## Verify before reporting

```bash
pnpm --filter @876/billing-app typecheck
pnpm --filter @876/billing-app lint
pnpm --filter @876/billing-app test
node scripts/check-app-structure.mjs
```

All four must pass. Report the **counted** number of `it()` cases added, and
list every file you deleted.

## Report

`plans/2026-09-06-billing-invoice-access-settings/reports/codex/2026-09-06-billing-access-settings.md`
