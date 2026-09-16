# Report: Billing API + `@876/billing` — document templates and branding (final)

Attempt 1 stopped on a core typing defect, fixed by orchestrator.

Attempts 2–3 added the module, SDK, tests, and contract artifacts but were killed
before verification. This attempt resumed from the current tree, fixed two lint
warnings, and ran every verification command.

## Files added

- `apps/billing-api/prisma/schema/document-template.prisma` — `DocumentTemplate` model.
- `apps/billing-api/prisma/schema/branding-preference.prisma` — `BrandingPreference` model.
- `apps/billing-api/prisma/migrations/20260915120000_document_templates_and_branding/migration.sql`
- `apps/billing-api/src/modules/document-templates/document-templates.{schemas,repository,serializers,service,controller,routes}.ts`
- `apps/billing-api/src/modules/document-templates/index.ts`
- `apps/billing-api/src/modules/document-templates/document-templates.{repository,service,routes}.test.ts`
- `packages/billing/src/types/document-template.ts` and `document-template.schema.ts`
- `packages/billing/src/types/branding.ts` and `branding.schema.ts`
- `packages/billing/src/resources/document-templates.ts` and `branding.ts`
- `packages/billing/src/resources/document-templates.test.ts` (12 cases, tenant + integration + branding + malformed rejection)
- `packages/billing/src/integration/resources/document-templates.ts` and `branding.ts`

## Files changed

- `apps/billing-api/prisma/schema/tenant.prisma` — back-relations for both models.
- `apps/billing-api/src/config/index.ts` + `apps/billing-api/.env.example` — `DELETION_MODE` (see Decisions).
- `apps/billing-api/src/platform/ids.ts` — `DocumentTemplate: 'dtpl'`.
- `apps/billing-api/src/http/routes.ts` — mounts the module router under `/api/v1`.
- `packages/core/src/lib/errors/billing.ts` — `billing/document-template-layout-unsupported` (422),
  `billing/document-template-limit-reached` (409), `billing/document-template-not-found` (404).
- `apps/billing-api/src/http/auth/__tests__/full-route-auth-matrix.test.ts` — frozen counts 380 -> 403 / 379 -> 402 (see Decisions).
- Regenerated artifacts: `apps/billing-api/src/http/openapi/v1-contract.generated.ts`,
  `apps/billing/contracts/v1/openapi.json`.
- `packages/billing/src/{client,schemas,types/index}.ts` and
  `packages/billing/src/integration/{client,schemas,types/index}.ts` — resource wiring.
- `apps/billing-api/src/modules/document-templates/` — removed an unused `Database` type and an
  unused `DEFAULT_DOCUMENT_TEMPLATE_LAYOUT` import flagged by lint (this attempt).

`packages/billing-ui/` and every `apps/*` besides `apps/billing-api` were not touched.

## Migration SQL (full)

```sql
CREATE TABLE "billing_document_templates" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "document_type" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "layout" TEXT NOT NULL,
  "is_default" BOOLEAN NOT NULL DEFAULT false,
  "settings" JSONB NOT NULL DEFAULT '{}',
  "schema_version" INTEGER NOT NULL,
  "created_by" TEXT,
  "updated_by" TEXT,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  "deleted_at" INTEGER,
  "deleted_by" TEXT,
  "deletion_reason" TEXT,

  CONSTRAINT "billing_document_templates_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "billing_document_templates_tenant_document_deleted_idx"
  ON "billing_document_templates" ("tenant_id", "document_type", "deleted_at");

CREATE UNIQUE INDEX "billing_document_templates_one_default_idx"
  ON "billing_document_templates" ("tenant_id", "document_type")
  WHERE "is_default" = true AND "deleted_at" IS NULL;

ALTER TABLE "billing_document_templates"
  ADD CONSTRAINT "billing_document_templates_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "billing_tenants"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "billing_branding_preferences" (
  "tenant_id" TEXT NOT NULL,
  "accent_color" TEXT NOT NULL,
  "appearance" TEXT NOT NULL,
  "sidebar_tone" TEXT NOT NULL,
  "updated_by" TEXT,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,

  CONSTRAINT "billing_branding_preferences_pkey" PRIMARY KEY ("tenant_id")
);

ALTER TABLE "billing_branding_preferences"
  ADD CONSTRAINT "billing_branding_preferences_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "billing_tenants"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
```

