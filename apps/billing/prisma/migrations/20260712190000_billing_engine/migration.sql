-- 876 Billing engine: recurring invoicing, AR subledger, commercial defaults,
-- discounts, and provider-neutral payment integration scaffolding.
--
-- This migration is additive. It does not delete or rename existing rows or
-- tables. Existing subscriptions begin automated billing at their current
-- period end so deployment cannot unexpectedly invoice a period twice.

ALTER TYPE "BillingInvoiceStatus" ADD VALUE IF NOT EXISTS 'OPEN' AFTER 'DRAFT';
ALTER TYPE "BillingInvoiceStatus" ADD VALUE IF NOT EXISTS 'UNCOLLECTIBLE' AFTER 'PAID';
ALTER TYPE "BillingSubscriptionEventType" ADD VALUE IF NOT EXISTS 'INVOICE_GENERATED';
ALTER TYPE "BillingSubscriptionEventType" ADD VALUE IF NOT EXISTS 'BILLING_FAILED';
ALTER TYPE "BillingSubscriptionEventType" ADD VALUE IF NOT EXISTS 'DISCOUNT_APPLIED';
ALTER TYPE "BillingDocumentType" ADD VALUE IF NOT EXISTS 'ESTIMATE' AFTER 'INVOICE';

BEGIN;

CREATE TYPE "BillingInvoiceBillingReason" AS ENUM (
  'MANUAL', 'QUOTE', 'ESTIMATE', 'SUBSCRIPTION_CREATE',
  'SUBSCRIPTION_CYCLE', 'SUBSCRIPTION_UPDATE', 'OPENING_BALANCE'
);
CREATE TYPE "BillingEstimateStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'CANCELED');
CREATE TYPE "BillingCollectionMethod" AS ENUM ('SEND_INVOICE', 'AUTO_CHARGE');
CREATE TYPE "BillingTiming" AS ENUM ('IN_ADVANCE', 'IN_ARREARS');
CREATE TYPE "BillingProrationBehavior" AS ENUM ('CREATE_PRORATIONS', 'NONE', 'ALWAYS_INVOICE');
CREATE TYPE "BillingRunStatus" AS ENUM ('PROCESSING', 'SUCCEEDED', 'FAILED', 'SKIPPED');
CREATE TYPE "BillingPaymentTermRule" AS ENUM ('DUE_ON_RECEIPT', 'NET_DAYS', 'END_OF_MONTH', 'END_OF_NEXT_MONTH');
CREATE TYPE "BillingDiscountType" AS ENUM ('PERCENTAGE', 'AMOUNT');
CREATE TYPE "BillingDiscountDuration" AS ENUM ('ONCE', 'REPEATING', 'FOREVER');
CREATE TYPE "BillingDiscountStatus" AS ENUM ('ACTIVE', 'EXHAUSTED', 'CANCELED');
CREATE TYPE "BillingPaymentStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'CANCELED');
CREATE TYPE "BillingPaymentProviderEnvironment" AS ENUM ('SANDBOX', 'LIVE');
CREATE TYPE "BillingPaymentProviderConnectionStatus" AS ENUM ('PENDING', 'ACTIVE', 'DISABLED', 'ERROR');
CREATE TYPE "BillingPaymentAttemptStatus" AS ENUM ('REQUIRES_ACTION', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELED');
CREATE TYPE "BillingProviderEventStatus" AS ENUM ('RECEIVED', 'PROCESSING', 'PROCESSED', 'FAILED', 'IGNORED');
CREATE TYPE "BillingLedgerDirection" AS ENUM ('DEBIT', 'CREDIT');
CREATE TYPE "BillingLedgerEntryType" AS ENUM (
  'INVOICE_FINALIZED', 'INVOICE_VOIDED', 'PAYMENT_RECEIVED',
  'PAYMENT_REVERSED', 'CREDIT_NOTE_ISSUED', 'CREDIT_NOTE_VOIDED',
  'REFUND_ISSUED', 'WRITE_OFF', 'OPENING_BALANCE'
);

-- Tenant commercial defaults ------------------------------------------------

CREATE TABLE "billing_payment_terms" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "rule" "BillingPaymentTermRule" NOT NULL,
  "due_days" INTEGER NOT NULL DEFAULT 0,
  "is_default" BOOLEAN NOT NULL DEFAULT false,
  "is_system" BOOLEAN NOT NULL DEFAULT false,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  CONSTRAINT "billing_payment_terms_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_payment_terms_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "billing_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_payment_terms_due_days_check" CHECK ("due_days" >= 0)
);
CREATE UNIQUE INDEX "billing_payment_terms_tenant_id_id_key" ON "billing_payment_terms" ("tenant_id", "id");
CREATE UNIQUE INDEX "billing_payment_terms_tenant_id_name_key" ON "billing_payment_terms" ("tenant_id", "name");
CREATE UNIQUE INDEX "billing_payment_terms_default_key" ON "billing_payment_terms" ("tenant_id") WHERE "is_default";
CREATE INDEX "billing_payment_terms_tenant_active_idx" ON "billing_payment_terms" ("tenant_id", "is_active");

