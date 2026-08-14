-- Modern subscription lifecycle, invoice policy, advance billing, charges,
-- proration history, and saved views. All changes are additive except removal
-- of two uniqueness constraints that previously prevented consolidation and
-- historical subscription-item snapshots; existing rows are preserved.

ALTER TYPE "BillingSubscriptionEventType" ADD VALUE IF NOT EXISTS 'UPDATED';
ALTER TYPE "BillingSubscriptionEventType" ADD VALUE IF NOT EXISTS 'UPDATE_SCHEDULED';
ALTER TYPE "BillingSubscriptionEventType" ADD VALUE IF NOT EXISTS 'UPDATE_CANCELED';
ALTER TYPE "BillingSubscriptionEventType" ADD VALUE IF NOT EXISTS 'CHARGE_ADDED';
ALTER TYPE "BillingSubscriptionEventType" ADD VALUE IF NOT EXISTS 'COUPON_APPLIED';
ALTER TYPE "BillingSubscriptionEventType" ADD VALUE IF NOT EXISTS 'EXTENDED';
ALTER TYPE "BillingSubscriptionEventType" ADD VALUE IF NOT EXISTS 'PAUSE_SCHEDULED';
ALTER TYPE "BillingSubscriptionEventType" ADD VALUE IF NOT EXISTS 'RESUME_SCHEDULED';
ALTER TYPE "BillingSubscriptionEventType" ADD VALUE IF NOT EXISTS 'RESUMED';
ALTER TYPE "BillingSubscriptionEventType" ADD VALUE IF NOT EXISTS 'CANCELLATION_SCHEDULED';
ALTER TYPE "BillingSubscriptionEventType" ADD VALUE IF NOT EXISTS 'DELETED';

CREATE TYPE "BillingSubscriptionInvoiceMode" AS ENUM ('AUTO_FINALIZE', 'DRAFT');
CREATE TYPE "BillingRenewalPricingPolicy" AS ENUM ('RETAIN_EXISTING', 'USE_LATEST', 'MARKUP', 'MARKDOWN');
CREATE TYPE "BillingSubscriptionCalendarMode" AS ENUM ('ANNIVERSARY', 'FIXED_DATES');
CREATE TYPE "BillingSubscriptionChangeTiming" AS ENUM ('IMMEDIATE', 'END_OF_TERM', 'SCHEDULED');
CREATE TYPE "BillingSubscriptionAmendmentStatus" AS ENUM ('PENDING', 'APPLIED', 'CANCELED', 'FAILED');
CREATE TYPE "BillingSubscriptionPaymentFailureBehavior" AS ENUM ('PREVENT_CHANGE', 'APPLY_CHANGE');
CREATE TYPE "BillingSubscriptionLifecycleAction" AS ENUM ('PAUSE', 'RESUME', 'CANCEL');
CREATE TYPE "BillingSubscriptionScheduleStatus" AS ENUM ('SCHEDULED', 'APPLIED', 'CANCELED', 'SKIPPED', 'FAILED');
CREATE TYPE "BillingPauseUnbilledChargeBehavior" AS ENUM ('RETAIN', 'INVOICE_IMMEDIATELY');
CREATE TYPE "BillingPauseCreditBehavior" AS ENUM ('NONE', 'PRORATE_CREDIT');
CREATE TYPE "BillingResumeBillingBehavior" AS ENUM ('CONTINUE_EXISTING_PERIOD', 'START_NEW_PERIOD');
CREATE TYPE "BillingAdvanceBillingMethod" AS ENUM ('INVOICE');
CREATE TYPE "BillingSubscriptionChargeStatus" AS ENUM ('UNBILLED', 'INVOICED', 'VOID');
CREATE TYPE "BillingSubscriptionChargeInvoiceBehavior" AS ENUM ('INVOICE_IMMEDIATELY', 'NEXT_INVOICE');
CREATE TYPE "BillingSubscriptionDiscountScope" AS ENUM ('TRANSACTION', 'ITEM');
CREATE TYPE "BillingSubscriptionDiscountSource" AS ENUM ('COUPON', 'MANUAL');
CREATE TYPE "BillingCustomViewVisibility" AS ENUM ('PRIVATE', 'TENANT');
CREATE TYPE "BillingCustomViewRuleOperator" AS ENUM ('EQUALS', 'NOT_EQUALS', 'CONTAINS', 'IN', 'BEFORE', 'AFTER', 'IS_EMPTY', 'IS_NOT_EMPTY');
CREATE TYPE "BillingSubscriptionNotificationType" AS ENUM ('DRAFT_INVOICE_READY', 'ADVANCE_BILLING_FAILED');
CREATE TYPE "BillingSubscriptionNotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

