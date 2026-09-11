-- Sales Receipts are immediate paid sales. This migration is additive: existing
-- invoices/payments remain unchanged and no historical transactions are recast.

ALTER TYPE "BillingDocumentType" ADD VALUE 'SALES_RECEIPT';

CREATE TYPE "BillingSalesReceiptStatus" AS ENUM ('PAID', 'VOID');

CREATE TABLE "billing_sales_receipts" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "source_app_id" TEXT,
  "source_external_reference" TEXT,
  "source_idempotency_key" TEXT,
  "source_payload_hash" TEXT,
  "customer_id" TEXT NOT NULL,
  "price_list_id" TEXT,
  "price_list_name" TEXT,
  "quote_id" TEXT,
  "payment_id" TEXT NOT NULL,
  "salesperson_id" TEXT,
  "number" TEXT NOT NULL,
  "status" "BillingSalesReceiptStatus" NOT NULL DEFAULT 'PAID',
  "currency" TEXT NOT NULL,
  "reference_number" TEXT,
  "tax_behavior" "BillingTaxBehavior" NOT NULL DEFAULT 'EXCLUSIVE',
  "customer_name" TEXT,
  "customer_email" TEXT,
  "billing_address_snapshot" JSONB,
  "shipping_address_snapshot" JSONB,
  "receipt_at" INTEGER NOT NULL,
  "sent_at" INTEGER,
  "voided_at" INTEGER,
  "void_reason" TEXT,
  "subtotal_amount" BIGINT NOT NULL DEFAULT 0,
  "tax_amount" BIGINT NOT NULL DEFAULT 0,
  "discount_amount" BIGINT NOT NULL DEFAULT 0,
  "total_amount" BIGINT NOT NULL DEFAULT 0,
  "salesperson_name" TEXT,
  "notes" TEXT,
  "terms" TEXT,
  "metadata" JSONB,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  CONSTRAINT "billing_sales_receipts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "billing_sales_receipt_lines" (
  "id" TEXT NOT NULL,
  "sales_receipt_id" TEXT NOT NULL,
  "item_id" TEXT,
  "variant_id" TEXT,
  "variant_name" TEXT,
  "variant_sku" TEXT,
  "price_id" TEXT,
  "tax_rate_id" TEXT,
  "description" TEXT NOT NULL,
  "unit" TEXT,
  "position" INTEGER NOT NULL DEFAULT 0,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "unit_amount" BIGINT NOT NULL,
  "tax_amount" BIGINT NOT NULL DEFAULT 0,
  "tax_name" TEXT,
  "tax_rate" DECIMAL(7,4),
  "tax_inclusive" BOOLEAN NOT NULL DEFAULT false,
  "discount_amount" BIGINT NOT NULL DEFAULT 0,
  "total_amount" BIGINT NOT NULL,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  CONSTRAINT "billing_sales_receipt_lines_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "billing_credit_notes"
  ADD COLUMN "sales_receipt_id" TEXT;

CREATE UNIQUE INDEX "billing_sales_receipts_tenant_id_id_key"
  ON "billing_sales_receipts" ("tenant_id", "id");
CREATE UNIQUE INDEX "billing_sales_receipts_tenant_id_number_key"
  ON "billing_sales_receipts" ("tenant_id", "number");
CREATE UNIQUE INDEX "billing_sales_receipts_quote_id_key"
  ON "billing_sales_receipts" ("quote_id");
CREATE UNIQUE INDEX "billing_sales_receipts_tenant_payment_id_key"
  ON "billing_sales_receipts" ("tenant_id", "payment_id");
CREATE UNIQUE INDEX "billing_sales_receipts_source_external_key"
  ON "billing_sales_receipts" ("tenant_id", "source_app_id", "source_external_reference");
CREATE UNIQUE INDEX "billing_sales_receipts_source_idempotency_key"
  ON "billing_sales_receipts" ("tenant_id", "source_app_id", "source_idempotency_key");
CREATE INDEX "billing_sales_receipts_tenant_status_receipt_at_idx"
  ON "billing_sales_receipts" ("tenant_id", "status", "receipt_at");
CREATE INDEX "billing_sales_receipts_tenant_customer_receipt_at_idx"
  ON "billing_sales_receipts" ("tenant_id", "customer_id", "receipt_at");