CREATE TABLE "billing_salespeople" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "email" TEXT,
  "external_reference" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  CONSTRAINT "billing_salespeople_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_salespeople_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "billing_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "billing_salespeople_tenant_id_id_key" ON "billing_salespeople" ("tenant_id", "id");
CREATE UNIQUE INDEX "billing_salespeople_tenant_external_reference_key" ON "billing_salespeople" ("tenant_id", "external_reference");
CREATE INDEX "billing_salespeople_tenant_active_idx" ON "billing_salespeople" ("tenant_id", "is_active");

INSERT INTO "billing_payment_terms" (
  "id", "tenant_id", "name", "rule", "due_days", "is_default",
  "is_system", "is_active", "created_at", "updated_at"
)
SELECT
  'pterm_' || substr(md5(tenant."id" || ':' || seed."name"), 1, 20),
  tenant."id", seed."name", seed."rule"::"BillingPaymentTermRule",
  seed."due_days", seed."is_default", true, true,
  tenant."created_at", tenant."updated_at"
FROM "billing_tenants" tenant
CROSS JOIN (
  VALUES
    ('Due on Receipt', 'DUE_ON_RECEIPT', 0, true),
    ('Net 15', 'NET_DAYS', 15, false),
    ('Net 30', 'NET_DAYS', 30, false),
    ('Net 45', 'NET_DAYS', 45, false),
    ('Net 60', 'NET_DAYS', 60, false)
) AS seed("name", "rule", "due_days", "is_default");

UPDATE "billing_tenants"
SET "provisioning_version" = GREATEST("provisioning_version", 2),
    "provisioned_at" = COALESCE("provisioned_at", EXTRACT(EPOCH FROM NOW())::INTEGER),
    "updated_at" = EXTRACT(EPOCH FROM NOW())::INTEGER;

ALTER TABLE "billing_customers"
  ADD COLUMN "payment_term_id" TEXT,
  ADD COLUMN "salesperson_id" TEXT,
  ADD CONSTRAINT "billing_customers_payment_term_fkey" FOREIGN KEY ("tenant_id", "payment_term_id") REFERENCES "billing_payment_terms"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "billing_customers_salesperson_fkey" FOREIGN KEY ("tenant_id", "salesperson_id") REFERENCES "billing_salespeople"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Estimates ----------------------------------------------------------------

CREATE TABLE "billing_estimates" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "customer_id" TEXT NOT NULL,
  "number" TEXT NOT NULL,
  "status" "BillingEstimateStatus" NOT NULL DEFAULT 'DRAFT',
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
  CONSTRAINT "billing_estimates_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_estimates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "billing_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_estimates_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "billing_customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "billing_estimates_totals_check" CHECK ("subtotal_amount" >= 0 AND "tax_amount" >= 0 AND "total_amount" >= 0)
);
CREATE UNIQUE INDEX "billing_estimates_tenant_id_number_key" ON "billing_estimates" ("tenant_id", "number");
CREATE INDEX "billing_estimates_tenant_id_status_idx" ON "billing_estimates" ("tenant_id", "status");
CREATE INDEX "billing_estimates_customer_id_idx" ON "billing_estimates" ("customer_id");

CREATE TABLE "billing_estimate_lines" (
  "id" TEXT NOT NULL,
  "estimate_id" TEXT NOT NULL,
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
  CONSTRAINT "billing_estimate_lines_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_estimate_lines_estimate_id_fkey" FOREIGN KEY ("estimate_id") REFERENCES "billing_estimates"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_estimate_lines_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "billing_items"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "billing_estimate_lines_price_id_fkey" FOREIGN KEY ("price_id") REFERENCES "billing_prices"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "billing_estimate_lines_amounts_check" CHECK ("quantity" > 0 AND "unit_amount" >= 0 AND "tax_amount" >= 0 AND "discount_amount" >= 0 AND "total_amount" >= 0)
);
CREATE INDEX "billing_estimate_lines_estimate_id_idx" ON "billing_estimate_lines" ("estimate_id");
CREATE INDEX "billing_estimate_lines_item_id_idx" ON "billing_estimate_lines" ("item_id");
CREATE INDEX "billing_estimate_lines_price_id_idx" ON "billing_estimate_lines" ("price_id");

