-- Invoice preferences, immutable invoice snapshots, and idempotent late fees.
--
-- This migration is additive. It preserves every existing document and
-- allocation, backfills reportable customer snapshots, and gives each tenant
-- conservative defaults (late fees disabled and tax exclusive).

ALTER TYPE "BillingInvoiceBillingReason" ADD VALUE IF NOT EXISTS 'LATE_FEE';

BEGIN;

CREATE TYPE "BillingTaxBehavior" AS ENUM ('EXCLUSIVE', 'INCLUSIVE');
CREATE TYPE "BillingLateFeeCalculationType" AS ENUM ('PERCENTAGE', 'FIXED');

CREATE TABLE "billing_invoice_preferences" (
  "tenant_id" TEXT NOT NULL,
  "default_tax_behavior" "BillingTaxBehavior" NOT NULL DEFAULT 'EXCLUSIVE',
  "default_notes" TEXT,
  "default_terms" TEXT,
  "allow_editing_sent_invoices" BOOLEAN NOT NULL DEFAULT false,
  "late_fees_enabled" BOOLEAN NOT NULL DEFAULT false,
  "late_fee_calculation_type" "BillingLateFeeCalculationType" NOT NULL DEFAULT 'PERCENTAGE',
  "late_fee_percent" DECIMAL(7,4),
  "late_fee_amount" BIGINT,
  "late_fee_grace_days" INTEGER NOT NULL DEFAULT 0,
  "late_fee_generate_as_draft" BOOLEAN NOT NULL DEFAULT true,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  CONSTRAINT "billing_invoice_preferences_pkey" PRIMARY KEY ("tenant_id"),
  CONSTRAINT "billing_invoice_preferences_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "billing_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_invoice_preferences_grace_days_check" CHECK ("late_fee_grace_days" >= 0 AND "late_fee_grace_days" <= 3650),
  CONSTRAINT "billing_invoice_preferences_percent_check" CHECK ("late_fee_percent" IS NULL OR ("late_fee_percent" >= 0 AND "late_fee_percent" <= 100)),
  CONSTRAINT "billing_invoice_preferences_amount_check" CHECK ("late_fee_amount" IS NULL OR "late_fee_amount" >= 0),
  CONSTRAINT "billing_invoice_preferences_enabled_policy_check" CHECK (
    NOT "late_fees_enabled"
    OR ("late_fee_calculation_type" = 'PERCENTAGE' AND "late_fee_percent" > 0)
    OR ("late_fee_calculation_type" = 'FIXED' AND "late_fee_amount" > 0)
  )
);

INSERT INTO "billing_invoice_preferences" (
  "tenant_id", "default_tax_behavior", "late_fees_enabled",
  "late_fee_calculation_type", "late_fee_percent", "late_fee_grace_days",
  "late_fee_generate_as_draft", "created_at", "updated_at"
)
SELECT
  "id", 'EXCLUSIVE', false, 'PERCENTAGE', 0, 0, true,
  "created_at", "updated_at"
FROM "billing_tenants";

ALTER TABLE "billing_tenants"
  ALTER COLUMN "provisioning_version" SET DEFAULT 3;

UPDATE "billing_tenants"
SET "provisioning_version" = GREATEST("provisioning_version", 3),
    "updated_at" = EXTRACT(EPOCH FROM NOW())::INTEGER;

ALTER TABLE "billing_customers"
  ADD COLUMN "tax_behavior_override" "BillingTaxBehavior",
  ADD COLUMN "late_fee_exempt" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "invoice_notes" TEXT,
  ADD COLUMN "invoice_terms" TEXT;

ALTER TABLE "billing_invoices"
  ADD COLUMN "order_number" TEXT,
  ADD COLUMN "reference_number" TEXT,
  ADD COLUMN "subject" TEXT,
  ADD COLUMN "tax_behavior" "BillingTaxBehavior" NOT NULL DEFAULT 'EXCLUSIVE',
  ADD COLUMN "customer_name" TEXT,
  ADD COLUMN "customer_email" TEXT,
  ADD COLUMN "billing_address_snapshot" JSONB,
  ADD COLUMN "shipping_address_snapshot" JSONB,
  ADD COLUMN "discount_amount" BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN "shipping_amount" BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN "adjustment_amount" BIGINT NOT NULL DEFAULT 0;

UPDATE "billing_invoices" invoice
SET
  "customer_name" = customer."name",
  "customer_email" = customer."email"
FROM "billing_customers" customer
WHERE customer."id" = invoice."customer_id";

