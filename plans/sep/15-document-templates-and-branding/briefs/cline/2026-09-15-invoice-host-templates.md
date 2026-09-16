# Brief: 876 Invoice app — Templates and Branding settings

Working directory `/root/projects/876-invoice-branding`. You are the only agent running on a memory-constrained host: run ONE verification command at a time. Do not commit, switch branches or create worktrees. File scope: `apps/invoice/` only.

## Read first (read budget: these files, then write)

1. `plans/2026-09-15-document-templates-and-branding/briefs/shared-host-templates-spec.md` — **the spec you are implementing**.
2. `apps/invoice/src/app/api/currencies/[[...path]]/route.ts` — Pattern B proxy using `createInvoiceFinanceResourceRoute(resource, { read, write })`. Add `app/api/document-templates/[[...path]]/route.ts` and `app/api/branding/[[...path]]/route.ts` with `{ read: 'sales:read', write: 'sales:write' }`. Open `apps/invoice/src/lib/api/resource-proxy.ts` only to confirm it maps to the integration `/integrations/organizations/:organizationId/<resource>` path; if it cannot address `branding` or `document-templates/resolved`, stop that item and report.
3. `apps/invoice/src/lib/api/resource-manifest.ts` — add `'branding'` and `'document-templates'` to `PROXIED_RESOURCES` (keep alphabetical) and update any test that pins the list.
4. `apps/invoice/src/lib/client/currencies.ts` and `apps/invoice/src/lib/client/index.ts` — add browser clients in the same style: `lib/client/document-templates.ts`, `lib/client/branding.ts` (same-origin `/api/document-templates…`, `/api/branding`).
5. `apps/invoice/src/lib/services/billing-integration.ts` — server reads: `const billing = await getInvoiceBillingIntegration()` then `billing.documentTemplates.list(organizationId, …)` / `billing.branding.retrieve(organizationId)`. Get `organizationId` the way `apps/invoice/src/app/(app)/invoices/[invoiceId]/page.tsx` does (`getInvoiceContext`).
6. `apps/invoice/src/app/(app)/settings/finance/page.tsx` — guard pattern (`requireAppPermission`). Use the same guard helper with the sales read permission the invoices list page uses (open `apps/invoice/src/app/(app)/invoices/(list)/page.tsx` for the exact key) and the matching write key for `canManage`.
7. `apps/invoice/src/app/(app)/settings/_lib/settings-nav.ts` (+ its test) — the `Sales` group already has `{ label: 'Templates', availability: 'planned' }`: make it `available` with `href: '/settings/templates'` and the read requirement. Add `{ label: 'Branding', icon: 'branding' (or an existing icon key — check how icons resolve), availability: 'available', href: '/settings/branding' }` to the `Workspace` group.
8. `apps/invoice/src/app/(app)/invoices/[invoiceId]/page.tsx` — spec §5.

Routes: `apps/invoice/src/app/(app)/settings/templates/page.tsx`, `templates/new/page.tsx`, `templates/[templateId]/page.tsx`, `settings/branding/page.tsx`, adapters in `_components/`. `logoHref` is `null` unless Invoice has an organization profile settings page.

## Verification (from repo root, one at a time)

```bash
pnpm --filter @876/invoice-app exec vitest run src/lib/api src/lib/client 'src/app/(app)/settings' 'src/app/(app)/invoices'
pnpm --filter @876/invoice-app typecheck
pnpm --filter @876/invoice-app lint
node scripts/check-app-structure.mjs
pnpm check:rsc-boundaries
```

## Report

`plans/2026-09-15-document-templates-and-branding/reports/cline/2026-09-15-invoice-host-templates.md`: files, counted tests, verification output, gaps.

## Reference implementation (now merged)

876 Billing already implements this spec — copy its page and adapter structure (not its transport, which differs):

- `apps/billing/src/app/(app)/settings/templates/` (`page.tsx`, `_components/document-type-tabs.tsx`, `_components/templates-gallery-data.tsx`, `_components/template-card-actions.tsx`, `new/`, `[templateId]/`)
- `apps/billing/src/app/(app)/settings/branding/`

The gallery accepts `newHref: string | null` and `editHrefBase: string | null`; pass `null` for viewers without the write permission.
