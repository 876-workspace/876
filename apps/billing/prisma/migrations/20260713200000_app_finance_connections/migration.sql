-- Separate embedded finance capability from paid 876 Billing access. This is
-- additive: existing tenants and every financial record remain unchanged.
CREATE TYPE "BillingAppFinanceConnectionStatus" AS ENUM (
  'PROVISIONING',
  'ACTIVE',
  'SUSPENDED',
  'REVOKED'
);

CREATE TABLE "billing_app_finance_connections" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "source_app_id" TEXT NOT NULL,
  "status" "BillingAppFinanceConnectionStatus" NOT NULL DEFAULT 'PROVISIONING',
  "scopes" TEXT[] NOT NULL,
  "entitlement_reference" TEXT,
  "provisioning_version" INTEGER NOT NULL DEFAULT 1,
  "lifecycle_version" INTEGER NOT NULL DEFAULT 1,
  "activated_at" INTEGER,
  "suspended_at" INTEGER,
  "revoked_at" INTEGER,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  CONSTRAINT "billing_app_finance_connections_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_app_finance_connections_versions_check"
    CHECK ("provisioning_version" > 0 AND "lifecycle_version" > 0),
  CONSTRAINT "billing_app_finance_connections_tenant_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "billing_tenants"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "billing_app_finance_connections_tenant_source_app_key"
  ON "billing_app_finance_connections"("tenant_id", "source_app_id");
CREATE INDEX "billing_app_finance_connections_tenant_status_idx"
  ON "billing_app_finance_connections"("tenant_id", "status");
CREATE INDEX "billing_app_finance_connections_source_app_status_idx"
  ON "billing_app_finance_connections"("source_app_id", "status");