ALTER TABLE "billing_customers"
  ADD COLUMN "consolidated_billing_override" BOOLEAN;

ALTER TABLE "billing_subscriptions"
  ADD COLUMN "replaces_subscription_id" TEXT,
  ADD COLUMN "completed_regular_cycles" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "has_initial_stub_period" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "service_period_start" INTEGER,
  ADD COLUMN "service_period_end" INTEGER,
  ADD COLUMN "tax_behavior" "BillingTaxBehavior" NOT NULL DEFAULT 'EXCLUSIVE',
  ADD COLUMN "invoice_mode_override" "BillingSubscriptionInvoiceMode",
  ADD COLUMN "renewal_pricing_policy" "BillingRenewalPricingPolicy" NOT NULL DEFAULT 'RETAIN_EXISTING',
  ADD COLUMN "renewal_adjustment_percent" DECIMAL(7,4),
  ADD COLUMN "lock_activation_prices" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "remaining_cycles" INTEGER,
  ADD COLUMN "expires_at" INTEGER,
  ADD COLUMN "price_list_id" TEXT,
  ADD COLUMN "price_list_name" TEXT,
  ADD COLUMN "advance_billing_enabled" BOOLEAN,
  ADD COLUMN "advance_billing_days" INTEGER,
  ADD COLUMN "next_advance_invoice_at" INTEGER,
  ADD COLUMN "paused_at" INTEGER,
  ADD COLUMN "deleted_at" INTEGER;

ALTER TABLE "billing_subscriptions"
  ADD CONSTRAINT "billing_subscriptions_replaces_subscription_fkey"
    FOREIGN KEY ("replaces_subscription_id") REFERENCES "billing_subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "billing_subscriptions_price_list_fkey"
    FOREIGN KEY ("tenant_id", "price_list_id") REFERENCES "billing_price_lists"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "billing_subscriptions_renewal_adjustment_check"
    CHECK ("renewal_adjustment_percent" IS NULL OR "renewal_adjustment_percent" >= 0),
  ADD CONSTRAINT "billing_subscriptions_advance_billing_check"
    CHECK ("advance_billing_days" IS NULL OR "advance_billing_days" > 0),
  ADD CONSTRAINT "billing_subscriptions_remaining_cycles_check"
    CHECK ("remaining_cycles" IS NULL OR "remaining_cycles" >= 0),
  ADD CONSTRAINT "billing_subscriptions_completed_regular_cycles_check"
    CHECK ("completed_regular_cycles" >= 0);

CREATE UNIQUE INDEX "billing_subscriptions_replaces_subscription_id_key" ON "billing_subscriptions"("replaces_subscription_id");
CREATE INDEX "billing_subscriptions_tenant_next_advance_invoice_idx" ON "billing_subscriptions"("tenant_id", "next_advance_invoice_at");
CREATE INDEX "billing_subscriptions_price_list_id_idx" ON "billing_subscriptions"("price_list_id");
CREATE INDEX "billing_subscriptions_tenant_deleted_at_idx" ON "billing_subscriptions"("tenant_id", "deleted_at");

ALTER TABLE "billing_subscription_items"
  ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "starts_at" INTEGER,
  ADD COLUMN "ends_at" INTEGER;

WITH ranked AS (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "subscription_id" ORDER BY "created_at", "id") - 1 AS position
  FROM "billing_subscription_items"
)
UPDATE "billing_subscription_items" AS item
SET "position" = ranked.position
FROM ranked
WHERE item."id" = ranked."id";

DROP INDEX IF EXISTS "billing_subscription_items_subscription_id_price_id_key";
CREATE INDEX "billing_subscription_items_active_position_idx" ON "billing_subscription_items"("subscription_id", "is_active", "position");