UPDATE "billing_invoices" invoice
SET "billing_address_snapshot" = jsonb_build_object(
  'label', address."label",
  'attention', address."attention",
  'line1', address."line1",
  'line2', address."line2",
  'city', address."city",
  'state', address."state",
  'postalCode', address."postal_code",
  'countryCode', address."country_code"
)
FROM "billing_addresses" address
WHERE address."customer_id" = invoice."customer_id"
  AND address."tenant_id" = invoice."tenant_id"
  AND address."type" = 'billing'
  AND address."is_default" = true;

UPDATE "billing_invoices" invoice
SET "shipping_address_snapshot" = jsonb_build_object(
  'label', address."label",
  'attention', address."attention",
  'line1', address."line1",
  'line2', address."line2",
  'city', address."city",
  'state', address."state",
  'postalCode', address."postal_code",
  'countryCode', address."country_code"
)
FROM "billing_addresses" address
WHERE address."customer_id" = invoice."customer_id"
  AND address."tenant_id" = invoice."tenant_id"
  AND address."type" = 'shipping'
  AND address."is_default" = true;

CREATE INDEX "billing_invoices_order_number_idx"
  ON "billing_invoices" ("tenant_id", "order_number");
CREATE INDEX "billing_invoices_reference_number_idx"
  ON "billing_invoices" ("tenant_id", "reference_number");
ALTER TABLE "billing_invoices"
  ADD CONSTRAINT "billing_invoices_header_amounts_check" CHECK ("discount_amount" >= 0 AND "shipping_amount" >= 0);

CREATE TABLE "billing_late_fee_assessments" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "source_invoice_id" TEXT NOT NULL,
  "late_fee_invoice_id" TEXT NOT NULL,
  "calculation_type" "BillingLateFeeCalculationType" NOT NULL,
  "base_amount" BIGINT NOT NULL,
  "percent" DECIMAL(7,4),
  "fixed_amount" BIGINT,
  "assessed_amount" BIGINT NOT NULL,
  "grace_days" INTEGER NOT NULL,
  "assessed_at" INTEGER NOT NULL,
  "created_at" INTEGER NOT NULL,
  CONSTRAINT "billing_late_fee_assessments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_late_fee_assessments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "billing_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_late_fee_assessments_source_invoice_id_fkey" FOREIGN KEY ("source_invoice_id") REFERENCES "billing_invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "billing_late_fee_assessments_late_fee_invoice_id_fkey" FOREIGN KEY ("late_fee_invoice_id") REFERENCES "billing_invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "billing_late_fee_assessments_amounts_check" CHECK ("base_amount" > 0 AND "assessed_amount" > 0 AND "grace_days" >= 0)
);
CREATE UNIQUE INDEX "billing_late_fee_assessments_tenant_id_id_key"
  ON "billing_late_fee_assessments" ("tenant_id", "id");
CREATE UNIQUE INDEX "billing_late_fee_assessments_late_fee_invoice_id_key"
  ON "billing_late_fee_assessments" ("late_fee_invoice_id");
CREATE UNIQUE INDEX "billing_late_fee_assessments_tenant_id_source_invoice_id_key"
  ON "billing_late_fee_assessments" ("tenant_id", "source_invoice_id");
CREATE INDEX "billing_late_fee_assessments_tenant_date_idx"
  ON "billing_late_fee_assessments" ("tenant_id", "assessed_at");

ALTER TABLE "billing_invoice_lines"
  ADD COLUMN "tax_rate_id" TEXT,
  ADD COLUMN "unit" TEXT,
  ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "tax_name" TEXT,
  ADD COLUMN "tax_rate" DECIMAL(7,4),
  ADD COLUMN "tax_inclusive" BOOLEAN NOT NULL DEFAULT false;

WITH ranked_lines AS (
  SELECT "id", ROW_NUMBER() OVER (
    PARTITION BY "invoice_id" ORDER BY "created_at", "id"
  ) - 1 AS "resolved_position"
  FROM "billing_invoice_lines"
)
UPDATE "billing_invoice_lines" line
SET "position" = ranked_lines."resolved_position"
FROM ranked_lines
WHERE ranked_lines."id" = line."id";

CREATE INDEX "billing_invoice_lines_tax_rate_id_idx"
  ON "billing_invoice_lines" ("tax_rate_id");
ALTER TABLE "billing_invoice_lines"
  ADD CONSTRAINT "billing_invoice_lines_tax_rate_id_fkey" FOREIGN KEY ("tax_rate_id") REFERENCES "billing_tax_rates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE UNIQUE INDEX "billing_invoice_lines_invoice_id_position_key"
  ON "billing_invoice_lines" ("invoice_id", "position");

COMMIT;
