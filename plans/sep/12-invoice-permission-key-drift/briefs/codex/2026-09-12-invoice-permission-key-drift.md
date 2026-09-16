# Brief: fix 876 Invoice's permission-key drift and lock it with a test

Repo root: `/root/projects/876`. Branch: `fix/invoice-permission-key-drift` (already checked out).
Do NOT create, switch, merge, or rebase branches. Do NOT commit. Do NOT open a PR.
The orchestrator stages and commits.

## Context (verified — do not re-derive, but do read the files)

876 Invoice's invoice document toolbar renders only Share and PDF/Print, while
876 Billing renders Edit, Send, Share, PDF/Print, Record payment and a `···`
menu. `DocumentToolbar` (`packages/billing-ui/src/panels/document-toolbar.tsx`)
and both apps' `InvoiceActions` are correct and mounted identically. The cause is
that three Invoice call sites check permission keys that no catalog defines, so
they are `false` for every role.

Two separate permission planes exist and must not be mixed:

- **app access** — dot keys (`invoices.edit`), declared in
  `packages/core/src/access/catalogs.ts`, read via `requireAppPermission()` /
  `canAccess()` from `apps/invoice/src/lib/auth/`.
- **finance** — colon keys (`sales:write`, `payments:write`), declared in
  `packages/core/src/access/finance-catalog.ts`, stored in
  `billing_roles.permissions`, read via `context.permissions` and the resource
  proxy.

`packages/core/src/access/catalogs.ts:43` sets `const CRUD = ['view','create','edit','delete']`,
so `invoicePermissionCatalog` owns `invoices.view|create|edit|delete|export`,
`quotes.view|create|edit|delete|export` and `payments.view|create|edit|delete`.
There is no `invoices.write`.

## Task 1 — fix exactly these three call sites

| File | Line | Change |
| --- | --- | --- |
| `apps/invoice/src/app/(app)/invoices/[invoiceId]/page.tsx` | 63 | `canAccess(access, 'invoices.write')` → `canAccess(access, 'invoices.edit')` |
| `apps/invoice/src/app/(app)/invoices/[invoiceId]/edit/page.tsx` | 24 | `requireAppPermission('invoices.write')` → `requireAppPermission('invoices.edit')` |
| `apps/invoice/src/app/(app)/quotes/[quoteId]/edit/page.tsx` | 15 | `requireAppPermission('sales:write')` → `requireAppPermission('quotes.edit')` |

Nothing else. In particular **do not touch** these legitimate finance-plane uses
of `sales:write`:

- `apps/invoice/src/lib/api/resource-proxy.ts:78`
- `apps/invoice/src/lib/auth/finance-access.ts:28`
- `apps/invoice/src/app/(app)/settings/modules/[moduleKey]/page.tsx:75`
- `apps/invoice/src/app/api/report-preferences/[[...path]]/route.ts:8` (and its test)

Do **not** add `invoices.write` to any catalog — `edit` is the canonical action
and the catalog is the contract. Do **not** add `preferencesHref` to Invoice's
`InvoiceActions`; Invoice has no such route and the omission is deliberate (see
the doc comment on `DocumentToolbarProps.preferencesHref`).

## Task 2 — an anti-drift test so this cannot recur

Add `apps/invoice/src/lib/auth/permission-keys.test.ts` (match the placement and
style of the nearest existing test in `apps/invoice/src/lib/auth/`).

It must **scan the Invoice app source** — walk `apps/invoice/src` with `node:fs`,
reading `.ts`/`.tsx` files, skipping `node_modules`, `.next` and `*.test.*` — and
extract every literal permission key passed to `requireAppPermission('…')` and to
`canAccess(<anything>, '…')`. Then assert that **every extracted key is a member
of `invoicePermissionCatalog`'s permission keys**, imported from
`@876/core/access` (check the package's real export path first; do not guess).

Requirements:

- The failure message must name the offending key **and** the file it came from,
  so a future regression is diagnosable from the test output alone.
- Assert the scan actually found keys (e.g. `expect(found.length).toBeGreaterThan(5)`)
  — a scanner that silently matches nothing is a test that cannot fail.
- Add a second `it()` asserting no `requireAppPermission`/`canAccess` literal
  contains a `:` — i.e. no finance colon key may enter the app-access plane.
- Minimum **6** `it()` cases in this file, including direct positive/negative
  unit cases for whatever extraction helper you write. Count them and report the
  number.
- Check `apps/invoice/vitest.config.ts` for the `environment` before writing —
  this is a node-side test and must run in the configured environment.

## Rules you must follow

Read before writing: `.claude/rules/access-control.md`,
`.claude/rules/ai-code-quality.md`, `.claude/rules/testing.md`,
`.claude/rules/types.md`, `.claude/rules/code-style.md`.

Hard prohibitions: no `eslint-disable`, no `@ts-ignore`, no `as any`
(`as unknown as T` only for a genuine external mismatch, and say so in the
report). Do not weaken production code to make a test easier. Do not restate a
catalog's keys as a hand-written list in the test — import the catalog.

## Verification (run these yourself, in the foreground, and report real output)

```
pnpm --filter @876/invoice-app typecheck
pnpm --filter @876/invoice-app lint
pnpm --filter @876/invoice-app test
```

## Report

Write `plans/2026-09-12-invoice-permission-key-drift/reports/codex/2026-09-12-invoice-permission-key-drift.md`
containing: every file changed and why; the counted number of `it()` cases added;
the verbatim tail of each verification command; anything you could not verify;
and any decision the brief did not settle. A truthful "not verified" beats a
confident claim.
