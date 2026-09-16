# Brief: render the templated invoice document on Couriers invoice detail

Working directory `/root/projects/876-invoice-branding`. Only agent running; one verification command at a time. Do not commit, switch branches, or create worktrees. File scope: `apps/couriers/src/app/[orgSlug]/invoices/[id]/` only.

## Why

Couriers attaches Billing invoices to packages. `resolveInvoice` returns the **integration** `BillingInvoice` (`packages/billing/src/integration/types/invoice.ts`), which the tenant-shaped `invoiceDocumentData` helper does not accept, so a Couriers-specific adapter is needed. Do **not** change `packages/*` and do not cast.

## Read budget

1. `apps/couriers/src/app/[orgSlug]/invoices/[id]/(detail)/page.tsx`
2. `apps/couriers/src/app/[orgSlug]/invoices/[id]/_lib/invoice-data.ts`
3. `packages/billing/src/integration/types/invoice.ts` (`BillingInvoice`, `BillingInvoiceLine`)
4. `packages/billing-ui/src/panels/invoice-document-panel.tsx` — only the `InvoiceDocumentPanelProps` / `InvoiceDocumentSeller` interfaces
5. `apps/couriers/src/lib/finance/format.ts` (`formatDate`, `formatMoney`)
6. How the Couriers org profile settings page loads the organization (name, logo, address) — `apps/couriers/src/app/[orgSlug]/settings/orgprofile/_components/profile-sections.tsx` or its data loader — to build the seller.

## Build

1. `apps/couriers/src/app/[orgSlug]/invoices/[id]/_lib/invoice-document.ts` — pure `toInvoiceDocumentProps(invoice: BillingInvoice, seller: InvoiceDocumentSeller): Omit<InvoiceDocumentPanelProps, 'seller' | 'footer' | 'template' | 'branding'>`:
   - `invoice.number`, `status`, `subject` (null if absent), every amount via `formatMoney(amount, invoice.currency)`; optional amounts that are zero/absent → `null` where the panel prop is nullable.
   - `lines` from `invoice.lines ?? []`: `id`, `description` (fallback `'Item'`), `quantity`, `servicePeriod: null`, `unitAmount`, `discountAmount`/`taxAmount` formatted or `null` when zero/absent, `totalAmount`.
   - `recipient`: `name` = `invoice.customer?.name ?? invoice.customerId`, `email`/`phone`/`address` → `null` (the integration shape has none; never invent data).
   - `meta`: `[{ label: 'Invoice date', value: formatDate(invoice.issueAt) }, { label: 'Due date', value: formatDate(invoice.dueAt) }]` plus any other date the type actually carries (`sentAt`, `paidAt`) only when present.
   - notes/terms from the type if present, else `null`.
2. In `(detail)/page.tsx`, add a third `DetailCardSection title="Document"` after Amounts, rendering `InvoiceDocumentPanel` with `{...toInvoiceDocumentProps(invoice, seller)}`, `seller`, `footer={null}`, and `template`/`branding` from `createBillingIntegration().documentTemplates.resolve(orgId, 'invoice')` (positional signature). Fetch the resolve call and the seller data **in parallel** with `resolveInvoice` (`Promise.all`). If resolve errors, omit `template`/`branding` (built-in defaults). Get `orgId` the same way `resolveInvoice` does. The existing Suspense boundary stays; update its fallback to include a third skeleton block.
3. Tests: `_lib/invoice-document.test.ts` ≥ 8 cases — full `toEqual` of the mapped props for a realistic invoice; missing lines → `[]`; zero tax/discount → `null`; missing customer name → customer id; no invented email/phone/address; optional dates omitted when absent; security corpus line description (`'<script>alert(1)</script>'`) passes through verbatim; input not mutated.

## Verification (from repo root, one at a time)

```bash
pnpm --filter @876/couriers-app exec vitest run 'src/app/[orgSlug]/invoices'
pnpm --filter @876/couriers-app typecheck
pnpm --filter @876/couriers-app lint
pnpm check:rsc-boundaries
```

## Report

`plans/2026-09-15-document-templates-and-branding/reports/opencode/2026-09-15-couriers-invoice-document.md`
