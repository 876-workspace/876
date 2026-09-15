# Brief: 876 Couriers app — Templates and Branding settings, invoice document on packages' invoices

Working directory `/root/projects/876-invoice-branding`. You are the only agent running on a memory-constrained host: run ONE verification command at a time. Do not commit, switch branches or create worktrees. File scope: `apps/couriers/` only.

## Read first (read budget: these files, then write)

1. `plans/2026-09-15-document-templates-and-branding/briefs/shared-host-templates-spec.md` — **the spec you are implementing** (all settings paths are under `apps/couriers/src/app/[orgSlug]/settings/`, and links are org-prefixed: `/${orgSlug}/settings/templates`).
2. `apps/couriers/src/app/api/manage/finance/taxes/route.ts` and `taxes/[taxId]/route.ts` — Pattern A reference (body schema with `orgSlug`, access helper, `createBillingIntegration()`, result response). Create:
   - `app/api/manage/finance/document-templates/route.ts` (GET list `?orgSlug&documentType`, POST create)
   - `app/api/manage/finance/document-templates/[templateId]/route.ts` (PATCH update, DELETE)
   - `app/api/manage/finance/document-templates/[templateId]/default/route.ts` (POST set-default)
   - `app/api/manage/finance/branding/route.ts` (PATCH update)
   Use the **same access helper and permissions** the taxes routes use for read vs write. Body schemas are strict; `settings` is validated with `documentTemplateOverridesSchema` and `layout`/`documentType` with the core enums.
3. The browser client used by the taxes settings page (find its import in `apps/couriers/src/app/[orgSlug]/settings/rates/taxes/` or `settings/finance/`) — add matching `documentTemplates` and `branding` methods in the same client module style.
4. `apps/couriers/src/components/shell/settings-nav.ts` (+ test, + `nav-icons.tsx`) — in the `product` group add `{ key: 'templates', title: 'Templates', href: '/settings/templates', icon: 'templates' }` after `finance`; the Organization group's existing `branding` entry already points at `/settings/branding`. Map the `templates` icon to an existing `@876/ui/icons` export (`DocumentTextIcon` is already imported). Update the registry `toEqual` test.
5. `apps/couriers/src/app/[orgSlug]/settings/branding/page.tsx` — currently "Coming soon"; replace with spec §4. `logoHref` = `/${orgSlug}/settings/orgprofile`. Get the logo URL the way `settings/orgprofile` loads the organization logo.
6. `apps/couriers/src/app/[orgSlug]/invoices/[id]/(detail)/page.tsx` and `../_lib/invoice-data.ts` — add a section below the existing facts that renders `InvoiceDocumentPanel` (`@876/billing-ui/panels/invoice-document-panel`) using `invoiceDocumentData`/`invoiceSeller` from `@876/billing-ui/document/invoice-document-data` **only if** the invoice object type `resolveInvoice` returns is accepted by `invoiceDocumentData` (check its parameter type). Pass `template`/`branding` from `createBillingIntegration().documentTemplates.resolve(orgId, { documentType: 'invoice' })` per spec §5. If the types do not line up, skip this item and describe the mismatch in the report — do not cast.

## Verification (from repo root, one at a time)

```bash
pnpm --filter @876/couriers-app exec vitest run src/app/api/manage/finance src/components/shell 'src/app/[orgSlug]/settings' 'src/app/[orgSlug]/invoices'
pnpm --filter @876/couriers-app typecheck
pnpm --filter @876/couriers-app lint
node scripts/check-app-structure.mjs
pnpm check:rsc-boundaries
```

## Report

`plans/2026-09-15-document-templates-and-branding/reports/opencode/2026-09-15-couriers-host-templates.md`: files, counted tests, verification output, gaps.

## Reference implementation (now merged)

876 Billing implements the same spec — copy its page and adapter structure (not its transport; Couriers uses Pattern A routes):

- `apps/billing/src/app/(app)/settings/templates/` (`page.tsx`, `_components/document-type-tabs.tsx`, `_components/templates-gallery-data.tsx`, `_components/template-card-actions.tsx`, `new/`, `[templateId]/`)
- `apps/billing/src/app/(app)/settings/branding/`

The gallery accepts `newHref: string | null` and `editHrefBase: string | null`; pass `null` for viewers without the write permission.

## Permission vocabulary — do not mix

The shared spec's `sales:read`/`sales:write` are **Billing API finance keys**. Couriers pages and route handlers must use **Couriers' own** guards and permission keys: copy exactly what the taxes settings page and `api/manage/finance/taxes` route use for read and for write (check `packages/core/src/access/catalogs.ts` → `couriersPermissionCatalog` if unsure). Billing API still enforces `billing.invoices.read|write` on the integration hop. A guard key that the Couriers catalog does not define locks every user out — the Invoice host shipped exactly that mistake and it had to be corrected.

The settings nav entry's permission requirement (if the Couriers registry carries one) must equal the page guard (see the binding test).
