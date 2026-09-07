INSERT INTO "billing_invoice_preferences" (
  "tenant_id",
  "created_at",
  "updated_at"
)
SELECT
  tenant."id",
  tenant."created_at",
  tenant."updated_at"
FROM "billing_tenants" tenant
WHERE NOT EXISTS (
  SELECT 1
  FROM "billing_invoice_preferences" preference
  WHERE preference."tenant_id" = tenant."id"
);

ALTER TABLE "billing_tenants"
  ALTER COLUMN "provisioning_version" SET DEFAULT 4;

UPDATE "billing_tenants"
SET "provisioning_version" = GREATEST("provisioning_version", 4),
    "updated_at" = EXTRACT(EPOCH FROM NOW())::INTEGER;
