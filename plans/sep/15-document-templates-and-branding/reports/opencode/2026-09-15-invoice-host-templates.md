# Invoice host: Templates and Branding settings — report

Date: 2026-09-15. Scope: `apps/invoice/` only. No commits, branches, or worktrees.

## Files

Added:

- `apps/invoice/src/app/api/document-templates/[[...path]]/route.ts` — Pattern B proxy via `createInvoiceFinanceResourceRoute('document-templates', { read: 'sales:read', write: 'sales:write' })` (GET/POST/PATCH/DELETE).
- `apps/invoice/src/app/api/document-templates/[[...path]]/route.test.ts` — 7 tests.
- `apps/invoice/src/app/api/branding/[[...path]]/route.ts` — same pattern, `branding` resource (GET/PATCH).
- `apps/invoice/src/app/api/branding/[[...path]]/route.test.ts` — 5 tests.
- `apps/invoice/src/lib/client/document-templates.ts` — same-origin `/api/document-templates…` browser client (list/create/retrieve/update/delete/setDefault/resolve).
- `apps/invoice/src/lib/client/document-templates.test.ts` — 9 tests.
- `apps/invoice/src/lib/client/branding.ts` — same-origin `/api/branding` browser client (retrieve/update).
- `apps/invoice/src/lib/client/branding.test.ts` — 2 tests.
- `apps/invoice/src/app/(app)/settings/templates/page.tsx` — list page, `?type=` tabs, Suspense gallery.
- `apps/invoice/src/app/(app)/settings/templates/_components/document-type-tabs.tsx` (+ `.test.tsx`, 5 tests).
- `apps/invoice/src/app/(app)/settings/templates/_components/templates-gallery-data.tsx` — async data component, `AppError` banner on load failure, `newHref`/`editHrefBase` null without write permission.
- `apps/invoice/src/app/(app)/settings/templates/_components/template-card-actions.tsx` (+ `.test.tsx`, 5 tests).
- `apps/invoice/src/app/(app)/settings/templates/_components/template-editor-form.tsx` (+ `.test.tsx`, 3 tests).
- `apps/invoice/src/app/(app)/settings/templates/new/page.tsx`.
- `apps/invoice/src/app/(app)/settings/templates/[templateId]/page.tsx` — `notFound()` on `billing/document-template-not-found`.
- `apps/invoice/src/app/(app)/settings/branding/page.tsx`.
- `apps/invoice/src/app/(app)/settings/branding/_components/branding-form.tsx` (+ `.test.tsx`, 2 tests).

Modified:

- `apps/invoice/src/lib/api/resource-manifest.ts` — added `'branding'` and `'document-templates'` (alphabetical). The manifest test is generic (route-tree match + sorted), no pin update needed.
- `apps/invoice/src/lib/client/index.ts` — registered `documentTemplates` and `branding` on `client` + named exports.
- `apps/invoice/src/app/(app)/settings/_lib/settings-nav.ts` — `Templates` now `available` at `/settings/templates` requiring `sales:read` (new `SALES_READ_PERMISSION` export); `Branding` added to `Workspace` group at `/settings/branding` requiring `sales:read`, icon `preferences` (`branding` is not a `SETTINGS_HUB_ICON_KEYS` entry; icons resolve via `SETTINGS_ITEM_CONFIG` keyed on that list).
- `apps/invoice/src/app/(app)/settings/_lib/settings-nav.test.ts` — 4 new tests (entries + visibility).
- `apps/invoice/src/app/(app)/invoices/[invoiceId]/page.tsx` — fetches `billing.documentTemplates.resolve('invoice')` in the existing `Promise.all`, passes `template` + `branding` to `InvoiceDocumentPanel`; resolve failure renders the panel without those props.

## Tests

New tests: 42 (12 route + 11 client + 10 adapter + 5 tab/type + 4 nav).

## Verification output (repo root, one at a time)

- `pnpm --filter @876/invoice-app exec vitest run src/lib/api src/lib/client 'src/app/(app)/settings' 'src/app/(app)/invoices'` — **35 files, 186 tests, all pass**.
- `pnpm --filter @876/invoice-app typecheck` — **fails on 8 pre-existing errors**, all `TS2304: Cannot find name 'RouteContext'` in untouched files (`src/app/api/requests/**`, `src/app/api/customers/[customerId]/requests/route.ts`). None of the new/modified files error. Verified via `git status` that those files are unmodified.
- `pnpm --filter @876/invoice-app lint` — **0 errors**, 5 warnings, all pre-existing in untouched files.
- `node scripts/check-app-structure.mjs` — **OK** (all apps).
- `pnpm check:rsc-boundaries` — **OK** (10 apps).

## Gaps / deviations from the brief

1. **Server transport is `getBilling` (tenant client), not `getInvoiceBillingIntegration`.** The brief asked for the integration client in settings pages, but `src/lib/api/backend-boundary.test.ts` ("keeps Billing integration construction out of Invoice feature routes") fails on any `getInvoiceBillingIntegration` reference under `src/app/(app)`, and the spec floor says to update — not weaken — anti-drift tests. Every existing Invoice settings page reads via `getBilling(organizationId)`, whose tenant client already exposes `documentTemplates`/`branding` with `sales:read`/`sales:write` authorization, so the pages use that. The proxy routes still expose the same-origin `/api/document-templates` + `/api/branding` surface for the browser clients.
2. **Guard key.** `apps/invoice/src/app/(app)/invoices/(list)/page.tsx` is a stub with no guard to copy; the invoices layout and sibling pages guard with `requireAppPermission('settings.view')` / `'invoices.view'`, and `settings/modules/[moduleKey]/page.tsx` already reads `sales:write` from the app access context. Templates/Branding pages therefore guard with `requireAppPermission('sales:read')` and derive `canManage` via `canAccess(access, 'sales:write')`.
3. **`logoHref` is `null`.** Invoice has no organization-profile settings page (confirmed: no profile/organization route under settings), per the brief's null rule. The logo URL is resolved via `invoiceSeller(organization.data, …).logoUrl`, the same helper the invoice detail page uses.
4. **Proxy check passed.** `resource-proxy.ts` builds `['integrations', 'organizations', organizationId, resource, ...path]`, so both `branding` and `document-templates/resolved` (subpath) proxy correctly; no item was stopped.

## Orchestrator corrections

- Page guards used the finance-member key `sales:read`/`sales:write` with `requireAppPermission`, which checks Invoice **app** permissions (`settings.view`/`settings.edit` in `invoicePermissionCatalog`). Changed to `settings.view` (list, branding) and `settings.edit` (new, edit, canManage). The proxy routes keep `sales:*`, which is the finance vocabulary that proxy checks. After `next typegen`, typecheck is 0 errors; 198 tests pass.
