-- Record the application provisioning manifest applied to each Billing tenant.
-- Existing tenants already received version 1 defaults through prior migrations;
-- use their original creation time as the non-destructive audit timestamp.
ALTER TABLE "billing_tenants"
  ADD COLUMN "provisioning_version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "provisioned_at" INTEGER;

UPDATE "billing_tenants"
SET "provisioned_at" = "created_at"
WHERE "provisioned_at" IS NULL;

ALTER TABLE "billing_tenants"
  ALTER COLUMN "provisioned_at" SET NOT NULL;
