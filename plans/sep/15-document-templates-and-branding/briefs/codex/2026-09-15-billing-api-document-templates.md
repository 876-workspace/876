# Brief: Billing API + `@876/billing` — document templates and branding

Working directory: `/root/projects/876-invoice-branding`. You are on a git branch prepared for you. **Do not commit, switch branches, create worktrees, push, or open PRs.** Do not touch `apps/couriers/`, `apps/billing/`, `apps/invoice/`, or `packages/billing-ui/` — other agents own those.

## Rules to read first (binding)

`.claude/rules/express-api.md`, `.claude/rules/api-backend.md`, `.claude/rules/billing-data-plane.md`, `.claude/rules/billing-commercial-platform.md`, `.claude/rules/module-settings.md` (resolution / defaults-never-stored), `.claude/rules/deletions.md`, `.claude/rules/naming.md`, `.claude/rules/sdk-conventions.md`, `.claude/rules/error-handling.md`, `.claude/rules/testing.md`, `.claude/rules/ai-code-quality.md`.

## The contract already exists — consume it, do not restate it

Read these (written by the orchestrator; do not change their behavior — if you find a real defect, stop and report it):

- `packages/core/src/lib/document-templates/schema.ts` — `DOCUMENT_TEMPLATE_TYPES`, `documentTemplateTypeSchema`, `documentTemplateLayoutKeySchema`, `documentTemplateOverridesSchema`, `documentTemplateSettingsSchema`, `DOCUMENT_TEMPLATE_SCHEMA_VERSION`.
- `packages/core/src/lib/document-templates/layouts.ts` — `layoutSupportsDocumentType`, `DEFAULT_DOCUMENT_TEMPLATE_LAYOUT`, `layoutDefaults`.
- `packages/core/src/lib/document-templates/resolve.ts` — `resolveDocumentTemplate(layout, type, overrides)`.
- `packages/core/src/lib/branding/index.ts` — `brandingSchema`, `brandingUpdateSchema`, `resolveBranding`, `DEFAULT_BRANDING`.

Import them from `@876/core/document-templates` and `@876/core/branding`.

## Reference implementation to copy

The invoice-preferences stack is the closest precedent. Read it end to end before writing:

- `apps/billing-api/prisma/schema/invoice-preference.prisma`, `document-preference.prisma`
- `apps/billing-api/src/modules/documents/documents.routes.ts` (search `invoice-preferences` for the tenant tier, and `/integrations/organizations/:organizationId/invoices` for the integration tier with `kind: 'integration'` + `scope`)
- `apps/billing-api/src/modules/documents/repositories/invoice-preferences/*`
- `packages/billing/src/resources/invoice-preferences.ts` and how it is wired in `packages/billing/src/client.ts`, plus the integration client in `packages/billing/src/integration/` and `packages/billing/src/service.ts`.

## Deliverables

### 1. Prisma models (new files) + hand-written migration

`apps/billing-api/prisma/schema/document-template.prisma`:

```prisma
/// An organization's customized PDF/print template for one document type.
/// Stores only overrides of the built-in layout defaults (`settings`); a tenant
/// with no rows renders every document with the built-in standard layout.
model DocumentTemplate {
  id             String  @id
  tenantId       String  @map("tenant_id")
  documentType   String  @map("document_type")   // @876/core DOCUMENT_TEMPLATE_TYPES, kebab-case
  name           String
  layout         String                          // @876/core DOCUMENT_TEMPLATE_LAYOUT_KEYS
  isDefault      Boolean @default(false) @map("is_default")
  settings       Json    @default("{}")
  schemaVersion  Int     @map("schema_version")
  createdBy      String? @map("created_by")
  updatedBy      String? @map("updated_by")
  createdAt      Int     @map("created_at")
  updatedAt      Int     @map("updated_at")
  deletedAt      Int?    @map("deleted_at")
  deletedBy      String? @map("deleted_by")
  deletionReason String? @map("deletion_reason")
  // tenant relation + @@index([tenantId, documentType, deletedAt]) + @@map("billing_document_templates")
}
```

