-- 876 Billing commercial foundation
--
-- This migration is deliberately additive to the Billing-owned table family.
-- Core 876 tables are not referenced or changed. Core IDs remain opaque text
-- values in this bounded context.

BEGIN;

CREATE TYPE "BillingCustomerType" AS ENUM ('EXTERNAL', 'CORE_USER', 'CORE_ORGANIZATION');
CREATE TYPE "BillingItemType" AS ENUM ('GOOD', 'SERVICE');
CREATE TYPE "BillingPricingModel" AS ENUM ('FLAT', 'PER_UNIT', 'VOLUME', 'TIERED', 'PACKAGE');
CREATE TYPE "BillingPriceType" AS ENUM ('ONE_TIME', 'RECURRING');
CREATE TYPE "BillingIntervalUnit" AS ENUM ('DAY', 'WEEK', 'MONTH', 'YEAR');
CREATE TYPE "BillingDocumentType" AS ENUM ('QUOTE', 'INVOICE');
CREATE TYPE "BillingQuoteStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'CANCELED');
CREATE TYPE "BillingInvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'OVERDUE', 'PAID', 'VOID');

CREATE TABLE "billing_currencies" (
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "symbol" TEXT,
  "decimal_places" INTEGER NOT NULL DEFAULT 2,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  CONSTRAINT "billing_currencies_pkey" PRIMARY KEY ("code"),
  CONSTRAINT "billing_currencies_decimal_places_check" CHECK ("decimal_places" >= 0 AND "decimal_places" <= 6)
);

-- The initial supported set is deliberately small. New ISO-4217 currencies can
-- be added without a schema change and then enabled per tenant.
INSERT INTO "billing_currencies" ("code", "name", "symbol", "decimal_places", "created_at", "updated_at") VALUES
  ('JMD', 'Jamaican Dollar', '$', 2, 1783591200, 1783591200),
  ('USD', 'US Dollar', '$', 2, 1783591200, 1783591200),
  ('CAD', 'Canadian Dollar', '$', 2, 1783591200, 1783591200),
  ('GBP', 'Pound Sterling', '£', 2, 1783591200, 1783591200),
  ('EUR', 'Euro', '€', 2, 1783591200, 1783591200),
  ('BBD', 'Barbados Dollar', '$', 2, 1783591200, 1783591200),
  ('BZD', 'Belize Dollar', '$', 2, 1783591200, 1783591200),
  ('KYD', 'Cayman Islands Dollar', '$', 2, 1783591200, 1783591200),
  ('TTD', 'Trinidad and Tobago Dollar', '$', 2, 1783591200, 1783591200),
  ('XCD', 'East Caribbean Dollar', '$', 2, 1783591200, 1783591200);

