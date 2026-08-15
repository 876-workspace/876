-- Product catalog expansion: add-ons, catalog pricing, advanced coupons, and
-- price lists. This migration is additive and preserves every existing row.

CREATE TYPE "BillingAddonAssociationType" AS ENUM ('OPTIONAL', 'RECOMMENDED', 'MANDATORY');
CREATE TYPE "BillingAddonAssociationEvent" AS ENUM ('SUBSCRIPTION_ACTIVATION', 'PLAN_CHANGE', 'TRIAL_ACTIVATION');
CREATE TYPE "BillingAddonAssociationFrequency" AS ENUM ('EVERY_OCCURRENCE', 'FIRST_OCCURRENCE');
CREATE TYPE "BillingCouponDiscountPreference" AS ENUM ('INVOICE_LEVEL', 'ITEM_LEVEL');
CREATE TYPE "BillingPriceListMode" AS ENUM ('PERCENTAGE', 'CUSTOM');
CREATE TYPE "BillingPriceListDirection" AS ENUM ('MARKUP', 'MARKDOWN');
CREATE TYPE "BillingPriceListRounding" AS ENUM ('NONE', 'NEAREST', 'UP', 'DOWN');

ALTER TABLE "billing_products"
  ADD COLUMN "fallback_plan_id" TEXT;

ALTER TABLE "billing_plans"
  ADD COLUMN "image_url" TEXT,
  ADD COLUMN "unit_name" TEXT,
  ADD COLUMN "tax_code" TEXT,
  ADD COLUMN "is_free" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "show_in_checkout" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "billing_addons" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "product_id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "image_url" TEXT,
  "type" "BillingItemType" NOT NULL DEFAULT 'SERVICE',
  "price_type" "BillingPriceType" NOT NULL DEFAULT 'RECURRING',
  "interval_unit" "BillingIntervalUnit",
  "interval_count" INTEGER,
  "unit_name" TEXT,
  "tax_code" TEXT,
  "is_taxable" BOOLEAN NOT NULL DEFAULT false,
  "show_in_checkout" BOOLEAN NOT NULL DEFAULT true,
  "allow_portal_management" BOOLEAN NOT NULL DEFAULT false,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "metadata" JSONB,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  CONSTRAINT "billing_addons_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_addons_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "billing_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_addons_product_fkey" FOREIGN KEY ("product_id") REFERENCES "billing_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "billing_addons_interval_check" CHECK (
    ("price_type" = 'ONE_TIME' AND "interval_unit" IS NULL AND "interval_count" IS NULL)
    OR ("price_type" = 'RECURRING' AND "interval_unit" IS NOT NULL AND "interval_count" > 0)
  )
);
CREATE UNIQUE INDEX "billing_addons_tenant_code_key" ON "billing_addons" ("tenant_id", "code");
CREATE INDEX "billing_addons_tenant_active_idx" ON "billing_addons" ("tenant_id", "is_active");
CREATE INDEX "billing_addons_product_idx" ON "billing_addons" ("product_id");

CREATE TABLE "billing_plan_addon_associations" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "plan_id" TEXT NOT NULL,
  "addon_id" TEXT NOT NULL,
  "association_type" "BillingAddonAssociationType" NOT NULL DEFAULT 'OPTIONAL',
  "events" "BillingAddonAssociationEvent"[] NOT NULL DEFAULT ARRAY['SUBSCRIPTION_ACTIVATION']::"BillingAddonAssociationEvent"[],
  "frequency" "BillingAddonAssociationFrequency" NOT NULL DEFAULT 'EVERY_OCCURRENCE',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  CONSTRAINT "billing_plan_addon_associations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_plan_addon_associations_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "billing_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_plan_addon_associations_plan_fkey" FOREIGN KEY ("plan_id") REFERENCES "billing_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_plan_addon_associations_addon_fkey" FOREIGN KEY ("addon_id") REFERENCES "billing_addons"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "billing_plan_addon_associations_key" ON "billing_plan_addon_associations" ("tenant_id", "plan_id", "addon_id");