ALTER TABLE "billing_subscription_runs"
  ADD COLUMN "is_advance_billing" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "period_advanced_at" INTEGER;
DROP INDEX IF EXISTS "billing_subscription_runs_invoice_id_key";
CREATE INDEX "billing_subscription_runs_invoice_id_idx" ON "billing_subscription_runs"("invoice_id");

-- The legacy engine stores the next unbilled period in current_period_* after
-- a successful run. For advance-billed subscriptions, the most recent
-- non-advance run is therefore the best no-loss source for the active service
-- period. Arrears subscriptions are already serving current_period_*.
UPDATE "billing_subscriptions" AS subscription
SET
  "service_period_start" = CASE
    WHEN subscription."billing_timing" = 'IN_ADVANCE' THEN COALESCE(
      (
        SELECT run."period_start"
        FROM "billing_subscription_runs" AS run
        WHERE run."subscription_id" = subscription."id"
          AND run."status" = 'SUCCEEDED'
          AND run."is_advance_billing" = false
        ORDER BY run."completed_at" DESC NULLS LAST, run."created_at" DESC
        LIMIT 1
      ),
      subscription."current_period_start"
    )
    ELSE subscription."current_period_start"
  END,
  "service_period_end" = CASE
    WHEN subscription."billing_timing" = 'IN_ADVANCE' THEN COALESCE(
      (
        SELECT run."period_end"
        FROM "billing_subscription_runs" AS run
        WHERE run."subscription_id" = subscription."id"
          AND run."status" = 'SUCCEEDED'
          AND run."is_advance_billing" = false
        ORDER BY run."completed_at" DESC NULLS LAST, run."created_at" DESC
        LIMIT 1
      ),
      subscription."current_period_end"
    )
    ELSE subscription."current_period_end"
  END
WHERE subscription."status" IN ('TRIALING', 'ACTIVE', 'PAUSED');