-- Invoice posting and service-period snapshots -----------------------------

ALTER TABLE "billing_invoices"
  ADD COLUMN "estimate_id" TEXT,
  ADD COLUMN "payment_term_id" TEXT,
  ADD COLUMN "salesperson_id" TEXT,
  ADD COLUMN "billing_reason" "BillingInvoiceBillingReason" NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN "finalized_at" INTEGER,
  ADD COLUMN "service_period_start" INTEGER,
  ADD COLUMN "service_period_end" INTEGER,
  ADD COLUMN "amount_paid" BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN "amount_credited" BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN "amount_written_off" BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN "payment_term_name" TEXT,
  ADD COLUMN "salesperson_name" TEXT;

UPDATE "billing_invoices" invoice
SET
  "billing_reason" = CASE
    WHEN invoice."quote_id" IS NOT NULL THEN 'QUOTE'::"BillingInvoiceBillingReason"
    WHEN invoice."subscription_id" IS NOT NULL THEN 'SUBSCRIPTION_CYCLE'::"BillingInvoiceBillingReason"
    ELSE 'MANUAL'::"BillingInvoiceBillingReason"
  END,
  "finalized_at" = CASE WHEN invoice."status" <> 'DRAFT' THEN COALESCE(invoice."issue_at", invoice."created_at") ELSE NULL END,
  "amount_paid" = COALESCE((
    SELECT SUM(allocation."amount")
    FROM "billing_payment_allocations" allocation
    WHERE allocation."invoice_id" = invoice."id"
  ), 0),
  "amount_credited" = COALESCE((
    SELECT SUM(allocation."amount")
    FROM "billing_credit_note_allocations" allocation
    WHERE allocation."invoice_id" = invoice."id"
  ), 0);

CREATE UNIQUE INDEX "billing_invoices_estimate_id_key" ON "billing_invoices" ("estimate_id");
CREATE INDEX "billing_invoices_tenant_due_at_idx" ON "billing_invoices" ("tenant_id", "due_at");
CREATE INDEX "billing_invoices_tenant_billing_reason_idx" ON "billing_invoices" ("tenant_id", "billing_reason");
ALTER TABLE "billing_invoices"
  ADD CONSTRAINT "billing_invoices_estimate_fkey" FOREIGN KEY ("estimate_id") REFERENCES "billing_estimates"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "billing_invoices_payment_term_fkey" FOREIGN KEY ("tenant_id", "payment_term_id") REFERENCES "billing_payment_terms"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "billing_invoices_salesperson_fkey" FOREIGN KEY ("tenant_id", "salesperson_id") REFERENCES "billing_salespeople"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "billing_invoices_amounts_check" CHECK (
    "amount_due" >= 0 AND "amount_paid" >= 0 AND
    "amount_credited" >= 0 AND "amount_written_off" >= 0
  );

-- Reversed allocations remain as audit evidence. Active allocations have a
-- null reversed timestamp and may be replaced by later corrections.
DROP INDEX "billing_payment_allocations_payment_id_invoice_id_key";
ALTER TABLE "billing_payment_allocations" ADD COLUMN "reversed_at" INTEGER;
CREATE INDEX "billing_payment_allocations_active_idx" ON "billing_payment_allocations" ("tenant_id", "payment_id", "reversed_at");

ALTER TABLE "billing_credit_note_allocations"
  DROP CONSTRAINT "billing_credit_note_allocations_credit_note_id_invoice_id_key",
  ADD COLUMN "reversed_at" INTEGER;
CREATE INDEX "billing_credit_note_allocations_active_idx" ON "billing_credit_note_allocations" ("tenant_id", "credit_note_id", "reversed_at");

ALTER TABLE "billing_invoice_lines"
  ADD COLUMN "subscription_item_id" TEXT,
  ADD COLUMN "service_period_start" INTEGER,
  ADD COLUMN "service_period_end" INTEGER,
  ADD CONSTRAINT "billing_invoice_lines_subscription_item_fkey" FOREIGN KEY ("subscription_item_id") REFERENCES "billing_subscription_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "billing_invoice_lines_subscription_item_id_idx" ON "billing_invoice_lines" ("subscription_item_id");