`apps/billing-api/prisma/schema/branding-preference.prisma`: `BrandingPreference` keyed by `tenantId` (`@id`), columns `accent_color`, `appearance`, `sidebar_tone`, `updated_by`, `created_at`, `updated_at`, table `billing_branding_preferences`, cascade to tenant like `InvoicePreference`. Add the back-relations on `Tenant`.

Migration: `apps/billing-api/prisma/migrations/20260915120000_document_templates_and_branding/migration.sql`, hand-written, matching the existing migration style (look at the last three migrations). Include a **partial unique index** so at most one live default exists per tenant + type:

```sql
CREATE UNIQUE INDEX "billing_document_templates_one_default_idx"
  ON "billing_document_templates" ("tenant_id", "document_type")
  WHERE "is_default" = true AND "deleted_at" IS NULL;
```

**Never run `prisma migrate`, `db:deploy`, `db:drift`, `db:baseline`, or anything that connects to a database** — dev and production share one Neon database. `db:generate` and `db:validate` are fine.

### 2. Billing API module `apps/billing-api/src/modules/document-templates/`

Standard module shape (`*.routes.ts`, `*.controller.ts`, `*.service.ts`, `*.repository.ts`, `*.schemas.ts`, `*.serializers.ts`, `*.docs.ts` if the service uses them, `index.ts`). Register the router the same way other modules are composed in `src/http/routes.ts`.

Tenant tier (session callers — 876 Billing): `read = { kind: 'tenant', permission: 'sales:read' }`, `write = { kind: 'tenant', permission: 'sales:write' }`.

| Method | Path | Behavior |
| --- | --- | --- |
| GET | `/document-templates?documentType=` | list live templates for tenant (optionally one type), ordered default first then `createdAt` |
| POST | `/document-templates` | body `{ documentType, name (1–80), layout, settings? (overrides, default {}), isDefault? }` |
| GET | `/document-templates/:templateId` | one live template |
| PATCH | `/document-templates/:templateId` | `{ name?, layout?, settings? }` — `settings` **replaces** stored overrides |
| POST | `/document-templates/:templateId/set-default` | makes it default; clears the previous default for that type in the **same transaction** |
| DELETE | `/document-templates/:templateId` | soft/hard per the service's existing `DELETION_MODE` handling; returns tombstone `{ object: 'document-template', id, deleted: true }` |
| GET | `/document-templates/resolved?documentType=&templateId=` | the render-ready template: `templateId` given → that template; else the tenant default for the type; else the built-in layout. |
| GET | `/branding` | resolved branding (defaults when no row) |
| PATCH | `/branding` | `brandingUpdateSchema` body; if the merged result equals `DEFAULT_BRANDING`, **delete the row** instead of storing defaults |

Integration tier (876 Invoice, 876 Couriers) — same capabilities under `/integrations/organizations/:organizationId/document-templates…` and `/integrations/organizations/:organizationId/branding`, security `{ kind: 'integration', scope: 'billing.invoices.read' }` for reads and `'billing.invoices.write'` for writes. **Implement each capability once in the service**; the two route sets differ only in guard and tenant resolution (copy how the invoices integration routes resolve the tenant).

Validation / business rules (in the service, not the controller):

- `layout` must support `documentType` (`layoutSupportsDocumentType`) → registered error `billing/document-template-layout-unsupported` (422).
- `settings` validated with `documentTemplateOverridesSchema` at the route; stored with `schemaVersion: DOCUMENT_TEMPLATE_SCHEMA_VERSION`.
- At most 25 live templates per tenant + type → `billing/document-template-limit-reached` (409).
- Unknown / other-tenant / deleted id → `billing/document-template-not-found` (404). Tenant isolation must be a filter in the loading query (`where: { id, tenantId, deletedAt: null }`), never load-then-compare.
- Creating with `isDefault: true`, or creating the first template of a type, makes it the default (transactionally clearing any other).
- Deleting the default leaves the type with no default (renders built-in layout). Do not auto-promote another template.
- Register the new error codes in the service's existing error catalog (find it; do not hand-build error objects). Follow this service's current throw-to-middleware pattern for expected errors (see error-handling.md "Migration state" — billing-api is unmigrated; do not half-migrate it).