CREATE INDEX "billing_plan_addon_associations_addon_idx" ON "billing_plan_addon_associations" ("addon_id", "is_active");

ALTER TABLE "billing_prices"
  DROP CONSTRAINT "billing_prices_owner_check",
  ADD COLUMN "addon_id" TEXT,
  ADD CONSTRAINT "billing_prices_owner_check" CHECK (
    (("item_id" IS NOT NULL)::INTEGER + ("plan_id" IS NOT NULL)::INTEGER + ("addon_id" IS NOT NULL)::INTEGER) = 1
  ),
  ADD CONSTRAINT "billing_prices_addon_fkey" FOREIGN KEY ("addon_id") REFERENCES "billing_addons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "billing_prices_addon_id_idx" ON "billing_prices" ("addon_id");

ALTER TABLE "billing_products"
  ADD CONSTRAINT "billing_products_fallback_plan_fkey" FOREIGN KEY ("fallback_plan_id") REFERENCES "billing_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "billing_products_fallback_plan_id_idx" ON "billing_products" ("fallback_plan_id");

CREATE TABLE "billing_price_lists" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "mode" "BillingPriceListMode" NOT NULL,
  "direction" "BillingPriceListDirection",
  "percentage" DECIMAL(7,4),
  "currency" CHAR(3),
  "rounding" "BillingPriceListRounding" NOT NULL DEFAULT 'NONE',
  "rounding_precision" INTEGER NOT NULL DEFAULT 2,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  CONSTRAINT "billing_price_lists_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_price_lists_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "billing_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_price_lists_mode_check" CHECK (
    ("mode" = 'PERCENTAGE' AND "direction" IS NOT NULL AND "percentage" > 0)
    OR ("mode" = 'CUSTOM' AND "currency" IS NOT NULL)
  ),
  CONSTRAINT "billing_price_lists_rounding_precision_check" CHECK ("rounding_precision" BETWEEN 0 AND 6)
);
CREATE UNIQUE INDEX "billing_price_lists_tenant_id_id_key" ON "billing_price_lists" ("tenant_id", "id");
CREATE UNIQUE INDEX "billing_price_lists_tenant_name_key" ON "billing_price_lists" ("tenant_id", "name");
CREATE INDEX "billing_price_lists_tenant_active_idx" ON "billing_price_lists" ("tenant_id", "is_active");

CREATE TABLE "billing_price_list_entries" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "price_list_id" TEXT NOT NULL,
  "price_id" TEXT NOT NULL,
  "unit_amount" BIGINT,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  CONSTRAINT "billing_price_list_entries_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_price_list_entries_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "billing_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_price_list_entries_list_fkey" FOREIGN KEY ("tenant_id", "price_list_id") REFERENCES "billing_price_lists"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_price_list_entries_price_fkey" FOREIGN KEY ("price_id") REFERENCES "billing_prices"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "billing_price_list_entries_amount_check" CHECK ("unit_amount" IS NULL OR "unit_amount" >= 0)
);
CREATE UNIQUE INDEX "billing_price_list_entries_price_key" ON "billing_price_list_entries" ("tenant_id", "price_list_id", "price_id");
CREATE INDEX "billing_price_list_entries_price_idx" ON "billing_price_list_entries" ("price_id");

CREATE TABLE "billing_price_list_entry_tiers" (
  "id" TEXT NOT NULL,
  "price_list_entry_id" TEXT NOT NULL,
  "from_unit" INTEGER NOT NULL,
  "to_unit" INTEGER,
  "unit_amount" BIGINT NOT NULL,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  CONSTRAINT "billing_price_list_entry_tiers_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_price_list_entry_tiers_entry_fkey" FOREIGN KEY ("price_list_entry_id") REFERENCES "billing_price_list_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_price_list_entry_tiers_range_check" CHECK ("from_unit" > 0 AND ("to_unit" IS NULL OR "to_unit" >= "from_unit") AND "unit_amount" >= 0)
);
CREATE UNIQUE INDEX "billing_price_list_entry_tiers_from_key" ON "billing_price_list_entry_tiers" ("price_list_entry_id", "from_unit");
CREATE INDEX "billing_price_list_entry_tiers_entry_idx" ON "billing_price_list_entry_tiers" ("price_list_entry_id");