-- Subscription scheduling ---------------------------------------------------

ALTER TABLE "billing_subscriptions"
  ADD COLUMN "billing_cycle_anchor" INTEGER,
  ADD COLUMN "next_billing_at" INTEGER,
  ADD COLUMN "last_billed_at" INTEGER,
  ADD COLUMN "billed_cycle_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "collection_method" "BillingCollectionMethod" NOT NULL DEFAULT 'SEND_INVOICE',
  ADD COLUMN "billing_timing" "BillingTiming" NOT NULL DEFAULT 'IN_ADVANCE',
  ADD COLUMN "proration_behavior" "BillingProrationBehavior" NOT NULL DEFAULT 'CREATE_PRORATIONS',
  ADD COLUMN "payment_term_id" TEXT,
  ADD COLUMN "auto_apply_credits" BOOLEAN NOT NULL DEFAULT true,
  ADD CONSTRAINT "billing_subscriptions_payment_term_fkey" FOREIGN KEY ("tenant_id", "payment_term_id") REFERENCES "billing_payment_terms"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "billing_subscriptions_billed_cycle_count_check" CHECK ("billed_cycle_count" >= 0);

UPDATE "billing_subscriptions"
SET
  "billing_cycle_anchor" = COALESCE("current_period_start", "start_at"),
  "next_billing_at" = CASE
    WHEN "status" = 'TRIALING' THEN COALESCE("trial_ends_at", "current_period_start", "start_at")
    WHEN "status" = 'ACTIVE' THEN "current_period_end"
    ELSE NULL
  END;

CREATE INDEX "billing_subscriptions_tenant_next_billing_idx" ON "billing_subscriptions" ("tenant_id", "next_billing_at");

CREATE TABLE "billing_subscription_runs" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "subscription_id" TEXT NOT NULL,
  "period_start" INTEGER NOT NULL,
  "period_end" INTEGER NOT NULL,
  "scheduled_for" INTEGER NOT NULL,
  "status" "BillingRunStatus" NOT NULL DEFAULT 'PROCESSING',
  "attempt_count" INTEGER NOT NULL DEFAULT 1,
  "invoice_id" TEXT,
  "error_code" TEXT,
  "error_message" TEXT,
  "started_at" INTEGER NOT NULL,
  "completed_at" INTEGER,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  CONSTRAINT "billing_subscription_runs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_subscription_runs_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "billing_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_subscription_runs_subscription_fkey" FOREIGN KEY ("subscription_id") REFERENCES "billing_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_subscription_runs_period_check" CHECK ("period_end" > "period_start"),
  CONSTRAINT "billing_subscription_runs_attempt_count_check" CHECK ("attempt_count" > 0)
);
CREATE UNIQUE INDEX "billing_subscription_runs_tenant_id_id_key" ON "billing_subscription_runs" ("tenant_id", "id");
CREATE UNIQUE INDEX "billing_runs_subscription_period_key" ON "billing_subscription_runs" ("subscription_id", "period_start", "period_end");
CREATE UNIQUE INDEX "billing_subscription_runs_invoice_id_key" ON "billing_subscription_runs" ("invoice_id");
CREATE INDEX "billing_runs_tenant_status_schedule_idx" ON "billing_subscription_runs" ("tenant_id", "status", "scheduled_for");
ALTER TABLE "billing_subscription_runs"
  ADD CONSTRAINT "billing_subscription_runs_invoice_fkey" FOREIGN KEY ("invoice_id") REFERENCES "billing_invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- Coupons, promotion codes, and redeemed discounts --------------------------

