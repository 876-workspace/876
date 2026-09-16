# Implementation Plan: Invoice permission-key drift

Run ID: `2026-09-12-invoice-permission-key-drift`
Branch: `fix/invoice-permission-key-drift`
Status: IN_PROGRESS

## Overview

876 Invoice's document toolbar shows only Share and PDF/Print, while 876 Billing
shows Edit, Send, Share, PDF/Print, Record payment and the `···` menu. The cause
is not the toolbar: `DocumentToolbar` and `InvoiceActions` are mounted
identically in both apps. Three Invoice call sites check permission keys that no
catalog defines, so they evaluate `false` for every role, forever.

## Verified findings (orchestrator, 2026-09-12)

- `packages/core/src/access/catalogs.ts:43` — `const CRUD = ['view', 'create', 'edit', 'delete']`.
- `packages/core/src/access/catalogs.ts:251-269` — `invoicePermissionCatalog`
  (`app: '876-invoice'`) therefore owns `invoices.view|create|edit|delete|export`,
  `quotes.view|create|edit|delete|export`, `payments.view|create|edit|delete`.
  **`invoices.write` does not exist in it.**
- `packages/core/src/access/finance-catalog.ts` — the colon keys
  (`sales:write`, `payments:write`) are the *finance* plane, stored in
  `billing_roles.permissions`, reached through `context.permissions`. They are
  **not** app-access keys and must never be passed to `requireAppPermission` /
  `canAccess`.

### The three defective call sites

| File:line | Current key | Effect | Correct key |
| --- | --- | --- | --- |
| `apps/invoice/src/app/(app)/invoices/[invoiceId]/page.tsx:63` | `canAccess(access, 'invoices.write')` | `canWrite` is always false, so Edit/Send/Void/Write off/Delete are filtered out of `DocumentToolbar` | `invoices.edit` |
| `apps/invoice/src/app/(app)/invoices/[invoiceId]/edit/page.tsx:24` | `requireAppPermission('invoices.write')` | invoice edit page denies every role | `invoices.edit` |
| `apps/invoice/src/app/(app)/quotes/[quoteId]/edit/page.tsx:15` | `requireAppPermission('sales:write')` | finance colon key in the app-access plane; quote edit page denies every role | `quotes.edit` |

Legitimate `sales:write` uses that must NOT be touched (finance plane, read via
`context.permissions` / the resource proxy):
`apps/invoice/src/lib/api/resource-proxy.ts:78`,
`apps/invoice/src/lib/auth/finance-access.ts:28`,
`apps/invoice/src/app/(app)/settings/modules/[moduleKey]/page.tsx:75`,
`apps/invoice/src/app/api/report-preferences/[[...path]]/route.ts:8`.

### Deliberate, not a defect

`DocumentToolbarProps.preferencesHref` is passed by Billing only. Invoice has no
`/subscriptions/invoice-preferences` route, and the prop's own doc comment says
Invoice omits the item rather than linking nowhere. Leave it as is.

## Task checklist

- [x] Root-cause the missing toolbar controls (orchestrator)
- [x] `fix(billing)`: align the invoice detail header with the list heading (`pt-0`)
- [ ] Fix the three permission keys (codex)
- [ ] Add the anti-drift test (codex)
- [ ] Verify, commit, open PR (orchestrator)

## Verification commands

```
pnpm --filter @876/core test
pnpm --filter @876/invoice-app typecheck
pnpm --filter @876/invoice-app lint
pnpm --filter @876/invoice-app test
```