CREATE TABLE "billing_tenant_currencies" (
  "tenant_id" TEXT NOT NULL,
  "currency_code" TEXT NOT NULL,
  "is_default" BOOLEAN NOT NULL DEFAULT false,
  "is_enabled" BOOLEAN NOT NULL DEFAULT true,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  CONSTRAINT "billing_tenant_currencies_pkey" PRIMARY KEY ("tenant_id", "currency_code"),
  CONSTRAINT "billing_tenant_currencies_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "billing_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_tenant_currencies_currency_code_fkey" FOREIGN KEY ("currency_code") REFERENCES "billing_currencies"("code") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "billing_tenant_currencies" ("tenant_id", "currency_code", "is_default", "is_enabled", "created_at", "updated_at")
SELECT "id", "default_currency", true, true, "created_at", "updated_at"
FROM "billing_tenants";

CREATE UNIQUE INDEX "billing_tenant_currencies_default_currency_key"
  ON "billing_tenant_currencies" ("tenant_id")
  WHERE "is_default";
CREATE INDEX "billing_tenant_currencies_currency_code_idx"
  ON "billing_tenant_currencies" ("currency_code");

ALTER TABLE "billing_tenants"
  ADD CONSTRAINT "billing_tenants_default_currency_fkey"
  FOREIGN KEY ("default_currency") REFERENCES "billing_currencies"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "billing_customers"
  ADD COLUMN "customer_type" "BillingCustomerType" NOT NULL DEFAULT 'EXTERNAL',
  ADD COLUMN "phone" TEXT,
  ADD COLUMN "billing_address" JSONB,
  ADD COLUMN "metadata" JSONB;

ALTER TABLE "billing_customers"
  ADD CONSTRAINT "billing_customers_reference_type_check"
  CHECK (
    ("customer_type" = 'EXTERNAL' AND "organization_id" IS NULL AND "user_id" IS NULL)
    OR ("customer_type" = 'CORE_USER' AND "organization_id" IS NULL AND "user_id" IS NOT NULL)
    OR ("customer_type" = 'CORE_ORGANIZATION' AND "organization_id" IS NOT NULL AND "user_id" IS NULL)
  );

CREATE UNIQUE INDEX "billing_customers_tenant_id_external_reference_key"
  ON "billing_customers" ("tenant_id", "external_reference");

CREATE TABLE "billing_items" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "type" "BillingItemType" NOT NULL,
  "name" TEXT NOT NULL,
  "sku" TEXT,
  "unit" TEXT,
  "description" TEXT,
  "image_url" TEXT,
  "default_selling_amount" BIGINT,
  "default_selling_currency" TEXT,
  "default_cost_amount" BIGINT,
  "default_cost_currency" TEXT,
  "is_taxable" BOOLEAN NOT NULL DEFAULT false,
  "tax_code" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "metadata" JSONB,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  CONSTRAINT "billing_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "billing_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_items_default_selling_pair_check" CHECK (("default_selling_amount" IS NULL) = ("default_selling_currency" IS NULL)),
  CONSTRAINT "billing_items_default_cost_pair_check" CHECK (("default_cost_amount" IS NULL) = ("default_cost_currency" IS NULL)),
  CONSTRAINT "billing_items_default_selling_amount_check" CHECK ("default_selling_amount" IS NULL OR "default_selling_amount" >= 0),
  CONSTRAINT "billing_items_default_cost_amount_check" CHECK ("default_cost_amount" IS NULL OR "default_cost_amount" >= 0)
);
CREATE UNIQUE INDEX "billing_items_tenant_id_sku_key" ON "billing_items" ("tenant_id", "sku");
CREATE INDEX "billing_items_tenant_id_idx" ON "billing_items" ("tenant_id");

ALTER TABLE "billing_products"
  ADD COLUMN "type" "BillingItemType" NOT NULL DEFAULT 'SERVICE',
  ADD COLUMN "notification_recipients" TEXT,
  ADD COLUMN "redirect_url" TEXT,
  ADD COLUMN "metadata" JSONB;

CREATE TABLE "billing_plans" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "product_id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "interval_unit" "BillingIntervalUnit" NOT NULL,
  "interval_count" INTEGER NOT NULL DEFAULT 1,
  "billing_cycle_count" INTEGER,
  "trial_days" INTEGER NOT NULL DEFAULT 0,
  "setup_fee_amount" BIGINT,
  "setup_fee_currency" TEXT,
  "is_taxable" BOOLEAN NOT NULL DEFAULT false,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "metadata" JSONB,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  CONSTRAINT "billing_plans_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_plans_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "billing_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_plans_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "billing_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "billing_plans_interval_count_check" CHECK ("interval_count" > 0),
  CONSTRAINT "billing_plans_billing_cycle_count_check" CHECK ("billing_cycle_count" IS NULL OR "billing_cycle_count" > 0),
  CONSTRAINT "billing_plans_trial_days_check" CHECK ("trial_days" >= 0),
  CONSTRAINT "billing_plans_setup_fee_pair_check" CHECK (("setup_fee_amount" IS NULL) = ("setup_fee_currency" IS NULL)),
  CONSTRAINT "billing_plans_setup_fee_amount_check" CHECK ("setup_fee_amount" IS NULL OR "setup_fee_amount" >= 0)
);
CREATE UNIQUE INDEX "billing_plans_tenant_id_code_key" ON "billing_plans" ("tenant_id", "code");
CREATE INDEX "billing_plans_tenant_id_idx" ON "billing_plans" ("tenant_id");
CREATE INDEX "billing_plans_product_id_idx" ON "billing_plans" ("product_id");