CREATE TABLE "billing_coupons" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "product_id" TEXT,
  "name" TEXT NOT NULL,
  "discount_type" "BillingDiscountType" NOT NULL,
  "percent_off" DECIMAL(7,4),
  "amount_off" BIGINT,
  "currency" CHAR(3),
  "duration" "BillingDiscountDuration" NOT NULL,
  "duration_in_cycles" INTEGER,
  "redeem_by" INTEGER,
  "max_redemptions" INTEGER,
  "times_redeemed" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "metadata" JSONB,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  CONSTRAINT "billing_coupons_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_coupons_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "billing_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_coupons_product_fkey" FOREIGN KEY ("product_id") REFERENCES "billing_products"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "billing_coupons_value_check" CHECK (
    ("discount_type" = 'PERCENTAGE' AND "percent_off" > 0 AND "percent_off" <= 100 AND "amount_off" IS NULL AND "currency" IS NULL)
    OR
    ("discount_type" = 'AMOUNT' AND "amount_off" > 0 AND "currency" ~ '^[A-Z]{3}$' AND "percent_off" IS NULL)
  ),
  CONSTRAINT "billing_coupons_duration_check" CHECK (
    ("duration" = 'REPEATING' AND "duration_in_cycles" > 0)
    OR ("duration" <> 'REPEATING' AND "duration_in_cycles" IS NULL)
  ),
  CONSTRAINT "billing_coupons_redemptions_check" CHECK (
    "times_redeemed" >= 0 AND ("max_redemptions" IS NULL OR "max_redemptions" > 0)
  )
);
CREATE UNIQUE INDEX "billing_coupons_tenant_id_id_key" ON "billing_coupons" ("tenant_id", "id");
CREATE INDEX "billing_coupons_tenant_active_idx" ON "billing_coupons" ("tenant_id", "is_active");

CREATE TABLE "billing_promotion_codes" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "coupon_id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "customer_id" TEXT,
  "expires_at" INTEGER,
  "max_redemptions" INTEGER,
  "times_redeemed" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  CONSTRAINT "billing_promotion_codes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_promotion_codes_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "billing_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_promotion_codes_coupon_fkey" FOREIGN KEY ("tenant_id", "coupon_id") REFERENCES "billing_coupons"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "billing_promotion_codes_customer_fkey" FOREIGN KEY ("tenant_id", "customer_id") REFERENCES "billing_customers"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "billing_promotion_codes_redemptions_check" CHECK (
    "times_redeemed" >= 0 AND ("max_redemptions" IS NULL OR "max_redemptions" > 0)
  )
);
CREATE UNIQUE INDEX "billing_promotion_codes_tenant_id_id_key" ON "billing_promotion_codes" ("tenant_id", "id");
CREATE UNIQUE INDEX "billing_promotion_codes_tenant_id_code_key" ON "billing_promotion_codes" ("tenant_id", "code");
CREATE INDEX "billing_promotion_codes_tenant_active_idx" ON "billing_promotion_codes" ("tenant_id", "is_active");

CREATE TABLE "billing_subscription_discounts" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "subscription_id" TEXT NOT NULL,
  "coupon_id" TEXT NOT NULL,
  "promotion_code_id" TEXT,
  "status" "BillingDiscountStatus" NOT NULL DEFAULT 'ACTIVE',
  "discount_type" "BillingDiscountType" NOT NULL,
  "percent_off" DECIMAL(7,4),
  "amount_off" BIGINT,
  "currency" CHAR(3),
  "duration" "BillingDiscountDuration" NOT NULL,
  "remaining_cycles" INTEGER,
  "granted_by_user_id" TEXT,
  "grant_reason" TEXT,
  "starts_at" INTEGER NOT NULL,
  "ends_at" INTEGER,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  CONSTRAINT "billing_subscription_discounts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_subscription_discounts_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "billing_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_subscription_discounts_subscription_fkey" FOREIGN KEY ("subscription_id") REFERENCES "billing_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_subscription_discounts_coupon_fkey" FOREIGN KEY ("tenant_id", "coupon_id") REFERENCES "billing_coupons"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "billing_subscription_discounts_promotion_fkey" FOREIGN KEY ("tenant_id", "promotion_code_id") REFERENCES "billing_promotion_codes"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "billing_subscription_discounts_remaining_check" CHECK ("remaining_cycles" IS NULL OR "remaining_cycles" >= 0)
);
CREATE UNIQUE INDEX "billing_subscription_discounts_tenant_id_id_key" ON "billing_subscription_discounts" ("tenant_id", "id");
CREATE INDEX "billing_subscription_discounts_subscription_status_idx" ON "billing_subscription_discounts" ("subscription_id", "status");

-- Provider-neutral payment connection and event inbox -----------------------

CREATE TABLE "billing_payment_providers" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "logo_url" TEXT,
  "adapter" TEXT NOT NULL,
  "capabilities" JSONB,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  CONSTRAINT "billing_payment_providers_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "billing_payment_providers_key_key" ON "billing_payment_providers" ("key");