Serialized resources — **new contracts use camelCase JSON and kebab-case object values**:

```ts
// document-template
{ object: 'document-template', id, documentType, name, layout, isDefault,
  settings /* stored overrides */, resolvedSettings /* resolveDocumentTemplate(...) */,
  createdAt, updatedAt }

// resolved-document-template
{ object: 'resolved-document-template', documentType, templateId: string | null,
  name: string | null, layout, settings /* fully resolved */, branding /* resolveBranding(row) */ }

// branding
{ object: 'branding', accentColor, appearance, sidebarTone, updatedAt: number | null }
```

Resolution must use `resolveDocumentTemplate` / `resolveBranding`, so a malformed stored row degrades to defaults instead of 500ing. For lists, reuse this service's existing list envelope helper so the response matches its sibling endpoints; state in your report exactly what list field spelling it produced.

IDs: use the service's existing ID generation helper (find how `InvoicePreference`-adjacent or payment-mode ids are generated) with prefix `dtpl`.

Regenerate the OpenAPI contract artifacts with the package's own scripts (`api:contract:generate`, `api:contract:manifest:generate`) so `api:contract:check` passes.

### 3. `@876/billing` SDK

- `packages/billing/src/resources/document-templates.ts` → `documentTemplates.{ list, create, retrieve, update, delete, setDefault, resolve }` and `packages/billing/src/resources/branding.ts` → `branding.{ retrieve, update }`, wired into the tenant client (`client.ts`) beside `invoicePreferences`.
- Integration/service entrypoint: the same verbs taking `organizationId` first, wired where the integration invoices resource is.
- Schemas/types in the package's existing `schemas`/`types` locations (reuse `documentTemplateSettingsSchema`/`documentTemplateOverridesSchema`/`brandingSchema` from `@876/core` inside the response schemas — do not redeclare them).

## Tests (floors — counted `it()` cases)

- repository/service: ≥ 18 (create default rules, set-default transaction clears previous, limit, layout-unsupported, tenant isolation on retrieve/update/delete/set-default, soft vs hard delete, malformed stored settings resolve to defaults, branding delete-when-default, resolved fallback order templateId → default → built-in).
- routes via Supertest through the assembled app: ≥ 14 (401/403 per tier, tenant permission `sales:read` vs `sales:write`, integration scope read vs write, strict body rejection of unknown keys, 404 shape, response `object` discriminators, `httpStatus` never in the JSON).
- SDK: ≥ 10 (paths, methods, bodies, malformed-response rejection) in the package's existing test style.

Mocks: follow `.claude/rules/testing.md` (no stacked unconsumed `mockResolvedValueOnce`; real timers unless you freeze the clock before building fixtures).

## Verification — run ONE at a time, foreground

```bash
pnpm --filter @876/billing-api db:generate
pnpm --filter @876/billing-api db:validate
pnpm --filter @876/billing-api typecheck
pnpm --filter @876/billing-api lint
pnpm --filter @876/billing-api boundaries
pnpm --filter @876/billing-api test
pnpm --filter @876/billing-api api:contract:check
pnpm --filter @876/billing test
pnpm --filter @876/billing typecheck
```

Never add `eslint-disable`, `@ts-ignore`, `@ts-expect-error`, or `as any`.

## Report (required)

`plans/2026-09-15-document-templates-and-branding/reports/codex/2026-09-15-billing-api-document-templates.md`: files added/changed, the migration SQL in full, counted tests per file, verification results (actual pass/fail numbers), list-envelope spelling produced, decisions the brief did not settle, and anything not done.
