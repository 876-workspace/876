CREATE TYPE "BillingTenantStatus" AS ENUM ('ACTIVE', 'SUSPENDED');
CREATE TYPE "BillingCustomerStatus" AS ENUM ('ACTIVE', 'ARCHIVED');
CREATE TYPE "BillingInterval" AS ENUM ('MONTH', 'YEAR');
CREATE TYPE "BillingSubscriptionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'TRIALING', 'PAUSED', 'CANCELED', 'ENDED');
CREATE TYPE "BillingSubscriptionEventType" AS ENUM ('CREATED', 'ACTIVATED', 'TRIAL_STARTED', 'PAUSED', 'CANCELED', 'REACTIVATED', 'ENDED', 'ENTITLEMENT_SYNCED', 'ENTITLEMENT_SYNC_FAILED');

CREATE TABLE "billing_tenants" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "default_currency" TEXT NOT NULL DEFAULT 'JMD',
  "status" "BillingTenantStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  CONSTRAINT "billing_tenants_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "billing_tenants_organization_id_key" ON "billing_tenants"("organization_id");
CREATE UNIQUE INDEX "billing_tenants_slug_key" ON "billing_tenants"("slug");

CREATE TABLE "billing_customers" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "organization_id" TEXT,
  "user_id" TEXT,
  "external_reference" TEXT,
  "name" TEXT NOT NULL,
  "email" TEXT,
  "default_currency" TEXT,
  "status" "BillingCustomerStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  CONSTRAINT "billing_customers_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_customers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "billing_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "billing_customers_tenant_id_organization_id_key" ON "billing_customers"("tenant_id", "organization_id");
CREATE UNIQUE INDEX "billing_customers_tenant_id_user_id_key" ON "billing_customers"("tenant_id", "user_id");
CREATE INDEX "billing_customers_tenant_id_idx" ON "billing_customers"("tenant_id");
CREATE INDEX "billing_customers_external_reference_idx" ON "billing_customers"("external_reference");

CREATE TABLE "billing_products" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "source_app_id" TEXT,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  CONSTRAINT "billing_products_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_products_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "billing_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "billing_products_tenant_id_slug_key" ON "billing_products"("tenant_id", "slug");
CREATE INDEX "billing_products_tenant_id_idx" ON "billing_products"("tenant_id");
CREATE INDEX "billing_products_source_app_id_idx" ON "billing_products"("source_app_id");

CREATE TABLE "billing_prices" (
  "id" TEXT NOT NULL,
  "product_id" TEXT NOT NULL,
  "nickname" TEXT,
  "unit_amount" BIGINT NOT NULL,
  "currency" TEXT NOT NULL,
  "billing_interval" "BillingInterval",
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "grace_period_days" INTEGER NOT NULL DEFAULT 0,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  CONSTRAINT "billing_prices_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_prices_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "billing_products"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "billing_prices_product_id_idx" ON "billing_prices"("product_id");

CREATE TABLE "billing_subscriptions" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "customer_id" TEXT NOT NULL,
  "status" "BillingSubscriptionStatus" NOT NULL DEFAULT 'DRAFT',
  "start_at" INTEGER,
  "current_period_start" INTEGER,
  "current_period_end" INTEGER,
  "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
  "canceled_at" INTEGER,
  "ended_at" INTEGER,
  "entitlement_reference_id" TEXT,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  CONSTRAINT "billing_subscriptions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_subscriptions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "billing_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_subscriptions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "billing_customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "billing_subscriptions_tenant_id_idx" ON "billing_subscriptions"("tenant_id");
CREATE INDEX "billing_subscriptions_customer_id_idx" ON "billing_subscriptions"("customer_id");
CREATE INDEX "billing_subscriptions_status_idx" ON "billing_subscriptions"("status");

CREATE TABLE "billing_subscription_items" (
  "id" TEXT NOT NULL,
  "subscription_id" TEXT NOT NULL,
  "price_id" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  CONSTRAINT "billing_subscription_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_subscription_items_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "billing_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_subscription_items_price_id_fkey" FOREIGN KEY ("price_id") REFERENCES "billing_prices"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "billing_subscription_items_subscription_id_price_id_key" ON "billing_subscription_items"("subscription_id", "price_id");
CREATE INDEX "billing_subscription_items_price_id_idx" ON "billing_subscription_items"("price_id");

CREATE TABLE "billing_subscription_events" (
  "id" TEXT NOT NULL,
  "subscription_id" TEXT NOT NULL,
  "type" "BillingSubscriptionEventType" NOT NULL,
  "actor_user_id" TEXT,
  "details" JSONB,
  "occurred_at" INTEGER NOT NULL,
  CONSTRAINT "billing_subscription_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_subscription_events_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "billing_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "billing_subscription_events_subscription_id_occurred_at_idx" ON "billing_subscription_events"("subscription_id", "occurred_at");