INSERT INTO "billing_payment_providers" (
  "id", "key", "name", "adapter", "capabilities", "is_active", "created_at", "updated_at"
) VALUES
  ('pprov_amber_pay', 'amber_pay', 'Amber Pay', 'amber_pay', '{"hosted_checkout":true,"payment_links":true,"refunds":true}'::JSONB, true, EXTRACT(EPOCH FROM NOW())::INTEGER, EXTRACT(EPOCH FROM NOW())::INTEGER),
  ('pprov_wipay', 'wipay', 'WiPay', 'wipay', '{"hosted_checkout":true,"refunds":true}'::JSONB, true, EXTRACT(EPOCH FROM NOW())::INTEGER, EXTRACT(EPOCH FROM NOW())::INTEGER),
  ('pprov_stripe', 'stripe', 'Stripe', 'stripe', '{"hosted_checkout":true,"automatic_collection":true,"refunds":true,"webhooks":true}'::JSONB, true, EXTRACT(EPOCH FROM NOW())::INTEGER, EXTRACT(EPOCH FROM NOW())::INTEGER),
  ('pprov_custom', 'custom', 'Custom Provider', 'custom', '{}'::JSONB, true, EXTRACT(EPOCH FROM NOW())::INTEGER, EXTRACT(EPOCH FROM NOW())::INTEGER)
ON CONFLICT ("key") DO NOTHING;

CREATE TABLE "billing_payment_provider_connections" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "provider_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "environment" "BillingPaymentProviderEnvironment" NOT NULL,
  "status" "BillingPaymentProviderConnectionStatus" NOT NULL DEFAULT 'PENDING',
  "merchant_account_id" TEXT,
  "credentials_reference" TEXT,
  "webhook_secret_reference" TEXT,
  "settings" JSONB,
  "last_synced_at" INTEGER,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  CONSTRAINT "billing_payment_provider_connections_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_provider_connections_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "billing_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_provider_connections_provider_fkey" FOREIGN KEY ("provider_id") REFERENCES "billing_payment_providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "billing_payment_provider_connections_tenant_id_id_key" ON "billing_payment_provider_connections" ("tenant_id", "id");
CREATE UNIQUE INDEX "billing_provider_connections_tenant_provider_name_key" ON "billing_payment_provider_connections" ("tenant_id", "provider_id", "name");
CREATE INDEX "billing_provider_connections_tenant_status_idx" ON "billing_payment_provider_connections" ("tenant_id", "status");

ALTER TABLE "billing_payments"
  ADD COLUMN "provider_connection_id" TEXT,
  ADD COLUMN "status" "BillingPaymentStatus" NOT NULL DEFAULT 'SUCCEEDED',
  ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "provider_payment_id" TEXT,
  ADD CONSTRAINT "billing_payments_revision_check" CHECK ("revision" >= 0),
  ADD CONSTRAINT "billing_payments_provider_connection_fkey" FOREIGN KEY ("tenant_id", "provider_connection_id") REFERENCES "billing_payment_provider_connections"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE UNIQUE INDEX "billing_payments_provider_external_key" ON "billing_payments" ("provider_connection_id", "provider_payment_id");

CREATE TABLE "billing_payment_attempts" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "connection_id" TEXT,
  "customer_id" TEXT NOT NULL,
  "invoice_id" TEXT,
  "subscription_id" TEXT,
  "payment_id" TEXT,
  "idempotency_key" TEXT NOT NULL,
  "external_reference" TEXT,
  "status" "BillingPaymentAttemptStatus" NOT NULL DEFAULT 'PROCESSING',
  "amount" BIGINT NOT NULL,
  "currency" CHAR(3) NOT NULL,
  "failure_code" TEXT,
  "failure_message" TEXT,
  "provider_response_code" TEXT,
  "attempted_at" INTEGER NOT NULL,
  "completed_at" INTEGER,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  CONSTRAINT "billing_payment_attempts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_payment_attempts_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "billing_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_payment_attempts_connection_fkey" FOREIGN KEY ("tenant_id", "connection_id") REFERENCES "billing_payment_provider_connections"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "billing_payment_attempts_customer_fkey" FOREIGN KEY ("tenant_id", "customer_id") REFERENCES "billing_customers"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "billing_payment_attempts_invoice_fkey" FOREIGN KEY ("tenant_id", "invoice_id") REFERENCES "billing_invoices"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "billing_payment_attempts_subscription_fkey" FOREIGN KEY ("subscription_id") REFERENCES "billing_subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "billing_payment_attempts_payment_fkey" FOREIGN KEY ("tenant_id", "payment_id") REFERENCES "billing_payments"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "billing_payment_attempts_amount_check" CHECK ("amount" > 0),
  CONSTRAINT "billing_payment_attempts_currency_check" CHECK ("currency" ~ '^[A-Z]{3}$')
);
CREATE UNIQUE INDEX "billing_payment_attempts_tenant_id_id_key" ON "billing_payment_attempts" ("tenant_id", "id");
CREATE UNIQUE INDEX "billing_payment_attempts_tenant_idempotency_key" ON "billing_payment_attempts" ("tenant_id", "idempotency_key");
CREATE UNIQUE INDEX "billing_payment_attempts_connection_external_key" ON "billing_payment_attempts" ("connection_id", "external_reference");
CREATE INDEX "billing_payment_attempts_tenant_status_date_idx" ON "billing_payment_attempts" ("tenant_id", "status", "attempted_at");

