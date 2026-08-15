-- 876 Billing: accounts-receivable accounting core
--
-- Additive to the Billing-owned table family. Core 876 tables are never
-- referenced. Every new column is defaulted, so existing rows are preserved.
--
-- Adds:
--   * InvoiceStatus PARTIALLY_PAID (partial settlement)
--   * billing_payments.unapplied_amount (advance / overpayment -> customer credit)
--   * billing_customers.outstanding_receivable + unused_credits (denormalized AR)
--   * billing_credit_notes / _lines / _allocations (credit memos)
--   * billing_refunds (cash returned to a customer)

-- Enum value additions must run outside the transaction that uses them, so
-- this runs first (autocommit) and is safe to re-run.
ALTER TYPE "BillingInvoiceStatus" ADD VALUE IF NOT EXISTS 'PARTIALLY_PAID' AFTER 'SENT';

BEGIN;

CREATE TYPE "BillingCreditNoteStatus" AS ENUM ('DRAFT', 'OPEN', 'CLOSED', 'VOID');

-- Payments: track the unallocated remainder as customer credit ------------

ALTER TABLE "billing_payments"
  ADD COLUMN "unapplied_amount" BIGINT NOT NULL DEFAULT 0;

-- Backfill: unapplied = amount - already-allocated to invoices.
UPDATE "billing_payments" p
  SET "unapplied_amount" = p."amount" - COALESCE((
    SELECT SUM(a."amount")
    FROM "billing_payment_allocations" a
    WHERE a."payment_id" = p."id" AND a."tenant_id" = p."tenant_id"
  ), 0);

-- Customers: denormalized AR position -------------------------------------

ALTER TABLE "billing_customers"
  ADD COLUMN "outstanding_receivable" BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN "unused_credits" BIGINT NOT NULL DEFAULT 0;

-- Backfill: outstanding receivable = sum of open invoice balances.
UPDATE "billing_customers" c
  SET "outstanding_receivable" = COALESCE((
    SELECT SUM(i."amount_due")
    FROM "billing_invoices" i
    WHERE i."customer_id" = c."id"
      AND i."status" IN ('SENT', 'OVERDUE', 'PARTIALLY_PAID')
  ), 0);

-- Backfill: unused credits = sum of unapplied payment amounts.
UPDATE "billing_customers" c
  SET "unused_credits" = COALESCE((
    SELECT SUM(p."unapplied_amount")
    FROM "billing_payments" p
    WHERE p."customer_id" = c."id" AND p."tenant_id" = c."tenant_id"
  ), 0);

-- Credit notes ------------------------------------------------------------

CREATE TABLE "billing_credit_notes" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "customer_id" TEXT NOT NULL,
  "invoice_id" TEXT,
  "number" TEXT NOT NULL,
  "status" "BillingCreditNoteStatus" NOT NULL DEFAULT 'DRAFT',
  "currency" TEXT NOT NULL,
  "reason" TEXT,
  "subtotal_amount" BIGINT NOT NULL DEFAULT 0,
  "tax_amount" BIGINT NOT NULL DEFAULT 0,
  "total_amount" BIGINT NOT NULL DEFAULT 0,
  "balance_amount" BIGINT NOT NULL DEFAULT 0,
  "notes" TEXT,
  "terms" TEXT,
  "metadata" JSONB,
  "issue_at" INTEGER,
  "voided_at" INTEGER,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  CONSTRAINT "billing_credit_notes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_credit_notes_tenant_id_id_key" UNIQUE ("tenant_id", "id"),
  CONSTRAINT "billing_credit_notes_tenant_id_number_key" UNIQUE ("tenant_id", "number"),
  CONSTRAINT "billing_credit_notes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "billing_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_credit_notes_customer_fkey" FOREIGN KEY ("tenant_id", "customer_id") REFERENCES "billing_customers"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "billing_credit_notes_invoice_fkey" FOREIGN KEY ("invoice_id") REFERENCES "billing_invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "billing_credit_notes_tenant_id_status_idx" ON "billing_credit_notes" ("tenant_id", "status");
CREATE INDEX "billing_credit_notes_customer_id_idx" ON "billing_credit_notes" ("customer_id");
CREATE INDEX "billing_credit_notes_invoice_id_idx" ON "billing_credit_notes" ("invoice_id");