-- Preserve a price created under the foundation model by converting it to one
-- legacy plan. Foundation installations normally have no price rows, but this
-- keeps the migration safe for early internal usage.
INSERT INTO "billing_plans" (
  "id", "tenant_id", "product_id", "code", "name", "description",
  "interval_unit", "interval_count", "billing_cycle_count", "trial_days",
  "is_taxable", "is_active", "created_at", "updated_at"
)
SELECT
  'blplan_legacy_' || p."id",
  prod."tenant_id",
  prod."id",
  'legacy-' || p."id",
  COALESCE(p."nickname", prod."name"),
  prod."description",
  CASE COALESCE(p."billing_interval"::TEXT, 'MONTH')
    WHEN 'YEAR' THEN 'YEAR'::"BillingIntervalUnit"
    ELSE 'MONTH'::"BillingIntervalUnit"
  END,
  1,
  NULL,
  0,
  false,
  p."is_active",
  p."created_at",
  p."updated_at"
FROM "billing_prices" p
JOIN "billing_products" prod ON prod."id" = p."product_id";

ALTER TABLE "billing_prices"
  ADD COLUMN "tenant_id" TEXT,
  ADD COLUMN "item_id" TEXT,
  ADD COLUMN "plan_id" TEXT,
  ADD COLUMN "pricing_model" "BillingPricingModel" NOT NULL DEFAULT 'FLAT',
  ADD COLUMN "price_type" "BillingPriceType" NOT NULL DEFAULT 'ONE_TIME',
  ADD COLUMN "interval_unit" "BillingIntervalUnit",
  ADD COLUMN "interval_count" INTEGER,
  ADD COLUMN "unit_name" TEXT,
  ADD COLUMN "package_size" INTEGER,
  ADD COLUMN "is_taxable" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "metadata" JSONB;

UPDATE "billing_prices" p
SET
  "tenant_id" = prod."tenant_id",
  "plan_id" = 'blplan_legacy_' || p."id",
  "price_type" = CASE WHEN p."billing_interval" IS NULL THEN 'ONE_TIME'::"BillingPriceType" ELSE 'RECURRING'::"BillingPriceType" END,
  "interval_unit" = CASE p."billing_interval"::TEXT
    WHEN 'MONTH' THEN 'MONTH'::"BillingIntervalUnit"
    WHEN 'YEAR' THEN 'YEAR'::"BillingIntervalUnit"
    ELSE NULL
  END,
  "interval_count" = CASE WHEN p."billing_interval" IS NULL THEN NULL ELSE 1 END
FROM "billing_products" prod
WHERE prod."id" = p."product_id";

ALTER TABLE "billing_prices"
  ALTER COLUMN "tenant_id" SET NOT NULL,
  ALTER COLUMN "unit_amount" DROP NOT NULL,
  DROP CONSTRAINT "billing_prices_product_id_fkey",
  DROP COLUMN "product_id",
  DROP COLUMN "billing_interval",
  DROP COLUMN "grace_period_days";
DROP INDEX IF EXISTS "billing_prices_product_id_idx";

ALTER TABLE "billing_prices"
  ADD CONSTRAINT "billing_prices_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "billing_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "billing_prices_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "billing_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "billing_prices_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "billing_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "billing_prices_owner_check" CHECK ((("item_id" IS NOT NULL)::INTEGER + ("plan_id" IS NOT NULL)::INTEGER) = 1),
  ADD CONSTRAINT "billing_prices_unit_amount_check" CHECK ("unit_amount" IS NULL OR "unit_amount" >= 0),
  ADD CONSTRAINT "billing_prices_interval_check" CHECK (
    ("price_type" = 'ONE_TIME' AND "interval_unit" IS NULL AND "interval_count" IS NULL)
    OR ("price_type" = 'RECURRING' AND "interval_unit" IS NOT NULL AND "interval_count" > 0)
  ),
  ADD CONSTRAINT "billing_prices_package_size_check" CHECK ("package_size" IS NULL OR "package_size" > 0);