ALTER TABLE "billing_customers"
  ADD COLUMN "price_list_id" TEXT,
  ADD CONSTRAINT "billing_customers_price_list_fkey" FOREIGN KEY ("tenant_id", "price_list_id") REFERENCES "billing_price_lists"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "billing_quotes"
  ADD COLUMN "price_list_id" TEXT,
  ADD COLUMN "price_list_name" TEXT,
  ADD CONSTRAINT "billing_quotes_price_list_fkey" FOREIGN KEY ("tenant_id", "price_list_id") REFERENCES "billing_price_lists"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "billing_estimates"
  ADD COLUMN "price_list_id" TEXT,
  ADD COLUMN "price_list_name" TEXT,
  ADD CONSTRAINT "billing_estimates_price_list_fkey" FOREIGN KEY ("tenant_id", "price_list_id") REFERENCES "billing_price_lists"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "billing_invoices"
  ADD COLUMN "price_list_id" TEXT,
  ADD COLUMN "price_list_name" TEXT,
  ADD CONSTRAINT "billing_invoices_price_list_fkey" FOREIGN KEY ("tenant_id", "price_list_id") REFERENCES "billing_price_lists"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "billing_subscription_items" ADD COLUMN "description" TEXT;
UPDATE "billing_subscription_items" subscription_item
SET "description" = COALESCE(plan."name", addon."name", item."name", price."nickname")
FROM "billing_prices" price
LEFT JOIN "billing_plans" plan ON plan."id" = price."plan_id"
LEFT JOIN "billing_addons" addon ON addon."id" = price."addon_id"
LEFT JOIN "billing_items" item ON item."id" = price."item_id"
WHERE price."id" = subscription_item."price_id";

ALTER TABLE "billing_coupons"
  ADD COLUMN "discount_preference" "BillingCouponDiscountPreference" NOT NULL DEFAULT 'INVOICE_LEVEL',
  ADD COLUMN "applies_to_all_plans" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "applies_to_all_recurring_addons" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "applies_to_all_one_time_addons" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "eligible_for_all_customers" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "max_redemptions_per_customer" INTEGER,
  ADD CONSTRAINT "billing_coupons_customer_limit_check" CHECK ("max_redemptions_per_customer" IS NULL OR "max_redemptions_per_customer" > 0);

CREATE TABLE "billing_coupon_currency_amounts" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "coupon_id" TEXT NOT NULL,
  "currency" CHAR(3) NOT NULL,
  "amount_off" BIGINT NOT NULL,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  CONSTRAINT "billing_coupon_currency_amounts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_coupon_currency_amounts_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "billing_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_coupon_currency_amounts_coupon_fkey" FOREIGN KEY ("tenant_id", "coupon_id") REFERENCES "billing_coupons"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_coupon_currency_amounts_amount_check" CHECK ("amount_off" > 0)
);
CREATE UNIQUE INDEX "billing_coupon_currency_amounts_coupon_currency_key" ON "billing_coupon_currency_amounts" ("tenant_id", "coupon_id", "currency");
CREATE INDEX "billing_coupon_currency_amounts_tenant_currency_idx" ON "billing_coupon_currency_amounts" ("tenant_id", "currency");

CREATE TABLE "billing_coupon_plan_applicabilities" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "coupon_id" TEXT NOT NULL,
  "plan_id" TEXT NOT NULL,
  "created_at" INTEGER NOT NULL,
  CONSTRAINT "billing_coupon_plan_applicabilities_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_coupon_plan_applicabilities_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "billing_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_coupon_plan_applicabilities_coupon_fkey" FOREIGN KEY ("tenant_id", "coupon_id") REFERENCES "billing_coupons"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_coupon_plan_applicabilities_plan_fkey" FOREIGN KEY ("plan_id") REFERENCES "billing_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "billing_coupon_plan_applicability_key" ON "billing_coupon_plan_applicabilities" ("tenant_id", "coupon_id", "plan_id");