CREATE TABLE "billing_subscription_preferences" (
  "tenant_id" TEXT NOT NULL,
  "default_tax_behavior" "BillingTaxBehavior" NOT NULL DEFAULT 'EXCLUSIVE',
  "default_collection_method" "BillingCollectionMethod" NOT NULL DEFAULT 'SEND_INVOICE',
  "default_billing_timing" "BillingTiming" NOT NULL DEFAULT 'IN_ADVANCE',
  "default_proration_behavior" "BillingProrationBehavior" NOT NULL DEFAULT 'CREATE_PRORATIONS',
  "default_invoice_mode" "BillingSubscriptionInvoiceMode" NOT NULL DEFAULT 'AUTO_FINALIZE',
  "notify_draft_invoice" BOOLEAN NOT NULL DEFAULT false,
  "consolidated_billing_enabled" BOOLEAN NOT NULL DEFAULT false,
  "calendar_mode" "BillingSubscriptionCalendarMode" NOT NULL DEFAULT 'ANNIVERSARY',
  "pause_resume_enabled" BOOLEAN NOT NULL DEFAULT true,
  "pause_unbilled_charge_behavior" "BillingPauseUnbilledChargeBehavior" NOT NULL DEFAULT 'RETAIN',
  "pause_credit_behavior" "BillingPauseCreditBehavior" NOT NULL DEFAULT 'NONE',
  "default_resume_billing_behavior" "BillingResumeBillingBehavior" NOT NULL DEFAULT 'START_NEW_PERIOD',
  "default_renewal_pricing_policy" "BillingRenewalPricingPolicy" NOT NULL DEFAULT 'RETAIN_EXISTING',
  "lock_trial_future_activation_price" BOOLEAN NOT NULL DEFAULT true,
  "auto_apply_credits" BOOLEAN NOT NULL DEFAULT true,
  "auto_apply_excess_payments" BOOLEAN NOT NULL DEFAULT true,
  "advance_billing_enabled" BOOLEAN NOT NULL DEFAULT false,
  "advance_billing_method" "BillingAdvanceBillingMethod" NOT NULL DEFAULT 'INVOICE',
  "automate_advance_billing" BOOLEAN NOT NULL DEFAULT false,
  "advance_terms_from_period_start" BOOLEAN NOT NULL DEFAULT false,
  "notify_advance_billing_failure" BOOLEAN NOT NULL DEFAULT true,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  CONSTRAINT "billing_subscription_preferences_pkey" PRIMARY KEY ("tenant_id"),
  CONSTRAINT "billing_subscription_preferences_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "billing_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "billing_subscription_preferences" ("tenant_id", "created_at", "updated_at")
SELECT "id", EXTRACT(EPOCH FROM NOW())::INTEGER, EXTRACT(EPOCH FROM NOW())::INTEGER
FROM "billing_tenants"
ON CONFLICT ("tenant_id") DO NOTHING;

CREATE TABLE "billing_subscription_advance_rules" (
  "tenant_id" TEXT NOT NULL,
  "interval_unit" "BillingIntervalUnit" NOT NULL,
  "days_before" INTEGER NOT NULL,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  CONSTRAINT "billing_subscription_advance_rules_pkey" PRIMARY KEY ("tenant_id", "interval_unit"),
  CONSTRAINT "billing_subscription_advance_rules_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "billing_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_subscription_advance_rules_preference_fkey" FOREIGN KEY ("tenant_id") REFERENCES "billing_subscription_preferences"("tenant_id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_subscription_advance_rules_days_check" CHECK ("days_before" > 0)
);

CREATE TABLE "billing_subscription_calendar_days" (
  "tenant_id" TEXT NOT NULL,
  "day_of_month" INTEGER NOT NULL,
  CONSTRAINT "billing_subscription_calendar_days_pkey" PRIMARY KEY ("tenant_id", "day_of_month"),
  CONSTRAINT "billing_subscription_calendar_days_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "billing_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_subscription_calendar_days_preference_fkey" FOREIGN KEY ("tenant_id") REFERENCES "billing_subscription_preferences"("tenant_id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_subscription_calendar_days_day_check" CHECK ("day_of_month" BETWEEN 1 AND 31)
);

CREATE TABLE "billing_subscription_calendar_months" (
  "tenant_id" TEXT NOT NULL,
  "month" INTEGER NOT NULL,
  CONSTRAINT "billing_subscription_calendar_months_pkey" PRIMARY KEY ("tenant_id", "month"),
  CONSTRAINT "billing_subscription_calendar_months_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "billing_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_subscription_calendar_months_preference_fkey" FOREIGN KEY ("tenant_id") REFERENCES "billing_subscription_preferences"("tenant_id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_subscription_calendar_months_month_check" CHECK ("month" BETWEEN 1 AND 12)
);

CREATE TABLE "billing_subscription_amendments" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "subscription_id" TEXT NOT NULL,
  "timing" "BillingSubscriptionChangeTiming" NOT NULL DEFAULT 'IMMEDIATE',
  "effective_at" INTEGER NOT NULL,
  "status" "BillingSubscriptionAmendmentStatus" NOT NULL DEFAULT 'PENDING',
  "proration_behavior" "BillingProrationBehavior" NOT NULL DEFAULT 'CREATE_PRORATIONS',
  "payment_failure_behavior" "BillingSubscriptionPaymentFailureBehavior" NOT NULL DEFAULT 'PREVENT_CHANGE',
  "collection_method" "BillingCollectionMethod",
  "billing_timing" "BillingTiming",
  "payment_term_id" TEXT,
  "tax_behavior" "BillingTaxBehavior",
  "invoice_mode_override" "BillingSubscriptionInvoiceMode",
  "renewal_pricing_policy" "BillingRenewalPricingPolicy",
  "renewal_adjustment_percent" DECIMAL(7,4),
  "billing_cycle_anchor" INTEGER,
  "remaining_cycles" INTEGER,
  "requested_by_user_id" TEXT,
  "reason" TEXT,
  "applied_at" INTEGER,
  "canceled_at" INTEGER,
  "failure_code" TEXT,
  "failure_message" TEXT,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  CONSTRAINT "billing_subscription_amendments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_subscription_amendments_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "billing_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_subscription_amendments_subscription_fkey" FOREIGN KEY ("subscription_id") REFERENCES "billing_subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "billing_subscription_amendments_payment_term_fkey" FOREIGN KEY ("tenant_id", "payment_term_id") REFERENCES "billing_payment_terms"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "billing_subscription_amendments_tenant_id_id_key" ON "billing_subscription_amendments"("tenant_id", "id");
CREATE INDEX "billing_subscription_amendments_schedule_idx" ON "billing_subscription_amendments"("subscription_id", "status", "effective_at");
CREATE INDEX "billing_subscription_amendments_tenant_schedule_idx" ON "billing_subscription_amendments"("tenant_id", "status", "effective_at");

CREATE TABLE "billing_subscription_amendment_items" (
  "id" TEXT NOT NULL,
  "amendment_id" TEXT NOT NULL,
  "price_id" TEXT NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "unit_amount" BIGINT,
  "currency" CHAR(3),
  "description" TEXT,
  "created_at" INTEGER NOT NULL,
  CONSTRAINT "billing_subscription_amendment_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_subscription_amendment_items_amendment_fkey" FOREIGN KEY ("amendment_id") REFERENCES "billing_subscription_amendments"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_subscription_amendment_items_price_fkey" FOREIGN KEY ("price_id") REFERENCES "billing_prices"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "billing_subscription_amendment_items_quantity_check" CHECK ("quantity" > 0)
);
CREATE UNIQUE INDEX "billing_subscription_amendment_items_position_key" ON "billing_subscription_amendment_items"("amendment_id", "position");
CREATE INDEX "billing_subscription_amendment_items_price_idx" ON "billing_subscription_amendment_items"("price_id");

CREATE TABLE "billing_subscription_lifecycle_schedules" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "subscription_id" TEXT NOT NULL,
  "action" "BillingSubscriptionLifecycleAction" NOT NULL,
  "effective_at" INTEGER NOT NULL,
  "status" "BillingSubscriptionScheduleStatus" NOT NULL DEFAULT 'SCHEDULED',
  "resume_at" INTEGER,
  "pause_unbilled_behavior" "BillingPauseUnbilledChargeBehavior",
  "pause_credit_behavior" "BillingPauseCreditBehavior",
  "resume_billing_behavior" "BillingResumeBillingBehavior",
  "reason_code" TEXT,
  "reason" TEXT,
  "feedback" TEXT,
  "requested_by_user_id" TEXT,
  "applied_at" INTEGER,
  "canceled_at" INTEGER,
  "failure_message" TEXT,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  CONSTRAINT "billing_subscription_lifecycle_schedules_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_subscription_lifecycle_schedules_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "billing_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_subscription_lifecycle_schedules_subscription_fkey" FOREIGN KEY ("subscription_id") REFERENCES "billing_subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "billing_subscription_lifecycle_schedules_tenant_id_id_key" ON "billing_subscription_lifecycle_schedules"("tenant_id", "id");
CREATE INDEX "billing_subscription_schedules_subscription_idx" ON "billing_subscription_lifecycle_schedules"("subscription_id", "status", "effective_at");
CREATE INDEX "billing_subscription_schedules_tenant_idx" ON "billing_subscription_lifecycle_schedules"("tenant_id", "status", "effective_at");

CREATE TABLE "billing_subscription_charges" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "subscription_id" TEXT NOT NULL,
  "customer_id" TEXT NOT NULL,
  "addon_id" TEXT,
  "price_id" TEXT,
  "invoice_id" TEXT,
  "status" "BillingSubscriptionChargeStatus" NOT NULL DEFAULT 'UNBILLED',
  "invoice_behavior" "BillingSubscriptionChargeInvoiceBehavior" NOT NULL DEFAULT 'INVOICE_IMMEDIATELY',
  "description" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "unit_amount" BIGINT NOT NULL,
  "currency" CHAR(3) NOT NULL,
  "tax_behavior" "BillingTaxBehavior" NOT NULL DEFAULT 'EXCLUSIVE',
  "is_taxable" BOOLEAN NOT NULL DEFAULT true,
  "service_at" INTEGER,
  "created_by_user_id" TEXT,
  "invoiced_at" INTEGER,
  "voided_at" INTEGER,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  CONSTRAINT "billing_subscription_charges_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_subscription_charges_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "billing_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_subscription_charges_subscription_fkey" FOREIGN KEY ("subscription_id") REFERENCES "billing_subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "billing_subscription_charges_customer_fkey" FOREIGN KEY ("customer_id") REFERENCES "billing_customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "billing_subscription_charges_addon_fkey" FOREIGN KEY ("addon_id") REFERENCES "billing_addons"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "billing_subscription_charges_price_fkey" FOREIGN KEY ("price_id") REFERENCES "billing_prices"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "billing_subscription_charges_invoice_fkey" FOREIGN KEY ("invoice_id") REFERENCES "billing_invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "billing_subscription_charges_quantity_check" CHECK ("quantity" > 0),
  CONSTRAINT "billing_subscription_charges_amount_check" CHECK ("unit_amount" >= 0)
);
CREATE UNIQUE INDEX "billing_subscription_charges_tenant_id_id_key" ON "billing_subscription_charges"("tenant_id", "id");
CREATE INDEX "billing_subscription_charges_subscription_idx" ON "billing_subscription_charges"("subscription_id", "status", "created_at");
CREATE INDEX "billing_subscription_charges_customer_idx" ON "billing_subscription_charges"("customer_id", "status");
CREATE INDEX "billing_subscription_charges_invoice_idx" ON "billing_subscription_charges"("invoice_id");