## Tests (counted `it()` cases)

- `document-templates.repository.test.ts`: 9 (live-only default-first list, tenant-isolated
  retrieve, first-create default, explicit-default clears prior, 25-limit refusal,
  unique-index race retries once as non-default, set-default single transaction,
  soft delete, hard delete).
- `document-templates.service.test.ts`: 19 (envelope, type filter, retrieve, not-found,
  create prefix, layout-unsupported on create/update, limit conflict, update,
  concurrent-missing update, set-default scoping/missing, soft/hard delete modes,
  resolve explicit/default/built-in, malformed settings degrade, branding delete-when-default).
- `document-templates.routes.test.ts`: 17 (401, sales:read/write 403s, strict unknown-key
  rejection, discriminators, 404 envelope without `httpStatus`, integration read/write scopes).
- `packages/billing/src/resources/document-templates.test.ts`: 12 (paths, methods, bodies,
  org-scoped integration paths, malformed-response rejection).
- Repository + service: 28 (>= 18). Routes: 17 (>= 14). SDK: 12 (>= 10).

## Verification (each run once, foreground)

| Command | Result |
| --- | --- |
| `pnpm --filter @876/billing-api db:generate` | pass (Prisma Client 7.9.1) |
| `pnpm --filter @876/billing-api db:validate` | pass with `BILLING_DATABASE_URL` set ("schemas are valid"); bare run fails resolving that env var (pre-existing script behavior, unrelated to the schema) |
| `pnpm --filter @876/billing-api typecheck` | pass, 0 errors (re-run after the lint cleanup) |
| `pnpm --filter @876/billing-api lint` | pass, 0 errors; 7 warnings, none in this module after cleanup |
| `pnpm --filter @876/billing-api boundaries` | pass, no violations (715 modules, 2334 deps) |
| `pnpm --filter @876/billing-api test` (full) | pass, 128 files / 1136 tests, 0 failures |
| `pnpm --filter @876/billing-api api:contract:check` | pass, 0 mismatches |
| `pnpm --filter @876/billing test` | 408 pass, 2 fail — both pre-existing in `src/types/__tests__/payment.schema.test.ts` (payment-mode image fields from an unrelated commit; files untouched here) |
| `pnpm --filter @876/billing typecheck` | pass, 0 errors |

No database-connecting Prisma commands were run. No `eslint-disable`, `@ts-ignore`,
`@ts-expect-error`, or `as any` added.

## List envelope

`listObject` produces `{ object: 'list', data, has_more, total_count, url }`
(snake_case), matching sibling endpoints; asserted in service and route tests.

## Decisions

- `DELETION_MODE` kept: no prior deletion-policy mechanism exists in billing-api
  (only tenant tombstone bookkeeping), and `deletions.md` prescribes exactly this
  variable. `.env.example` carries `# optional — defaults to soft in production, hard elsewhere`.
- Concurrent first-creates: the partial-unique loser retries once as non-default
  instead of leaking a Prisma P2002 (tested). Other unique violations rethrow.
- Matrix 380 -> 403: the 18 new operations plus 5 integration currency routes added
  by `7cffe47ff` after the matrix was last bumped (that commit regenerated the
  contract but not the frozen counts, so HEAD's 380 was already stale). Verified:
  current spec holds 403 total operations, 18 of them document-template/branding.
- `apps/billing/contracts/v1/route-manifest.json` intentionally untouched: it covers
  the billing-app BFF surface, not the billing-api v1 registry.
- SDK types reuse `brandingSchema` / `documentTemplateSettingsSchema` /
  `documentTemplateOverridesSchema` from `@876/core`; no same-name re-inference
  (the circular-reference typecheck failures are resolved).

## Not done

- Nothing outstanding from the brief. The 2 `@876/billing` payment-schema failures
  pre-exist on unrelated files and were left alone.
