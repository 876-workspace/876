-- Accounting providers are deliberately separate from payment providers. 876
-- remains the canonical finance model; these rows configure external execution
-- and mirror targets without introducing provider ids on business tables.
CREATE TABLE "billing_accounting_providers" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "adapter" TEXT NOT NULL,
  "capabilities" JSONB NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  CONSTRAINT "billing_accounting_providers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "billing_accounting_providers_key_key"
  ON "billing_accounting_providers"("key");

CREATE TABLE "billing_accounting_provider_connections" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "provider_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "environment" TEXT NOT NULL DEFAULT 'live',
  "status" TEXT NOT NULL DEFAULT 'pending',
  "mode" TEXT NOT NULL DEFAULT 'mirror',
  "provider_organization_id" TEXT,
  "accounts_domain" TEXT,
  "api_domain" TEXT,
  "scopes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "sealed_refresh_token" TEXT,
  "refresh_token_key_id" TEXT,
  "refresh_token_vault_provider" TEXT,
  "settings" JSONB,
  "last_synced_at" INTEGER,
  "last_successful_sync_at" INTEGER,
  "last_error_code" TEXT,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  CONSTRAINT "billing_accounting_provider_connections_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_accounting_provider_connections_environment_check"
    CHECK ("environment" IN ('sandbox', 'live')),
  CONSTRAINT "billing_accounting_provider_connections_status_check"
    CHECK ("status" IN ('pending', 'active', 'disabled', 'error')),
  CONSTRAINT "billing_accounting_provider_connections_mode_check"
    CHECK ("mode" IN ('native', 'mirror', 'provider-backed'))
);

CREATE UNIQUE INDEX "billing_accounting_provider_connections_tenant_id_id_key"
  ON "billing_accounting_provider_connections"("tenant_id", "id");
CREATE UNIQUE INDEX "billing_accounting_provider_connections_tenant_provider_name_key"
  ON "billing_accounting_provider_connections"("tenant_id", "provider_id", "name");
CREATE UNIQUE INDEX "billing_accounting_provider_connections_external_org_key"
  ON "billing_accounting_provider_connections"("tenant_id", "provider_id", "provider_organization_id");
CREATE INDEX "billing_accounting_provider_connections_tenant_status_idx"
  ON "billing_accounting_provider_connections"("tenant_id", "status");
CREATE INDEX "billing_accounting_provider_connections_provider_id_idx"
  ON "billing_accounting_provider_connections"("provider_id");

ALTER TABLE "billing_accounting_provider_connections"
  ADD CONSTRAINT "billing_accounting_provider_connections_tenant_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "billing_tenants"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "billing_accounting_provider_connections"
  ADD CONSTRAINT "billing_accounting_provider_connections_provider_fkey"
  FOREIGN KEY ("provider_id") REFERENCES "billing_accounting_providers"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "billing_accounting_provider_sync_jobs" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "connection_id" TEXT NOT NULL,
  "resource_type" TEXT NOT NULL,
  "resource_id" TEXT NOT NULL,
  "operation" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "attempt_count" INTEGER NOT NULL DEFAULT 0,
  "available_at" INTEGER NOT NULL,
  "locked_at" INTEGER,
  "delivered_at" INTEGER,
  "last_error_code" TEXT,
  "last_error" TEXT,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  CONSTRAINT "billing_accounting_provider_sync_jobs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_accounting_provider_sync_jobs_resource_type_check"
    CHECK ("resource_type" IN ('customer', 'item', 'estimate', 'invoice', 'recurring-invoice', 'payment')),
  CONSTRAINT "billing_accounting_provider_sync_jobs_operation_check"
    CHECK ("operation" IN ('create', 'update', 'archive', 'sync', 'reconcile')),
  CONSTRAINT "billing_accounting_provider_sync_jobs_status_check"
    CHECK ("status" IN ('pending', 'processing', 'delivered', 'failed'))
);

CREATE UNIQUE INDEX "billing_accounting_provider_sync_jobs_resource_key"
  ON "billing_accounting_provider_sync_jobs"("connection_id", "resource_type", "resource_id");
CREATE INDEX "billing_accounting_provider_sync_jobs_delivery_idx"
  ON "billing_accounting_provider_sync_jobs"("status", "available_at", "created_at");
CREATE INDEX "billing_accounting_provider_sync_jobs_connection_idx"
  ON "billing_accounting_provider_sync_jobs"("tenant_id", "connection_id");

ALTER TABLE "billing_accounting_provider_sync_jobs"
  ADD CONSTRAINT "billing_accounting_provider_sync_jobs_tenant_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "billing_tenants"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "billing_accounting_provider_sync_jobs"
  ADD CONSTRAINT "billing_accounting_provider_sync_jobs_connection_fkey"
  FOREIGN KEY ("tenant_id", "connection_id")
  REFERENCES "billing_accounting_provider_connections"("tenant_id", "id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "billing_provider_references"
  ADD COLUMN "accounting_provider_connection_id" TEXT;

CREATE INDEX "billing_provider_references_accounting_connection_idx"
  ON "billing_provider_references"("tenant_id", "accounting_provider_connection_id");

ALTER TABLE "billing_provider_references"
  ADD CONSTRAINT "billing_provider_references_accounting_connection_fkey"
  FOREIGN KEY ("tenant_id", "accounting_provider_connection_id")
  REFERENCES "billing_accounting_provider_connections"("tenant_id", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "billing_provider_references"
  ADD CONSTRAINT "billing_provider_references_single_connection_check"
  CHECK (NOT (
    "provider_connection_id" IS NOT NULL AND
    "accounting_provider_connection_id" IS NOT NULL
  ));

INSERT INTO "billing_accounting_providers" (
  "id", "key", "name", "adapter", "capabilities", "is_active", "created_at", "updated_at"
) VALUES (
  'aprov_zoho_books',
  'zoho-books',
  'Zoho Books',
  'zoho-books',
  '{"customers":true,"items":true,"estimates":true,"invoices":true,"recurringInvoices":true,"paymentsReceived":true,"imports":true,"webhooks":true}'::JSONB,
  true,
  EXTRACT(EPOCH FROM NOW())::INTEGER,
  EXTRACT(EPOCH FROM NOW())::INTEGER
)
ON CONFLICT ("key") DO NOTHING;