ALTER TABLE "billing_invoice_lines"
  ADD COLUMN "subscription_charge_id" TEXT,
  ADD CONSTRAINT "billing_invoice_lines_subscription_charge_fkey" FOREIGN KEY ("subscription_charge_id") REFERENCES "billing_subscription_charges"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "billing_invoice_lines_subscription_charge_id_idx" ON "billing_invoice_lines"("subscription_charge_id");

CREATE TABLE "billing_invoice_subscriptions" (
  "tenant_id" TEXT NOT NULL,
  "invoice_id" TEXT NOT NULL,
  "subscription_id" TEXT NOT NULL,
  "service_period_start" INTEGER,
  "service_period_end" INTEGER,
  "subtotal_amount" BIGINT NOT NULL DEFAULT 0,
  "discount_amount" BIGINT NOT NULL DEFAULT 0,
  "tax_amount" BIGINT NOT NULL DEFAULT 0,
  "total_amount" BIGINT NOT NULL DEFAULT 0,
  "created_at" INTEGER NOT NULL,
  CONSTRAINT "billing_invoice_subscriptions_pkey" PRIMARY KEY ("invoice_id", "subscription_id"),
  CONSTRAINT "billing_invoice_subscriptions_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "billing_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_invoice_subscriptions_invoice_fkey" FOREIGN KEY ("invoice_id") REFERENCES "billing_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_invoice_subscriptions_subscription_fkey" FOREIGN KEY ("subscription_id") REFERENCES "billing_subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "billing_invoice_subscriptions_tenant_subscription_idx" ON "billing_invoice_subscriptions"("tenant_id", "subscription_id");

ALTER TABLE "billing_subscription_discounts"
  ALTER COLUMN "coupon_id" DROP NOT NULL,
  ADD COLUMN "subscription_item_id" TEXT,
  ADD COLUMN "source" "BillingSubscriptionDiscountSource" NOT NULL DEFAULT 'COUPON',
  ADD COLUMN "scope" "BillingSubscriptionDiscountScope" NOT NULL DEFAULT 'TRANSACTION',
  ADD CONSTRAINT "billing_subscription_discounts_subscription_item_fkey" FOREIGN KEY ("subscription_item_id") REFERENCES "billing_subscription_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "billing_subscription_discounts_value_check" CHECK (
    ("discount_type" = 'PERCENTAGE' AND "percent_off" > 0 AND "amount_off" IS NULL)
    OR ("discount_type" = 'AMOUNT' AND "amount_off" IS NOT NULL AND "amount_off" >= 0 AND "percent_off" IS NULL)
  );
