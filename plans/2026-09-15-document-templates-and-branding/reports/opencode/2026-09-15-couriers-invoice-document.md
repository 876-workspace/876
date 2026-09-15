# Couriers invoice detail — templated invoice document

Date: 2026-09-15. Scope: `apps/couriers/src/app/[orgSlug]/invoices/[id]/` only. No `packages/*` changes, no casts, no commits.

## What changed

- `_lib/invoice-document.ts` (new): pure `toInvoiceDocumentProps(invoice: BillingInvoice, seller): Omit<InvoiceDocumentPanelProps, 'seller' | 'footer' | 'template' | 'branding'>`.
  - Amounts via `formatMoney(amount, invoice.currency)`; nullable optionals (`discount`, `shipping`, `adjustment`, `amountCredited`, `amountPaid`, line `discount`/`tax`) map zero/absent to `null` (BigInt zero check with `Number()` fallback).
  - Lines from `invoice.lines ?? []` with `description || 'Item'`, `servicePeriod: null`.
  - Recipient is `customer?.name ?? customerId` with `email`/`phone`/`address` always `null` (integration shape carries none).
  - Meta always has Invoice/Due date; `Sent date`/`Paid date` appended only when `sentAt`/`paidAt` are non-null.
  - `notes`/`terms`/`subject` pass through with `?? null`. No input mutation.
- `(detail)/page.tsx`: third `DetailCardSection title="Document"` renders `InvoiceDocumentPanel` with `{...toInvoiceDocumentProps(invoice, seller)}`, `seller`, `footer={null}`, and `template`/`branding` from `createBillingIntegration().documentTemplates.resolve(orgId, 'invoice')`. `orgId` comes from `getManageContext(orgSlug)` (same source as `resolveInvoice`); `resolveInvoice`, template resolve, and `platform.organizations.retrieveProfile` run in one `Promise.all`. Template/branding omitted on resolve error (panel built-in defaults). Seller built from the org profile (`name`, `logo_url`, `address_line1/2`, `city`, `country_code` via `Intl.DisplayNames`, `primary_email/phone`) with `getManageContext` org name/logo as fallback. Suspense fallback now has three skeleton blocks.
- `(detail)/page.test.tsx`: mocks for `createBillingIntegration` and `getPlatformClient`; identity/amount assertions switched to `getAllByText` (Document panel repeats them); new test asserts the Document section and seller render.
- `_lib/invoice-document.test.ts` (new, 11 cases): full `toEqual` of a realistic invoice; missing lines → `[]`; zero tax/discount → `null`; missing customer name → customer id; no invented email/phone/address; optional dates omitted/absent vs. sent+paid present; `<script>alert(1)</script>` passes through verbatim; empty description → `'Item'`; subject/notes/terms null; input not mutated.

## Verification (repo root, sequential)

- `pnpm --filter @876/couriers-app exec vitest run 'src/app/[orgSlug]/invoices'` — 6 files, 41 tests passed.
- `pnpm --filter @876/couriers-app typecheck` — clean.
- `pnpm --filter @876/couriers-app lint` — 0 errors, 16 pre-existing warnings.
- `pnpm check:rsc-boundaries` — OK (10 apps).
