# Phase 4 — Invoice member management + the shared permission matrix

**Model:** `gpt-5.6-terra`, `model_reasoning_effort=high`
**Repo:** `/root/projects/876`. **Branch:** `feature/app-access-adoption` — already checked out. Do not create, switch, merge, rebase, or delete any branch. **Do not commit.**

Two pieces of one job, briefed together so Invoice's member area is built once
rather than revisited: the permission **view** that every app shares, and Invoice's
own `/settings/users`.

## Read first (binding)

- `.claude/rules/app-layout.md` **§5a in full** — the split view, and especially the height rule.
- `.claude/rules/shared-product-ui.md` — the package owns presentation; hosts own data and authority.
- `.claude/rules/app-structure.md`, `.claude/rules/data-loading.md`, `.claude/rules/error-handling.md`, `.claude/rules/app-api-routing.md`, `.claude/rules/access-control.md`.
- `CLAUDE.md` → "UI Copy", "UI Design" (**no green buttons** — green is status only).

## Part A — `PermissionMatrix` in `@876/access-ui`

**Reference:** `apps/console/src/app/(app)/settings/users/(team)/[id]/_components/access-panel.tsx`.
Read it fully. **Do not modify anything under `apps/console/`** — Console adopts this
in a later phase; this phase only generalises its presentation.

New file `packages/access-ui/src/permission-matrix.tsx`, plus a `./permission-matrix`
entry in `packages/access-ui/package.json` `exports` (per-file, no barrel, matching
the existing entries exactly).

```ts
export type PermissionMatrixModule = {
  key: string
  label: string
  permissions: Array<{ key: string; label: string; isDangerous?: boolean }>
}

export function PermissionMatrix({
  modules,
  held,
  emptyLabel,
}: {
  modules: PermissionMatrixModule[]
  /** The effective permission keys this subject holds. */
  held: readonly string[]
  emptyLabel?: string
}): ReactElement
```

Replicate Console's presentation exactly:

- a multi-open `Accordion` (`@876/ui/accordion`), one `AccordionItem` per module;
- each trigger: a `size-8` rounded tile with a `ring-1 ring-inset` module icon, the
  module label, and a right-aligned `granted/total` count in
  `font-mono text-[0.6875rem] tabular-nums`;
- each content panel: the module's permissions as wrapped pills — a held pill is
  `border-border bg-background text-foreground shadow-2xs`, a not-held pill is
  `border-border/40 bg-muted/20 text-muted-foreground/40 line-through`, and every
  pill carries `title={permission.key}` so the raw key is inspectable;
- module colour is **identity, not state** — a module keeps its hue whatever the
  subject holds. Carry Console's `MODULE_STYLE` map across and extend it with the
  module keys the product catalogs use (`requests`, `customers`, `tasks`, `teams`,
  `categories`, `priorities`, `invoices`, `estimates`, `items`, `payments`,
  `payment-methods`, `sales`, `catalog`, `subscriptions`, `purchases`, `vendors`,
  `banking`, `currencies`, `taxes`, `dashboard`, `settings`, `reports`,
  `request-forms`, `notes`, `reminders`, `events`, `calendars`, `my-work`,
  `pre-alerts`, `packages`, `manifests`, `deliveries`, `warehouse`).
  **Emerald must stay unused** — Console reserves it and reusing it would make two
  readings compete. An unknown module key falls back to a neutral tile and a
  generic icon rather than throwing.
- a dangerous permission is marked (a small badge or an icon) — **not in green**;
- `modules: []` renders `emptyLabel` (default: a short neutral line), not a crash.

Add a helper in the same file so hosts do not hand-roll the mapping:

```ts
/** Adapts an `@876/core/access` catalog into matrix modules. */
export function matrixModulesFromCatalog(
  catalog: AppPermissionCatalog
): PermissionMatrixModule[]
```

It must take the module **label** from `catalog.modules[].label` (core's
`AppPermission` carries only `moduleKey`), and preserve declared module and
permission order.

**Tests — at least 16 `it()` in `permission-matrix.test.tsx`:** one item per module;
granted/total counts are correct; a held pill and a not-held pill are
distinguishable; every pill exposes its raw key via `title`; module order is
preserved; permission order within a module is preserved; an unknown module key
renders with the fallback rather than throwing; `modules: []` renders the empty
label; a `held` key absent from every module does not appear and does not throw;
duplicate keys in `held` count once; a dangerous permission is marked; no rendered
element carries a green class (assert against `/bg-green|text-green|emerald/`);
`matrixModulesFromCatalog` takes labels from `catalog.modules[].label`, preserves
order, and returns `[]` for a catalog with no modules; and a security-corpus case
over a module label and a permission label.

## Part B — a Permissions tab for CRM

`apps/crm/src/app/(app)/settings/users/[membershipId]/permissions/page.tsx`.

Add **Permissions** to the member card's existing tab strip, after **App access**.
Read `[membershipId]/layout.tsx` to see how tabs are declared and follow it.

