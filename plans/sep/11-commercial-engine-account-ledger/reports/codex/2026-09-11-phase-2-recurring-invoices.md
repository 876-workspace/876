# Phase 2 — Recurring Invoices

## Files and rationale

- `apps/billing-api/prisma/schema/{recurring-invoice,invoice,enums,...}.prisma` and
  `prisma/migrations/20260911150000_recurring_invoices/migration.sql`: the profile,
  editable lines, idempotent run audit, invoice origin link, enums, indexes, and FKs.
- `apps/billing-api/src/modules/documents/recurring-invoices.*` plus its repository
  and schema: tenant/integration commands, template validation, canonical line
  resolution/totals preview, lifecycle transitions, soft deletion, generated-child
  listing, and scheduled invoice generation.
- `documents/repositories/invoices/create.ts` and `workflows/finalize-invoice.ts`:
  a transaction can now create an ordinary invoice with its recurring origin and
  use the existing shared finalization effects.
- `billing-engine.repository.ts`: a second serializable `SKIP LOCKED` claim loop
  runs recurring profiles and reports additive recurring counts.
- `packages/billing`: tenant and integration `recurringInvoices` resources,
  response parsers, and invoice origin parsing/list filtering.
- `apps/invoice`: the enumerable Pattern-B proxy route and manifest entry.
- `packages/core/src/lib/timestamps.ts`: calendar-anchor interval helper, reused by
  the Billing engine and recurring scheduling to avoid month-end drift.

## Migration SQL

