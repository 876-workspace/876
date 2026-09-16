# Report: 876 Couriers app — Templates and Branding settings, invoice document

Date: 2026-09-15. Scope kept to `apps/couriers/` only. No commit, no branch, no worktree.

## What was implemented

Pattern A manage routes, browser client, settings nav, Templates pages, Branding page.
The invoice-detail `InvoiceDocumentPanel` item was **skipped** — type mismatch, no cast
(see Gaps).

### API routes (Pattern A, `requireFinanceAccess` for read and write, strict bodies)

- `apps/couriers/src/app/api/manage/finance/document-templates/route.ts`
  - `GET ?orgSlug&documentType` → `billing.documentTemplates.list(orgId, {documentType?})`,
    200 via `resultResponse('document-template', …)`. Query validated with
    `documentTemplateTypeSchema` (optional); bad query → `finance/invalid-document-template`.
  - `POST` body `{orgSlug, documentType, name(1–80), layout, settings?, isDefault?}`;
    `settings` validated with `documentTemplateOverridesSchema`,
    `layout`/`documentType` with the core enums → `create(orgId, params)`, 201.
- `apps/couriers/src/app/api/manage/finance/document-templates/[templateId]/route.ts`
  - `PATCH {orgSlug, name?, layout?, settings?}` → `update(orgId, templateId, params)`, 200.
  - `DELETE {orgSlug}` → `delete(orgId, templateId)`, 200.
- `apps/couriers/src/app/api/manage/finance/document-templates/[templateId]/default/route.ts`
  - `POST {orgSlug}` → `setDefault(orgId, templateId)`, 200.
- `apps/couriers/src/app/api/manage/finance/branding/route.ts`
  - `PATCH {orgSlug, …brandingUpdateSchema.shape}` (strict) → `branding.update(orgId, params)`, 200.
- `apps/couriers/src/lib/errors/finance.ts` — extended `FinanceResource` with
  `'document-template' | 'branding'`; added `finance/invalid-document-template` (422),
  `finance/invalid-branding` (422), `finance/document-template-unavailable` (502),
  `finance/branding-unavailable` (502) plus unavailable-code mapping. Registered
  Billing codes (e.g. `billing/workspace-not-found`, `billing/document-template-not-found`)
  pass through unchanged via `resolveFinanceErrorCode`.

### Browser client (`apps/couriers/src/lib/client/finance.ts`, same module style)

- `financeDocumentTemplates.{create,update,remove,setDefault}(orgSlug, …)` hitting
  `/api/manage/finance/document-templates[/:id[/default]]` with `orgSlug` in the body.
- `financeBranding.update(orgSlug, params)` → `PATCH /api/manage/finance/branding`.
- Both merged into the existing `finance` export (no change to `lib/client/index.ts` needed).

### Settings nav

- `components/shell/settings-nav.ts` — product group: `{ key: 'templates', title: 'Templates',
  href: '/settings/templates', icon: 'templates' }` inserted after `finance`.
- `components/shell/nav-icons.tsx` — `templates: DocumentTextIcon` (already imported).
- `components/shell/settings-nav.test.ts` — `toEqual` registry list gains the Templates row;
  active-key table gains `/settings/templates` and `/settings/templates/new` → `'templates'`.
  The registry carries no permission field, so nothing to bind to the page guard.

### Pages (org-prefixed, Couriers `Page`/`PageHeader`/`PageTitle` chrome, metadata without app suffix)