The page resolves the member's app memberships (the same data
`access/page.tsx` already loads — reuse its `_data`/`_lib` helper rather than
writing a second loader) and renders, per entitled app: the app name, the role
name or "No access", and a `PermissionMatrix` built from
`matrixModulesFromCatalog(appPermissionCatalogs[appSlug])` with
`held={membership.effectivePermissions}`.

This tab is **read-only**. Editing lives on the App access tab; this is the "what
does this actually resolve to" view. Do not add controls here.

An app whose slug has no catalog entry renders its name and a short notice, not a
crash. A failed load renders `AppError` and keeps the card chrome mounted.

**Tests: at least 6 `it()`** — one matrix per entitled app; effective permissions
are passed through; an app with no catalog renders a notice; a failed load keeps
chrome and shows the error; no editing control is rendered; the tab appears in the
card's tab strip.

## Part C — Invoice `/settings/users`

**Mirror CRM's implementation**, which is complete and tested at
`apps/crm/src/app/(app)/settings/users/`, `apps/crm/src/app/api/app-memberships/`,
`apps/crm/src/lib/client/app-memberships.ts`, and `apps/crm/src/lib/auth/app-access.ts`.
Read all of it first. Where Invoice can use the same shape, use it — this is
deliberate consistency, not copy-paste for its own sake, and any divergence should
be because Invoice genuinely differs.

Invoice is missing four things CRM has. Add them:

1. **Dependencies** in `apps/invoice/package.json`: `@876/workspace` and
   `@876/access-ui`, both `"workspace:*"`. Run `pnpm install`.
2. **`apps/invoice/src/lib/services/workspace.ts`** — mirror
   `apps/crm/src/lib/services/workspace.ts` exactly, but read
   `process.env.INVOICE_API_876_KEY` (verified: that is the key
   `apps/invoice/src/lib/services/platform.ts:47` already uses). Request-scoped,
   never a module singleton, because the access token belongs to one request.
3. **`apps/invoice/src/lib/auth/app-access.ts`** — mirror
   `apps/crm/src/lib/auth/app-access.ts` including its tests. Same permission keys
   (`apps:assign`, `members:read`), same fail-closed behaviour, same 403 **value**
   rather than a redirect. Adapt only the error code namespace (`invoice/forbidden`).
4. **The routes**: `/settings/users` split view, `[membershipId]` with Overview,
   App access, and Permissions tabs, the `app-memberships` route handlers, and the
   browser client registered in `apps/invoice/src/lib/client`.

Invoice's context resolver is `apps/invoice/src/lib/auth/context.ts` and gives
`{ userId, orgId, ... }`. Use it the way CRM uses `requireCrmContext` /
`getCrmApiContext`; read Invoice's own equivalents rather than assuming the names.

Finally, in `apps/invoice/src/app/(app)/settings/_lib/settings-nav.ts`, flip the
**Users** item to `availability: 'available'` with `href: '/settings/users'`. It is
currently `planned`, which is the visible symptom this part fixes. Update
`settings-nav.test.ts` accordingly.

### Invoice test environment — this will bite you

`apps/invoice/vitest.config.ts` sets `environment: 'node'`. A component test
written without an opt-in **does not run**. Every `.test.tsx` you add under
`apps/invoice` must start with:

```ts
// @vitest-environment jsdom
```

Follow `apps/invoice/src/app/(app)/items/_components/items-list.test.tsx`, which
already does this.

**Tests: at least 30 `it()` across Invoice**, mirroring CRM's coverage — list in
both forms, status filter, detail layout and tabs, `notFound()` on a missing
membership, access entry mapping, the permissions tab, and the route handlers
(401 unauthenticated with the client **not** called, 403 without `apps:assign` with
the client **not** called, exact-argument create/update/delete, invalid body → 400,
a workspace error returned as a value).

## Hard constraints

- **No `eslint-disable`, no `@ts-ignore`, no `as any`.**
- No server actions, no `proxy.ts`/`middleware.ts`, no raw `fetch` to the identity API from a page or component.
- Do not modify `apps/console/`, `apps/billing/`, `apps/api/`, `packages/core`, `packages/ui`, or `apps/crm/src/lib/auth/app-access.ts`.
- Do not change `@876/access-ui`'s existing components; `permission-matrix.tsx` is additive.
- Do not weaken a production signature to make a test easier.
- Do not run `git commit`, `git push`, or any branch operation.

## Verification you must run and report

```bash
pnpm install
pnpm --filter @876/access-ui typecheck && pnpm --filter @876/access-ui test
pnpm --filter @876/crm-app typecheck && pnpm --filter @876/crm-app test
pnpm --filter @876/invoice-app typecheck && pnpm --filter @876/invoice-app test
pnpm --filter @876/invoice-app lint
pnpm check:transpile
node scripts/check-app-structure.mjs
```

Report the **counted** `it()` cases per file and each command's output tail. State
explicitly that every Invoice `.test.tsx` carries the jsdom docblock, and how you
confirmed it (the test count moving is the proof, not the file contents).

## Report

`plans/2026-09-02-app-access-adoption/reports/codex/2026-09-02-phase-4-invoice-members-and-permission-matrix.md`
— per-part sections, file table, counted tests, verification tails, judgement calls,
anything you could not do, and anything contradicting this brief.