CREATE TABLE "billing_payment_provider_events" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "connection_id" TEXT NOT NULL,
  "external_event_id" TEXT NOT NULL,
  "event_type" TEXT NOT NULL,
  "status" "BillingProviderEventStatus" NOT NULL DEFAULT 'RECEIVED',
  "payload" JSONB,
  "error_message" TEXT,
  "occurred_at" INTEGER,
  "received_at" INTEGER NOT NULL,
  "processed_at" INTEGER,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  CONSTRAINT "billing_payment_provider_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_provider_events_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "billing_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_provider_events_connection_fkey" FOREIGN KEY ("tenant_id", "connection_id") REFERENCES "billing_payment_provider_connections"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "billing_payment_provider_events_tenant_id_id_key" ON "billing_payment_provider_events" ("tenant_id", "id");
CREATE UNIQUE INDEX "billing_provider_events_connection_external_key" ON "billing_payment_provider_events" ("connection_id", "external_event_id");
CREATE INDEX "billing_provider_events_tenant_status_date_idx" ON "billing_payment_provider_events" ("tenant_id", "status", "received_at");

-- Append-only customer subledger --------------------------------------------

CREATE TABLE "billing_customer_ledger_entries" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "customer_id" TEXT NOT NULL,
  "subscription_id" TEXT,
  "invoice_id" TEXT,
  "payment_id" TEXT,
  "credit_note_id" TEXT,
  "refund_id" TEXT,
  "type" "BillingLedgerEntryType" NOT NULL,
  "direction" "BillingLedgerDirection" NOT NULL,
  "amount" BIGINT NOT NULL,
  "currency" CHAR(3) NOT NULL,
  "description" TEXT,
  "idempotency_key" TEXT NOT NULL,
  "effective_at" INTEGER NOT NULL,
  "created_at" INTEGER NOT NULL,
  CONSTRAINT "billing_customer_ledger_entries_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_ledger_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "billing_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_ledger_customer_fkey" FOREIGN KEY ("tenant_id", "customer_id") REFERENCES "billing_customers"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "billing_ledger_subscription_fkey" FOREIGN KEY ("subscription_id") REFERENCES "billing_subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "billing_ledger_invoice_fkey" FOREIGN KEY ("tenant_id", "invoice_id") REFERENCES "billing_invoices"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "billing_ledger_payment_fkey" FOREIGN KEY ("tenant_id", "payment_id") REFERENCES "billing_payments"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "billing_ledger_credit_note_fkey" FOREIGN KEY ("tenant_id", "credit_note_id") REFERENCES "billing_credit_notes"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "billing_ledger_refund_fkey" FOREIGN KEY ("tenant_id", "refund_id") REFERENCES "billing_refunds"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "billing_ledger_amount_check" CHECK ("amount" > 0),
  CONSTRAINT "billing_ledger_currency_check" CHECK ("currency" ~ '^[A-Z]{3}$')
);
CREATE UNIQUE INDEX "billing_customer_ledger_entries_tenant_id_id_key" ON "billing_customer_ledger_entries" ("tenant_id", "id");
CREATE UNIQUE INDEX "billing_customer_ledger_entries_tenant_idempotency_key" ON "billing_customer_ledger_entries" ("tenant_id", "idempotency_key");
CREATE INDEX "billing_ledger_tenant_customer_date_idx" ON "billing_customer_ledger_entries" ("tenant_id", "customer_id", "effective_at");
CREATE INDEX "billing_ledger_tenant_type_date_idx" ON "billing_customer_ledger_entries" ("tenant_id", "type", "effective_at");