- `[orgSlug]/settings/templates/page.tsx` — guard `getManageContext` + `notFound()`,
  `?type=` via `resolveDocumentTypeParam` (unknown/missing → `invoice`), `canManage` =
  admin/super-admin role check (Couriers' own guard vocabulary; no `sales:*` keys anywhere).
  Chrome outside `<Suspense>`; skeleton fallback keeps the Billing shape.
- `[orgSlug]/settings/templates/_components/` — `document-type-tabs.tsx` (org-prefixed tab hrefs),
  `templates-gallery-data.tsx` (`Promise.all` list + branding via `createBillingIntegration()`,
  `resolvedSettings` as card `settings`, `AppError` banner + page chrome on failure,
  `newHref`/`editHrefBase` = `null` and no `cardActions` when `!canManage`),
  `template-card-actions.tsx` and `template-editor-form.tsx` (`'use client'` adapters;
  all callbacks created inside, org-prefixed `router.push`, `router.refresh()`).
- `[orgSlug]/settings/templates/new/page.tsx` — write-guard (`!canManage` → `notFound()`),
  branding load, `initial = { name: '<Title> template', layout: 'standard', settings: {} }`.
- `[orgSlug]/settings/templates/[templateId]/page.tsx` — write-guard, `retrieve`;
  `billing/document-template-not-found` → `notFound()`, other failures thrown (observable,
  matching Billing reference and Couriers `invoice-data.ts`).
- `[orgSlug]/settings/branding/page.tsx` (was "Coming soon") — loads branding via integration
  and the logo via `platform.organizations.retrieveProfile(orgId)` → `profile.logo_url`
  (same call as `settings/orgprofile`); `logoHref = /${orgSlug}/settings/orgprofile`;
  viewers without write permission get a read-only notice, chrome kept.
  Adapter: `[orgSlug]/settings/branding/_components/branding-form.tsx`.

## Tests (new: 36, all passing)

| File | Count | Covers |
| ---- | ----- | ------ |
| `api/manage/finance/document-templates/route.test.ts` | 9 | GET 403/200-exact-args/200-no-filter/422-query; POST 403/201-exact-args/422-layout/passthrough-404/normalize-502 |
| `…/document-templates/[templateId]/route.test.ts` | 5 | PATCH 403/200-exact-args/422-settings; DELETE 403/200-exact-ids |
| `…/[templateId]/default/route.test.ts` | 3 | 403/200-exact-ids/422-missing-orgSlug |
| `api/manage/finance/branding/route.test.ts` | 4 | 403/200-exact-args/422-accent/normalize-502 |
| `settings/templates/_components/document-type-tabs.test.tsx` | 5 | `?type=` valid/unknown/missing/repeated + org-prefixed tab row with active mark |
| `settings/templates/_components/template-editor-form.test.tsx` | 3 | create exact `(orgSlug, payload)` + org push; update exact + push; error keeps form |
| `settings/templates/_components/template-card-actions.test.tsx` | 5 | set-default exact + refresh; hidden when default; delete exact + refresh; failure message; null when `!canManage` |
| `settings/branding/_components/branding-form.test.tsx` | 2 | update exact `(orgSlug, payload)` + refresh; error keeps form |

Route floor (≥8: denied/allowed/invalid-body/exact-args) is met with 21 route tests;
adapter floor (≥8) with 10; `?type=` floor (≥3) with 4. Nav binding/anti-drift tests updated,
not weakened. jsdom directive used per-file, matching neighbours (default env is node).

## Verification (repo root, one command at a time, in order)

1. `pnpm --filter @876/couriers-app exec vitest run src/app/api/manage/finance
   src/components/shell 'src/app/[orgSlug]/settings' 'src/app/[orgSlug]/invoices'`
   → **48 files, 272 tests, all passed** (33.9s).
2. `pnpm --filter @876/couriers-app typecheck` → clean (`tsc --noEmit`, no output).
3. `pnpm --filter @876/couriers-app lint` → **0 errors**; 13 warnings, all pre-existing in
   untouched files (no-location-assign, unused vars in currencies/uploads/items routes, etc.).
4. `node scripts/check-app-structure.mjs` → OK (all 9 apps).
5. `pnpm check:rsc-boundaries` → OK (10 apps).

## Gaps

1. **Invoice detail panel skipped (brief item 6 allows this; no cast made).**
   `resolveInvoice` (`invoices/[id]/_lib/invoice-data.ts`) returns the **integration**
   `BillingInvoice` (`packages/billing/src/integration/types/invoice.ts`), while
   `invoiceDocumentData` (`packages/billing-ui/src/document/invoice-document-data.ts`)
   requires `DocumentData`, an `InvoiceDetail` (tenant shape,
   `packages/billing/src/types/invoice.ts`) with all amounts as `string | bigint`.
   Missing on `BillingInvoice`: `customerName`, `customerEmail`, `billingAddressSnapshot`,
   `paymentTermName`, `salespersonName`, `servicePeriodStart/End`, full `customer`
   (`companyName/email/phone/addresses[]` — integration only has optional
   `{object,id,name}`), required `lines: InvoiceLine[]` (integration `lines` is optional
   `BillingInvoiceLine[]`), `paymentAllocations`, `creditNoteAllocations`,
   `orderNumber` semantics aside it also carries integration-only fields
   (`source`, `quoteId`, `sentAt/paidAt/voidedAt`, `amountWrittenOff`, `metadata`).
   So the Couriers invoice object is **not** accepted by `invoiceDocumentData` and the
   section was not added; the detail page is unchanged.
2. **Signature note for whoever picks up gap 1:** the brief's
   `documentTemplates.resolve(orgId, { documentType: 'invoice' })` does not match the
   built client — the integration resource is positional,
   `resolve(organizationId, documentType, templateId?)`
   (`packages/billing/src/integration/resources/document-templates.ts:84-88`).
3. The new `GET document-templates` manage route enforces `requireFinanceAccess`
   (admin-only), i.e. the same helper the taxes routes use for writes; server-rendered
   reads go through `createBillingIntegration()` directly (as `TaxesSection` does), so the
   gallery is readable by every org member while the manage GET stays fail-closed.