CREATE INDEX "billing_prices_tenant_id_idx" ON "billing_prices" ("tenant_id");
CREATE INDEX "billing_prices_item_id_idx" ON "billing_prices" ("item_id");
CREATE INDEX "billing_prices_plan_id_idx" ON "billing_prices" ("plan_id");

CREATE TABLE "billing_price_tiers" (
  "id" TEXT NOT NULL,
  "price_id" TEXT NOT NULL,
  "from_unit" INTEGER NOT NULL DEFAULT 1,
  "to_unit" INTEGER,
  "unit_amount" BIGINT,
  "flat_amount" BIGINT,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  CONSTRAINT "billing_price_tiers_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_price_tiers_price_id_fkey" FOREIGN KEY ("price_id") REFERENCES "billing_prices"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_price_tiers_from_unit_check" CHECK ("from_unit" > 0),
  CONSTRAINT "billing_price_tiers_to_unit_check" CHECK ("to_unit" IS NULL OR "to_unit" >= "from_unit"),
  CONSTRAINT "billing_price_tiers_unit_amount_check" CHECK ("unit_amount" IS NULL OR "unit_amount" >= 0),
  CONSTRAINT "billing_price_tiers_flat_amount_check" CHECK ("flat_amount" IS NULL OR "flat_amount" >= 0)
);
CREATE UNIQUE INDEX "billing_price_tiers_price_id_from_unit_key" ON "billing_price_tiers" ("price_id", "from_unit");
CREATE INDEX "billing_price_tiers_price_id_idx" ON "billing_price_tiers" ("price_id");

CREATE TABLE "billing_document_sequences" (
  "tenant_id" TEXT NOT NULL,
  "document_type" "BillingDocumentType" NOT NULL,
  "next_number" INTEGER NOT NULL DEFAULT 1,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  CONSTRAINT "billing_document_sequences_pkey" PRIMARY KEY ("tenant_id", "document_type"),
  CONSTRAINT "billing_document_sequences_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "billing_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_document_sequences_next_number_check" CHECK ("next_number" > 0)
);

CREATE TABLE "billing_quotes" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "customer_id" TEXT NOT NULL,
  "number" TEXT NOT NULL,
  "status" "BillingQuoteStatus" NOT NULL DEFAULT 'DRAFT',
  "currency" TEXT NOT NULL,
  "issue_at" INTEGER,
  "expires_at" INTEGER,
  "accepted_at" INTEGER,
  "declined_at" INTEGER,
  "canceled_at" INTEGER,
  "subtotal_amount" BIGINT NOT NULL DEFAULT 0,
  "tax_amount" BIGINT NOT NULL DEFAULT 0,
  "total_amount" BIGINT NOT NULL DEFAULT 0,
  "notes" TEXT,
  "terms" TEXT,
  "metadata" JSONB,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  CONSTRAINT "billing_quotes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_quotes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "billing_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_quotes_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "billing_customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "billing_quotes_totals_check" CHECK ("subtotal_amount" >= 0 AND "tax_amount" >= 0 AND "total_amount" >= 0)
);
CREATE UNIQUE INDEX "billing_quotes_tenant_id_number_key" ON "billing_quotes" ("tenant_id", "number");
CREATE INDEX "billing_quotes_tenant_id_status_idx" ON "billing_quotes" ("tenant_id", "status");
CREATE INDEX "billing_quotes_customer_id_idx" ON "billing_quotes" ("customer_id");

CREATE TABLE "billing_quote_lines" (
  "id" TEXT NOT NULL,
  "quote_id" TEXT NOT NULL,
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
  CONSTRAINT "billing_quote_lines_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_quote_lines_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "billing_quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_quote_lines_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "billing_items"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "billing_quote_lines_price_id_fkey" FOREIGN KEY ("price_id") REFERENCES "billing_prices"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "billing_quote_lines_amounts_check" CHECK ("quantity" > 0 AND "unit_amount" >= 0 AND "tax_amount" >= 0 AND "discount_amount" >= 0 AND "total_amount" >= 0)
);
CREATE INDEX "billing_quote_lines_quote_id_idx" ON "billing_quote_lines" ("quote_id");
CREATE INDEX "billing_quote_lines_item_id_idx" ON "billing_quote_lines" ("item_id");
CREATE INDEX "billing_quote_lines_price_id_idx" ON "billing_quote_lines" ("price_id");

