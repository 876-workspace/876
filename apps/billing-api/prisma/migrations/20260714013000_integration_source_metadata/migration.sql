-- Add nullable origin metadata and per-app idempotency keys to shared finance
-- resources. Existing Billing-native and historical rows remain untouched.
ALTER TABLE "billing_customers"
  ADD COLUMN "source_app_id" TEXT,
  ADD COLUMN "source_external_reference" TEXT,
  ADD COLUMN "source_idempotency_key" TEXT,
  ADD COLUMN "source_payload_hash" TEXT;

ALTER TABLE "billing_items"
  ADD COLUMN "source_app_id" TEXT,
  ADD COLUMN "source_external_reference" TEXT,
  ADD COLUMN "source_idempotency_key" TEXT,
  ADD COLUMN "source_payload_hash" TEXT;

ALTER TABLE "billing_invoices"
  ADD COLUMN "source_app_id" TEXT,
  ADD COLUMN "source_external_reference" TEXT,
  ADD COLUMN "source_idempotency_key" TEXT,
  ADD COLUMN "source_payload_hash" TEXT;

ALTER TABLE "billing_payments"
  ADD COLUMN "source_app_id" TEXT,
  ADD COLUMN "source_external_reference" TEXT,
  ADD COLUMN "source_idempotency_key" TEXT,
  ADD COLUMN "source_payload_hash" TEXT;

CREATE UNIQUE INDEX "billing_customers_source_external_key"
  ON "billing_customers"("tenant_id", "source_app_id", "source_external_reference");
CREATE UNIQUE INDEX "billing_customers_source_idempotency_key"
  ON "billing_customers"("tenant_id", "source_app_id", "source_idempotency_key");
CREATE INDEX "billing_customers_source_app_idx"
  ON "billing_customers"("tenant_id", "source_app_id");

CREATE UNIQUE INDEX "billing_items_source_external_key"
  ON "billing_items"("tenant_id", "source_app_id", "source_external_reference");
CREATE UNIQUE INDEX "billing_items_source_idempotency_key"
  ON "billing_items"("tenant_id", "source_app_id", "source_idempotency_key");
CREATE INDEX "billing_items_source_app_idx"
  ON "billing_items"("tenant_id", "source_app_id");

CREATE UNIQUE INDEX "billing_invoices_source_external_key"
  ON "billing_invoices"("tenant_id", "source_app_id", "source_external_reference");
CREATE UNIQUE INDEX "billing_invoices_source_idempotency_key"
  ON "billing_invoices"("tenant_id", "source_app_id", "source_idempotency_key");
CREATE INDEX "billing_invoices_source_app_idx"
  ON "billing_invoices"("tenant_id", "source_app_id");

CREATE UNIQUE INDEX "billing_payments_source_external_key"
  ON "billing_payments"("tenant_id", "source_app_id", "source_external_reference");
CREATE UNIQUE INDEX "billing_payments_source_idempotency_key"
  ON "billing_payments"("tenant_id", "source_app_id", "source_idempotency_key");
CREATE INDEX "billing_payments_source_app_idx"
  ON "billing_payments"("tenant_id", "source_app_id");