CREATE INDEX "billing_sales_receipts_source_app_idx"
  ON "billing_sales_receipts" ("tenant_id", "source_app_id");
CREATE INDEX "billing_sales_receipts_price_list_id_idx"
  ON "billing_sales_receipts" ("price_list_id");
CREATE INDEX "billing_sales_receipts_salesperson_id_idx"
  ON "billing_sales_receipts" ("salesperson_id");

CREATE UNIQUE INDEX "billing_sales_receipt_lines_sales_receipt_id_position_key"
  ON "billing_sales_receipt_lines" ("sales_receipt_id", "position");
CREATE INDEX "billing_sales_receipt_lines_sales_receipt_id_idx"
  ON "billing_sales_receipt_lines" ("sales_receipt_id");
CREATE INDEX "billing_sales_receipt_lines_item_id_idx"
  ON "billing_sales_receipt_lines" ("item_id");
CREATE INDEX "billing_sales_receipt_lines_variant_id_idx"
  ON "billing_sales_receipt_lines" ("variant_id");
CREATE INDEX "billing_sales_receipt_lines_price_id_idx"
  ON "billing_sales_receipt_lines" ("price_id");
CREATE INDEX "billing_sales_receipt_lines_tax_rate_id_idx"
  ON "billing_sales_receipt_lines" ("tax_rate_id");
CREATE INDEX "billing_credit_notes_sales_receipt_id_idx"
  ON "billing_credit_notes" ("sales_receipt_id");

ALTER TABLE "billing_sales_receipts"
  ADD CONSTRAINT "billing_sales_receipts_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "billing_tenants"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "billing_sales_receipts"
  ADD CONSTRAINT "billing_sales_receipts_customer_fkey"
  FOREIGN KEY ("tenant_id", "customer_id") REFERENCES "billing_customers"("tenant_id", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "billing_sales_receipts"
  ADD CONSTRAINT "billing_sales_receipts_price_list_fkey"
  FOREIGN KEY ("tenant_id", "price_list_id") REFERENCES "billing_price_lists"("tenant_id", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "billing_sales_receipts"
  ADD CONSTRAINT "billing_sales_receipts_quote_id_fkey"
  FOREIGN KEY ("quote_id") REFERENCES "billing_quotes"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "billing_sales_receipts"
  ADD CONSTRAINT "billing_sales_receipts_payment_fkey"
  FOREIGN KEY ("tenant_id", "payment_id") REFERENCES "billing_payments"("tenant_id", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "billing_sales_receipts"
  ADD CONSTRAINT "billing_sales_receipts_salesperson_fkey"
  FOREIGN KEY ("tenant_id", "salesperson_id") REFERENCES "billing_salespeople"("tenant_id", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "billing_sales_receipt_lines"
  ADD CONSTRAINT "billing_sales_receipt_lines_sales_receipt_id_fkey"
  FOREIGN KEY ("sales_receipt_id") REFERENCES "billing_sales_receipts"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "billing_sales_receipt_lines"
  ADD CONSTRAINT "billing_sales_receipt_lines_item_id_fkey"
  FOREIGN KEY ("item_id") REFERENCES "billing_items"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "billing_sales_receipt_lines"
  ADD CONSTRAINT "billing_sales_receipt_lines_variant_id_fkey"
  FOREIGN KEY ("variant_id") REFERENCES "billing_item_variants"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "billing_sales_receipt_lines"
  ADD CONSTRAINT "billing_sales_receipt_lines_price_id_fkey"
  FOREIGN KEY ("price_id") REFERENCES "billing_prices"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "billing_sales_receipt_lines"
  ADD CONSTRAINT "billing_sales_receipt_lines_tax_rate_id_fkey"
  FOREIGN KEY ("tax_rate_id") REFERENCES "billing_tax_rates"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "billing_credit_notes"
  ADD CONSTRAINT "billing_credit_notes_sales_receipt_fkey"
  FOREIGN KEY ("sales_receipt_id") REFERENCES "billing_sales_receipts"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "billing_credit_notes"
  ADD CONSTRAINT "billing_credit_notes_single_sale_source_check"
  CHECK ("invoice_id" IS NULL OR "sales_receipt_id" IS NULL);