CREATE INDEX "billing_subscription_discounts_subscription_item_idx" ON "billing_subscription_discounts"("subscription_item_id");

CREATE TABLE "billing_subscription_custom_views" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "owner_user_id" TEXT,
  "visibility" "BillingCustomViewVisibility" NOT NULL DEFAULT 'PRIVATE',
  "is_favorite" BOOLEAN NOT NULL DEFAULT false,
  "sort_field" TEXT,
  "sort_direction" TEXT,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  CONSTRAINT "billing_subscription_custom_views_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_subscription_custom_views_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "billing_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_subscription_custom_views_sort_direction_check" CHECK ("sort_direction" IS NULL OR "sort_direction" IN ('asc', 'desc'))
);
CREATE UNIQUE INDEX "billing_subscription_custom_views_tenant_id_id_key" ON "billing_subscription_custom_views"("tenant_id", "id");
CREATE UNIQUE INDEX "billing_subscription_views_owner_name_key" ON "billing_subscription_custom_views"("tenant_id", "owner_user_id", "name");
CREATE INDEX "billing_subscription_views_visibility_idx" ON "billing_subscription_custom_views"("tenant_id", "visibility", "is_favorite");

CREATE TABLE "billing_subscription_custom_view_rules" (
  "id" TEXT NOT NULL,
  "view_id" TEXT NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  "field" TEXT NOT NULL,
  "operator" "BillingCustomViewRuleOperator" NOT NULL,
  "value" TEXT,
  CONSTRAINT "billing_subscription_custom_view_rules_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_subscription_custom_view_rules_view_fkey" FOREIGN KEY ("view_id") REFERENCES "billing_subscription_custom_views"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "billing_subscription_view_rules_position_key" ON "billing_subscription_custom_view_rules"("view_id", "position");

CREATE TABLE "billing_subscription_custom_view_columns" (
  "id" TEXT NOT NULL,
  "view_id" TEXT NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  "field" TEXT NOT NULL,
  CONSTRAINT "billing_subscription_custom_view_columns_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_subscription_custom_view_columns_view_fkey" FOREIGN KEY ("view_id") REFERENCES "billing_subscription_custom_views"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "billing_subscription_view_columns_position_key" ON "billing_subscription_custom_view_columns"("view_id", "position");

CREATE TABLE "billing_subscription_notification_outbox" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "subscription_id" TEXT,
  "invoice_id" TEXT,
  "type" "BillingSubscriptionNotificationType" NOT NULL,
  "status" "BillingSubscriptionNotificationStatus" NOT NULL DEFAULT 'PENDING',
  "dedupe_key" TEXT NOT NULL,
  "payload" JSONB,
  "attempt_count" INTEGER NOT NULL DEFAULT 0,
  "last_attempt_at" INTEGER,
  "delivered_at" INTEGER,
  "failure_message" TEXT,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  CONSTRAINT "billing_subscription_notification_outbox_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_subscription_notification_outbox_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "billing_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_subscription_notification_outbox_subscription_fkey" FOREIGN KEY ("subscription_id") REFERENCES "billing_subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "billing_subscription_notification_outbox_invoice_fkey" FOREIGN KEY ("invoice_id") REFERENCES "billing_invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "billing_subscription_notifications_dedupe_key" ON "billing_subscription_notification_outbox"("tenant_id", "dedupe_key");
CREATE INDEX "billing_subscription_notifications_delivery_idx" ON "billing_subscription_notification_outbox"("tenant_id", "status", "created_at");
CREATE INDEX "billing_subscription_notifications_subscription_idx" ON "billing_subscription_notification_outbox"("subscription_id", "created_at");

-- Backfill join evidence for existing subscription invoices before new
-- consolidated invoices begin using the same relation.
INSERT INTO "billing_invoice_subscriptions" (
  "tenant_id", "invoice_id", "subscription_id", "service_period_start",
  "service_period_end", "subtotal_amount", "discount_amount", "tax_amount",
  "total_amount", "created_at"
)
SELECT
  "tenant_id", "id", "subscription_id", "service_period_start",
  "service_period_end", "subtotal_amount", "discount_amount", "tax_amount",
  "total_amount", "created_at"
FROM "billing_invoices"
WHERE "subscription_id" IS NOT NULL
ON CONFLICT ("invoice_id", "subscription_id") DO NOTHING;