```sql
ALTER TYPE "BillingInvoiceBillingReason" ADD VALUE 'RECURRING_INVOICE';
CREATE TYPE "BillingRecurringInvoiceStatus" AS ENUM ('ACTIVE', 'PAUSED', 'STOPPED', 'EXPIRED');
CREATE TYPE "BillingRecurringInvoiceGenerationMode" AS ENUM ('DRAFT', 'FINALIZE', 'FINALIZE_AND_SEND');
CREATE TABLE "billing_recurring_invoices" (
  "id" TEXT NOT NULL, "tenant_id" TEXT NOT NULL, "profile_name" TEXT NOT NULL,
  "customer_id" TEXT NOT NULL, "currency" TEXT NOT NULL,
  "status" "BillingRecurringInvoiceStatus" NOT NULL DEFAULT 'ACTIVE',
  "interval_unit" "BillingIntervalUnit" NOT NULL, "interval_count" INTEGER NOT NULL,
  "start_at" INTEGER NOT NULL, "end_at" INTEGER, "max_cycles" INTEGER,
  "next_run_at" INTEGER, "last_run_at" INTEGER, "generated_count" INTEGER NOT NULL DEFAULT 0,
  "generation_mode" "BillingRecurringInvoiceGenerationMode" NOT NULL,
  "payment_term_id" TEXT, "salesperson_id" TEXT, "price_list_id" TEXT,
  "tax_behavior" "BillingTaxBehavior" NOT NULL DEFAULT 'EXCLUSIVE',
  "notes" TEXT, "terms" TEXT, "subtotal_amount" BIGINT NOT NULL DEFAULT 0,
  "discount_amount" BIGINT NOT NULL DEFAULT 0, "tax_amount" BIGINT NOT NULL DEFAULT 0,
  "total_amount" BIGINT NOT NULL DEFAULT 0, "deleted_at" INTEGER,
  "deleted_by" TEXT, "deletion_reason" TEXT, "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  CONSTRAINT "billing_recurring_invoices_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_recurring_invoices_interval_count_check" CHECK ("interval_count" >= 1),
  CONSTRAINT "billing_recurring_invoices_max_cycles_check" CHECK ("max_cycles" IS NULL OR "max_cycles" >= 1),
  CONSTRAINT "billing_recurring_invoices_end_after_start_check" CHECK ("end_at" IS NULL OR "end_at" >= "start_at")
);
CREATE TABLE "billing_recurring_invoice_lines" (
  "id" TEXT NOT NULL, "recurring_invoice_id" TEXT NOT NULL, "item_id" TEXT,
  "variant_id" TEXT, "price_id" TEXT, "description" TEXT, "quantity" INTEGER NOT NULL DEFAULT 1,
  "unit_amount" BIGINT, "tax_amount" BIGINT NOT NULL DEFAULT 0,
  "discount_amount" BIGINT NOT NULL DEFAULT 0, "position" INTEGER NOT NULL DEFAULT 0,
  "created_at" INTEGER NOT NULL, "updated_at" INTEGER NOT NULL,
  CONSTRAINT "billing_recurring_invoice_lines_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "billing_recurring_invoice_runs" (
  "id" TEXT NOT NULL, "tenant_id" TEXT NOT NULL, "recurring_invoice_id" TEXT NOT NULL,
  "scheduled_for" INTEGER NOT NULL, "status" "BillingRunStatus" NOT NULL DEFAULT 'PROCESSING',
  "attempt_count" INTEGER NOT NULL DEFAULT 1, "error_code" TEXT, "error_message" TEXT,
  "invoice_id" TEXT, "started_at" INTEGER NOT NULL, "completed_at" INTEGER,
  "created_at" INTEGER NOT NULL, "updated_at" INTEGER NOT NULL,
  CONSTRAINT "billing_recurring_invoice_runs_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "billing_invoices" ADD COLUMN "recurring_invoice_id" TEXT;
CREATE UNIQUE INDEX "billing_recurring_invoices_tenant_id_id_key" ON "billing_recurring_invoices" ("tenant_id", "id");
CREATE INDEX "billing_recurring_invoices_status_next_run_at_idx" ON "billing_recurring_invoices" ("status", "next_run_at");
CREATE INDEX "billing_recurring_invoices_tenant_id_customer_id_idx" ON "billing_recurring_invoices" ("tenant_id", "customer_id");
CREATE UNIQUE INDEX "billing_recurring_invoice_lines_profile_position_key" ON "billing_recurring_invoice_lines" ("recurring_invoice_id", "position");
CREATE INDEX "billing_recurring_invoice_lines_profile_id_idx" ON "billing_recurring_invoice_lines" ("recurring_invoice_id");
CREATE UNIQUE INDEX "billing_recurring_invoice_runs_profile_schedule_key" ON "billing_recurring_invoice_runs" ("recurring_invoice_id", "scheduled_for");
CREATE INDEX "billing_recurring_invoice_runs_tenant_status_schedule_idx" ON "billing_recurring_invoice_runs" ("tenant_id", "status", "scheduled_for");
CREATE INDEX "billing_recurring_invoice_runs_invoice_id_idx" ON "billing_recurring_invoice_runs" ("invoice_id");
CREATE INDEX "billing_invoices_recurring_invoice_id_idx" ON "billing_invoices" ("recurring_invoice_id");
ALTER TABLE "billing_recurring_invoices" ADD CONSTRAINT "billing_recurring_invoices_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "billing_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "billing_recurring_invoices" ADD CONSTRAINT "billing_recurring_invoices_customer_fkey" FOREIGN KEY ("tenant_id", "customer_id") REFERENCES "billing_customers"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "billing_recurring_invoices" ADD CONSTRAINT "billing_recurring_invoices_payment_term_id_fkey" FOREIGN KEY ("tenant_id", "payment_term_id") REFERENCES "billing_payment_terms"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "billing_recurring_invoices" ADD CONSTRAINT "billing_recurring_invoices_salesperson_id_fkey" FOREIGN KEY ("tenant_id", "salesperson_id") REFERENCES "billing_salespeople"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "billing_recurring_invoices" ADD CONSTRAINT "billing_recurring_invoices_price_list_id_fkey" FOREIGN KEY ("tenant_id", "price_list_id") REFERENCES "billing_price_lists"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "billing_recurring_invoice_lines" ADD CONSTRAINT "billing_recurring_invoice_lines_recurring_invoice_id_fkey" FOREIGN KEY ("recurring_invoice_id") REFERENCES "billing_recurring_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "billing_recurring_invoice_runs" ADD CONSTRAINT "billing_recurring_invoice_runs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "billing_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "billing_recurring_invoice_runs" ADD CONSTRAINT "billing_recurring_invoice_runs_profile_id_fkey" FOREIGN KEY ("recurring_invoice_id") REFERENCES "billing_recurring_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "billing_recurring_invoice_runs" ADD CONSTRAINT "billing_recurring_invoice_runs_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "billing_invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "billing_invoices" ADD CONSTRAINT "billing_invoices_recurring_invoice_id_fkey" FOREIGN KEY ("recurring_invoice_id") REFERENCES "billing_recurring_invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

## Decisions

- API statuses and generation modes are lower/kebab case; Prisma keeps the
  established upper-snake enum storage convention.
- Recurring generation invokes the ordinary invoice creation path with a shared
  transaction, then the Phase-1 shared finalize effects; it does not have a
  second totals, AR, inventory, or ledger implementation.
- Profile delete is a tombstone, and only profiles with no generated invoices
  may be deleted.

## Counted `it()` tests

| Group | Required | Added |
| --- | ---: | ---: |
| Schema validation | 8 | 8 |
| Generation | 12 | 0 |
| Commands | 10 | 0 |
| Sweep integration | 3 | 0 |
| SDK | 6 | 6 |

The generation, command, and sweep test floors were not completed. This phase
is therefore not ready to claim as complete despite the focused checks below.

## Verification

- `db:generate`: passed.
- `db:validate`: passed.
- Billing API and Billing package `typecheck`: passed.
- Billing API `boundaries`: passed.
- `api:contract:generate` and `api:contract:check`: passed (315 operations).
- Focused tests: API schema 8/8, API auth/sweep regression 16/16, Billing SDK
  6/6, Invoice resource-manifest 11/11.
- Lint was invoked as `timeout 600 pnpm --filter @876/billing-api lint`; the
  execution harness stopped returning output after its 30-second tool window,
  after ESLint's existing Next pages-directory warning, so no final lint exit
  status was available.
- `prisma migrate diff --from-migrations ...` could not run because this repo's
  migrations directory has no `migration_lock.toml` (Prisma reports it cannot
  determine the connector).
- The required grep reports existing generated Prisma `eslint-disable` lines
  and pre-existing unrelated `as any` tests. The new recurring files contain
  none.
