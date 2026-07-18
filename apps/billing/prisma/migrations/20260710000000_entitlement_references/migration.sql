BEGIN;

-- Opaque links from Billing catalogue/agreement rows to core entitlement
-- records. These are plain columns, never cross-database foreign keys, and
-- their unique indexes are the idempotency keys for the Console -> Billing
-- one-way mirror.

ALTER TABLE "billing_plans" ADD COLUMN "entitlement_reference_id" TEXT;
CREATE UNIQUE INDEX "billing_plans_tenant_entitlement_cadence_key"
  ON "billing_plans" ("tenant_id", "entitlement_reference_id", "interval_unit", "interval_count");
CREATE INDEX "billing_plans_entitlement_reference_id_idx"
  ON "billing_plans" ("entitlement_reference_id");

ALTER TABLE "billing_prices" ADD COLUMN "entitlement_reference_id" TEXT;
CREATE UNIQUE INDEX "billing_prices_tenant_entitlement_reference_key"
  ON "billing_prices" ("tenant_id", "entitlement_reference_id");

CREATE UNIQUE INDEX "billing_subscriptions_tenant_external_reference_key"
  ON "billing_subscriptions" ("tenant_id", "external_reference");

COMMIT;