CREATE TABLE "billing_credit_note_lines" (
  "id" TEXT NOT NULL,
  "credit_note_id" TEXT NOT NULL,
  "item_id" TEXT,
  "price_id" TEXT,
  "description" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "unit_amount" BIGINT NOT NULL,
  "tax_amount" BIGINT NOT NULL DEFAULT 0,
  "discount_amount" BIGINT NOT NULL DEFAULT 0,
  "total_amount" BIGINT NOT NULL,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  CONSTRAINT "billing_credit_note_lines_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_credit_note_lines_credit_note_fkey" FOREIGN KEY ("credit_note_id") REFERENCES "billing_credit_notes"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_credit_note_lines_item_fkey" FOREIGN KEY ("item_id") REFERENCES "billing_items"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "billing_credit_note_lines_price_fkey" FOREIGN KEY ("price_id") REFERENCES "billing_prices"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "billing_credit_note_lines_credit_note_id_idx" ON "billing_credit_note_lines" ("credit_note_id");
CREATE INDEX "billing_credit_note_lines_item_id_idx" ON "billing_credit_note_lines" ("item_id");
CREATE INDEX "billing_credit_note_lines_price_id_idx" ON "billing_credit_note_lines" ("price_id");

CREATE TABLE "billing_credit_note_allocations" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "credit_note_id" TEXT NOT NULL,
  "invoice_id" TEXT NOT NULL,
  "amount" BIGINT NOT NULL,
  "invoice_status_before" "BillingInvoiceStatus" NOT NULL,
  "invoice_paid_at_before" INTEGER,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  CONSTRAINT "billing_credit_note_allocations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_credit_note_allocations_credit_note_id_invoice_id_key" UNIQUE ("credit_note_id", "invoice_id"),
  CONSTRAINT "billing_credit_note_allocations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "billing_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_credit_note_allocations_credit_note_fkey" FOREIGN KEY ("tenant_id", "credit_note_id") REFERENCES "billing_credit_notes"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_credit_note_allocations_invoice_fkey" FOREIGN KEY ("tenant_id", "invoice_id") REFERENCES "billing_invoices"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "billing_credit_note_allocations_tenant_credit_note_idx" ON "billing_credit_note_allocations" ("tenant_id", "credit_note_id");
CREATE INDEX "billing_credit_note_allocations_tenant_invoice_idx" ON "billing_credit_note_allocations" ("tenant_id", "invoice_id");

-- Refunds -----------------------------------------------------------------

CREATE TABLE "billing_refunds" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "customer_id" TEXT NOT NULL,
  "credit_note_id" TEXT,
  "payment_id" TEXT,
  "payment_mode_id" TEXT,
  "deposit_account_id" TEXT,
  "number" TEXT NOT NULL,
  "amount" BIGINT NOT NULL,
  "currency" CHAR(3) NOT NULL,
  "reason" TEXT,
  "notes" TEXT,
  "refunded_at" INTEGER NOT NULL,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  CONSTRAINT "billing_refunds_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_refunds_tenant_id_id_key" UNIQUE ("tenant_id", "id"),
  CONSTRAINT "billing_refunds_tenant_id_number_key" UNIQUE ("tenant_id", "number"),
  CONSTRAINT "billing_refunds_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "billing_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_refunds_customer_fkey" FOREIGN KEY ("tenant_id", "customer_id") REFERENCES "billing_customers"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "billing_refunds_credit_note_fkey" FOREIGN KEY ("credit_note_id") REFERENCES "billing_credit_notes"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "billing_refunds_payment_fkey" FOREIGN KEY ("payment_id") REFERENCES "billing_payments"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "billing_refunds_payment_mode_fkey" FOREIGN KEY ("tenant_id", "payment_mode_id") REFERENCES "billing_payment_modes"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "billing_refunds_deposit_account_fkey" FOREIGN KEY ("tenant_id", "deposit_account_id") REFERENCES "billing_bank_accounts"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "billing_refunds_tenant_customer_idx" ON "billing_refunds" ("tenant_id", "customer_id");
CREATE INDEX "billing_refunds_tenant_credit_note_idx" ON "billing_refunds" ("tenant_id", "credit_note_id");
CREATE INDEX "billing_refunds_tenant_payment_idx" ON "billing_refunds" ("tenant_id", "payment_id");

COMMIT;