CREATE INDEX "billing_coupon_plan_applicability_plan_idx" ON "billing_coupon_plan_applicabilities" ("plan_id");

CREATE TABLE "billing_coupon_addon_applicabilities" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "coupon_id" TEXT NOT NULL,
  "addon_id" TEXT NOT NULL,
  "created_at" INTEGER NOT NULL,
  CONSTRAINT "billing_coupon_addon_applicabilities_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_coupon_addon_applicabilities_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "billing_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_coupon_addon_applicabilities_coupon_fkey" FOREIGN KEY ("tenant_id", "coupon_id") REFERENCES "billing_coupons"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_coupon_addon_applicabilities_addon_fkey" FOREIGN KEY ("addon_id") REFERENCES "billing_addons"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "billing_coupon_addon_applicability_key" ON "billing_coupon_addon_applicabilities" ("tenant_id", "coupon_id", "addon_id");
CREATE INDEX "billing_coupon_addon_applicability_addon_idx" ON "billing_coupon_addon_applicabilities" ("addon_id");

CREATE TABLE "billing_coupon_customer_eligibilities" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "coupon_id" TEXT NOT NULL,
  "customer_id" TEXT NOT NULL,
  "created_at" INTEGER NOT NULL,
  CONSTRAINT "billing_coupon_customer_eligibilities_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_coupon_customer_eligibilities_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "billing_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_coupon_customer_eligibilities_coupon_fkey" FOREIGN KEY ("tenant_id", "coupon_id") REFERENCES "billing_coupons"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_coupon_customer_eligibilities_customer_fkey" FOREIGN KEY ("tenant_id", "customer_id") REFERENCES "billing_customers"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "billing_coupon_customer_eligibility_key" ON "billing_coupon_customer_eligibilities" ("tenant_id", "coupon_id", "customer_id");
CREATE INDEX "billing_coupon_customer_eligibility_customer_idx" ON "billing_coupon_customer_eligibilities" ("customer_id");

CREATE TABLE "billing_coupon_redemptions" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "coupon_id" TEXT NOT NULL,
  "promotion_code_id" TEXT,
  "customer_id" TEXT NOT NULL,
  "subscription_id" TEXT,
  "invoice_id" TEXT,
  "discount_amount" BIGINT,
  "currency" CHAR(3),
  "redeemed_at" INTEGER NOT NULL,
  CONSTRAINT "billing_coupon_redemptions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_coupon_redemptions_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "billing_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_coupon_redemptions_coupon_fkey" FOREIGN KEY ("tenant_id", "coupon_id") REFERENCES "billing_coupons"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "billing_coupon_redemptions_code_fkey" FOREIGN KEY ("tenant_id", "promotion_code_id") REFERENCES "billing_promotion_codes"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "billing_coupon_redemptions_customer_fkey" FOREIGN KEY ("tenant_id", "customer_id") REFERENCES "billing_customers"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "billing_coupon_redemptions_subscription_fkey" FOREIGN KEY ("subscription_id") REFERENCES "billing_subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "billing_coupon_redemptions_invoice_fkey" FOREIGN KEY ("invoice_id") REFERENCES "billing_invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "billing_coupon_redemptions_amount_check" CHECK ("discount_amount" IS NULL OR "discount_amount" >= 0)
);
CREATE INDEX "billing_coupon_redemptions_coupon_customer_idx" ON "billing_coupon_redemptions" ("tenant_id", "coupon_id", "customer_id");
CREATE INDEX "billing_coupon_redemptions_promotion_code_idx" ON "billing_coupon_redemptions" ("promotion_code_id");
CREATE INDEX "billing_coupon_redemptions_subscription_idx" ON "billing_coupon_redemptions" ("subscription_id");