-- Existing finalized activity becomes the opening audit trail. Allocation
-- rows are copied separately so paid and credited amounts remain explainable.
INSERT INTO "billing_customer_ledger_entries" (
  "id", "tenant_id", "customer_id", "subscription_id", "invoice_id",
  "type", "direction", "amount", "currency", "description",
  "idempotency_key", "effective_at", "created_at"
)
SELECT
  'cled_' || substr(md5(invoice."tenant_id" || ':invoice:' || invoice."id"), 1, 20),
  invoice."tenant_id", invoice."customer_id", invoice."subscription_id", invoice."id",
  CASE WHEN invoice."billing_reason" = 'OPENING_BALANCE' THEN 'OPENING_BALANCE'::"BillingLedgerEntryType" ELSE 'INVOICE_FINALIZED'::"BillingLedgerEntryType" END,
  'DEBIT'::"BillingLedgerDirection", invoice."total_amount", invoice."currency",
  'Invoice ' || invoice."number", 'invoice:' || invoice."id" || ':finalized',
  COALESCE(invoice."finalized_at", invoice."issue_at", invoice."created_at"), invoice."created_at"
FROM "billing_invoices" invoice
WHERE invoice."status" <> 'DRAFT' AND invoice."status" <> 'VOID' AND invoice."total_amount" > 0;

INSERT INTO "billing_customer_ledger_entries" (
  "id", "tenant_id", "customer_id", "payment_id", "type", "direction",
  "amount", "currency", "description", "idempotency_key", "effective_at", "created_at"
)
SELECT
  'cled_' || substr(md5(payment."tenant_id" || ':payment-received:' || payment."id"), 1, 20),
  payment."tenant_id", payment."customer_id", payment."id",
  'PAYMENT_RECEIVED', 'CREDIT', payment."amount", payment."currency",
  'Payment ' || payment."number" || ' received', 'payment:' || payment."id" || ':revision:0:received',
  payment."payment_date", payment."created_at"
FROM "billing_payments" payment
WHERE payment."amount" > 0;

INSERT INTO "billing_customer_ledger_entries" (
  "id", "tenant_id", "customer_id", "credit_note_id", "type", "direction",
  "amount", "currency", "description", "idempotency_key", "effective_at", "created_at"
)
SELECT
  'cled_' || substr(md5(note."tenant_id" || ':credit-note:' || note."id" || ':issued'), 1, 20),
  note."tenant_id", note."customer_id", note."id", 'CREDIT_NOTE_ISSUED', 'CREDIT',
  note."total_amount", note."currency", 'Credit note ' || note."number" || ' issued',
  'credit-note:' || note."id" || ':issued', COALESCE(note."issue_at", note."created_at"), note."created_at"
FROM "billing_credit_notes" note
WHERE note."total_amount" > 0;

INSERT INTO "billing_customer_ledger_entries" (
  "id", "tenant_id", "customer_id", "credit_note_id", "type", "direction",
  "amount", "currency", "description", "idempotency_key", "effective_at", "created_at"
)
SELECT
  'cled_' || substr(md5(note."tenant_id" || ':credit-note:' || note."id" || ':voided'), 1, 20),
  note."tenant_id", note."customer_id", note."id", 'CREDIT_NOTE_VOIDED', 'DEBIT',
  note."total_amount", note."currency", 'Credit note ' || note."number" || ' voided',
  'credit-note:' || note."id" || ':voided', COALESCE(note."voided_at", note."updated_at"), note."updated_at"
FROM "billing_credit_notes" note
WHERE note."status" = 'VOID' AND note."total_amount" > 0;

INSERT INTO "billing_customer_ledger_entries" (
  "id", "tenant_id", "customer_id", "refund_id", "type", "direction",
  "amount", "currency", "description", "idempotency_key", "effective_at", "created_at"
)
SELECT
  'cled_' || substr(md5(refund."tenant_id" || ':refund:' || refund."id"), 1, 20),
  refund."tenant_id", refund."customer_id", refund."id", 'REFUND_ISSUED', 'DEBIT',
  refund."amount", refund."currency", 'Refund ' || refund."number" || ' issued',
  'refund:' || refund."id" || ':issued', refund."refunded_at", refund."created_at"
FROM "billing_refunds" refund
WHERE refund."amount" > 0;

COMMIT;