ALTER TABLE "billing_subscriptions"
  ADD COLUMN "source_app_id" TEXT,
  ADD COLUMN "external_reference" TEXT,
  ADD COLUMN "trial_ends_at" INTEGER,
  ADD COLUMN "metadata" JSONB;
CREATE INDEX "billing_subscriptions_source_app_id_idx" ON "billing_subscriptions" ("source_app_id");

ALTER TABLE "billing_subscription_items"
  ADD COLUMN "unit_amount" BIGINT,
  ADD COLUMN "currency" TEXT,
  ADD COLUMN "metadata" JSONB;
UPDATE "billing_subscription_items" item
SET "unit_amount" = price."unit_amount", "currency" = price."currency"
FROM "billing_prices" price
WHERE price."id" = item."price_id";

CREATE TABLE "billing_invoices" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "customer_id" TEXT NOT NULL,
  "quote_id" TEXT,
  "subscription_id" TEXT,
  "number" TEXT NOT NULL,
  "status" "BillingInvoiceStatus" NOT NULL DEFAULT 'DRAFT',
  "currency" TEXT NOT NULL,
  "issue_at" INTEGER,
  "due_at" INTEGER,
  "sent_at" INTEGER,
  "paid_at" INTEGER,
  "voided_at" INTEGER,
  "subtotal_amount" BIGINT NOT NULL DEFAULT 0,
  "tax_amount" BIGINT NOT NULL DEFAULT 0,
  "total_amount" BIGINT NOT NULL DEFAULT 0,
  "amount_due" BIGINT NOT NULL DEFAULT 0,
  "notes" TEXT,
  "terms" TEXT,
  "metadata" JSONB,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  CONSTRAINT "billing_invoices_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_invoices_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "billing_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_invoices_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "billing_customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "billing_invoices_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "billing_quotes"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "billing_invoices_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "billing_subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "billing_invoices_totals_check" CHECK ("subtotal_amount" >= 0 AND "tax_amount" >= 0 AND "total_amount" >= 0 AND "amount_due" >= 0)
);
CREATE UNIQUE INDEX "billing_invoices_quote_id_key" ON "billing_invoices" ("quote_id");
CREATE UNIQUE INDEX "billing_invoices_tenant_id_number_key" ON "billing_invoices" ("tenant_id", "number");
CREATE INDEX "billing_invoices_tenant_id_status_idx" ON "billing_invoices" ("tenant_id", "status");
CREATE INDEX "billing_invoices_customer_id_idx" ON "billing_invoices" ("customer_id");
CREATE INDEX "billing_invoices_subscription_id_idx" ON "billing_invoices" ("subscription_id");

CREATE TABLE "billing_invoice_lines" (
  "id" TEXT NOT NULL,
  "invoice_id" TEXT NOT NULL,
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
  CONSTRAINT "billing_invoice_lines_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_invoice_lines_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "billing_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_invoice_lines_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "billing_items"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "billing_invoice_lines_price_id_fkey" FOREIGN KEY ("price_id") REFERENCES "billing_prices"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "billing_invoice_lines_amounts_check" CHECK ("quantity" > 0 AND "unit_amount" >= 0 AND "tax_amount" >= 0 AND "discount_amount" >= 0 AND "total_amount" >= 0)
);
CREATE INDEX "billing_invoice_lines_invoice_id_idx" ON "billing_invoice_lines" ("invoice_id");
CREATE INDEX "billing_invoice_lines_item_id_idx" ON "billing_invoice_lines" ("item_id");
CREATE INDEX "billing_invoice_lines_price_id_idx" ON "billing_invoice_lines" ("price_id");

COMMIT;
