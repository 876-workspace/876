-- Enrich the shared Billing customer plane and add completed-result receipts
-- for idempotent product-app imports. Customer columns are nullable and the
-- receipt table is additive, so deployed readers remain compatible.
BEGIN;

ALTER TABLE "billing_customers"
  ADD COLUMN "customer_number" TEXT,
  ADD COLUMN "website" TEXT,
  ADD COLUMN "notes" TEXT,
  ADD COLUMN "tax_registration_number" TEXT;

CREATE UNIQUE INDEX "billing_customers_tenant_id_customer_number_key"
  ON "billing_customers"("tenant_id", "customer_number");

CREATE TABLE "billing_customer_import_receipts" (
  "tenant_id" TEXT NOT NULL,
  "source_app_id" TEXT NOT NULL,
  "idempotency_key" TEXT NOT NULL,
  "payload_hash" TEXT NOT NULL,
  "result" JSONB NOT NULL,
  "created_at" INTEGER NOT NULL,
  CONSTRAINT "billing_customer_import_receipts_pkey"
    PRIMARY KEY ("tenant_id", "source_app_id", "idempotency_key")
);

COMMIT;
