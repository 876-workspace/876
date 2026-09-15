# Shared spec: hosting document templates and branding in a finance app

Every host brief (Billing, Invoice, Couriers) implements this same surface with that app's own transport, guards and paths. Read this once; the host brief tells you the exact files.

## Components you mount (already built, do not modify `packages/*`)

```ts
// @876/billing-ui/documents/document-template-gallery  (server-renderable)
DocumentTemplateGallery(props: {
  documentType: DocumentTemplateType            // 'invoice' | 'quote' | 'sales-receipt' | 'credit-note' | 'payment-receipt'
  templates: { id: string; name: string; layout: DocumentTemplateLayoutKey; isDefault: boolean; settings: DocumentTemplateSettings }[]
  branding: Branding
  newHref: string                                // e.g. `/settings/templates/new?type=invoice`
  editHrefBase: string                           // renders `${editHrefBase}/${id}`
  cardActions?: Record<string, ReactNode>        // pre-rendered per-template actions (your client component)
})

// @876/billing-ui/documents/document-template-editor  ('use client'; only render from YOUR client adapter)
DocumentTemplateEditor(props: {
  documentType; branding: Branding
  initial: { name: string; layout: DocumentTemplateLayoutKey; settings: DocumentTemplateOverrides }
  seller?: TemplatedDocumentSeller; submitLabel?: string; cancelHref: string
  onSubmit: (value: { name; layout; settings: DocumentTemplateOverrides }) => Promise<{ error: { message: string } | null }>
})

// @876/billing-ui/documents/branding-settings-form  ('use client'; only render from YOUR client adapter)
BrandingSettingsForm(props: {
  initial: Branding; logoUrl: string | null; logoHref: string | null
  onSubmit: (value: Branding) => Promise<{ error: { message: string } | null }>
})

// @876/billing-ui/panels/invoice-document-panel — existing; now accepts two OPTIONAL props:
//   template?: { layout: DocumentTemplateLayoutKey; settings: DocumentTemplateSettings }
//   branding?: Branding
```

Types come from `@876/core/document-templates` and `@876/core/branding`.

## SDK (already built)

- Tenant client (Billing app): `billing.documentTemplates.{list({ documentType? }), create(params), retrieve(id), update(id, params), delete(id), setDefault(id), resolve({ documentType, templateId? })}` and `billing.branding.{retrieve(), update(params)}`.
- Integration client (Invoice, Couriers): same verbs with `organizationId` first, e.g. `integration.documentTemplates.list(orgId, { documentType })`, `integration.branding.retrieve(orgId)`.
- A template resource: `{ object: 'document-template', id, documentType, name, layout, isDefault, settings /* overrides */, resolvedSettings, createdAt, updatedAt }`. `resolve` returns `{ object: 'resolved-document-template', documentType, templateId, name, layout, settings /* resolved */, branding }`.
- List responses use the legacy spelling `{ object: 'list', data, has_more, total_count, url }`.
- Authorization in Billing API: reads need `sales:read` (tenant) / `billing.invoices.read` (integration); writes `sales:write` / `billing.invoices.write`.

## Pages (paths relative to the app's settings root)

1. **`settings/templates`** — server page. Resolve `?type=` (default `invoice`; unknown → `invoice`) against `DOCUMENT_TEMPLATE_TYPES`. Render the page title "Templates", a `RouteTabs`-style link row with one tab per document type (labels from `DOCUMENT_TITLES` in `@876/core/document-templates`; each tab links `?type=<type>`), and inside a `<Suspense>` boundary an async data component that loads templates for the type + branding in `Promise.all` and renders `DocumentTemplateGallery` with `resolvedSettings` as each card's `settings`. Pass `cardActions` built from a small client component `TemplateCardActions({ templateId, isDefault, canManage })` offering **Set as default** (hidden when already default) and **Delete** (confirm with `AlertDialog`), each calling your browser client then `router.refresh()`. Hide actions and the new link when the viewer lacks the write permission. Load failures render `AppError` banner above an empty gallery (keep the page chrome), per `.claude/rules/error-handling.md`.
2. **`settings/templates/new`** — server page reads `?type=`, loads branding, renders client adapter `TemplateEditorForm` with `initial = { name: '<Title> template', layout: 'standard', settings: {} }`, `submitLabel="Save"`, `cancelHref` back to the list. `onSubmit` → browser client create → on success `router.push(list?type=…)`; on error return `{ error: { message } }`.
3. **`settings/templates/[templateId]`** — server page loads the template (404 via `notFound()` when the retrieve returns the not-found error) and branding, renders the same adapter in update mode (`initial` from the resource's `name`, `layout`, `settings`).
4. **`settings/branding`** — server page loads branding and the org logo URL (reuse how the invoice detail page already resolves the seller logo), renders client adapter `BrandingForm` wrapping `BrandingSettingsForm`; `logoHref` points at the app's organization-profile settings page if it has one, else `null`.
5. **Invoice detail page** — where `InvoiceDocumentPanel` is already rendered, fetch `resolve({ documentType: 'invoice' })` in the same `Promise.all` as the page's existing reads and pass `template={{ layout, settings }}` and `branding`. If the resolve call fails, render the panel without those props (built-in defaults) — a template outage must never block an invoice.

Page rules: follow `.claude/rules/app-layout.md` (Page container, `876-page-title`, no description paragraphs, `info` button variant, bare verb labels), `.claude/rules/data-loading.md` (chrome outside Suspense), `.claude/rules/app-structure.md` (`_components/` beside the route), and `.claude/rules/production-render-errors.md` Rule 1: **never pass a function prop from a server component to a client component** — callbacks are created inside your `'use client'` adapters.

Metadata titles: `Templates`, `New Template`, `Edit Template`, `Branding` (no app suffix).

## Tests (floors)

- route handlers: authorization denied (403) and allowed paths, invalid body 400, exact SDK call arguments — ≥ 8
- adapters: `TemplateEditorForm` create vs update calls the right client method with exact args and navigates; error returned keeps the form; `TemplateCardActions` set-default/delete call exact client methods; `BrandingForm` submit — ≥ 8
- page: `?type=` resolution (valid, unknown, missing) — ≥ 3
- nav/settings registry: the new entries exist with the right href/permission, including the app's existing binding/anti-drift tests — update, don't weaken.

Match each app's existing test style and vitest environment (check `vitest.config.ts`; add `/** @vitest-environment jsdom */` per file only if neighbours do).

## Never

- Modify `packages/*`, `apps/billing-api`, or another app.
- `eslint-disable`, `@ts-ignore`, `as any`.
- Server actions, raw `fetch` to a service, a generic proxy whose resource comes from the URL.
- Commit, branch, push.
