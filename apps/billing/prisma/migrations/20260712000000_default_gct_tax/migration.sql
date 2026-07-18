-- Every Billing workspace defaults to Jamaica's General Consumption Tax:
-- Tax Administration Jamaica as the default authority and the standard
-- 15% GCT rate as the default tax. Workspaces keep full control to add
-- custom authorities and rates afterwards.
BEGIN;

ALTER TABLE "billing_tax_rates"
  ADD COLUMN "is_default" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX "billing_tax_rates_default_key"
  ON "billing_tax_rates" ("tenant_id") WHERE "is_default";

-- Backfill: workspaces without any tax authority get Tax Administration
-- Jamaica as their default authority.
INSERT INTO "billing_tax_authorities" (
  "id",
  "tenant_id",
  "name",
  "description",
  "country_code",
  "subdivision_code",
  "is_default",
  "is_active",
  "created_at",
  "updated_at"
)
SELECT
  'taxa_' || REPLACE(gen_random_uuid()::text, '-', ''),
  t."id",
  'Tax Administration Jamaica',
  'Jamaica''s national revenue administration.',
  'JM',
  NULL,
  true,
  true,
  EXTRACT(EPOCH FROM NOW())::INTEGER,
  EXTRACT(EPOCH FROM NOW())::INTEGER
FROM "billing_tenants" t
WHERE NOT EXISTS (
  SELECT 1
  FROM "billing_tax_authorities" a
  WHERE a."tenant_id" = t."id"
);

-- Backfill: workspaces without any tax rate get the standard 15% GCT rate
-- under their default authority, marked as the workspace default.
INSERT INTO "billing_tax_rates" (
  "id",
  "tenant_id",
  "tax_authority_id",
  "name",
  "description",
  "tax_type",
  "rate",
  "inclusive",
  "starts_at",
  "is_default",
  "is_active",
  "created_at",
  "updated_at"
)
SELECT
  'taxr_' || REPLACE(gen_random_uuid()::text, '-', ''),
  a."tenant_id",
  a."id",
  'Standard GCT',
  'Jamaica''s General Consumption Tax standard rate.',
  'gct',
  15,
  false,
  NULL,
  true,
  true,
  EXTRACT(EPOCH FROM NOW())::INTEGER,
  EXTRACT(EPOCH FROM NOW())::INTEGER
FROM "billing_tax_authorities" a
WHERE a."is_default"
  AND a."is_active"
  AND NOT EXISTS (
    SELECT 1
    FROM "billing_tax_rates" r
    WHERE r."tenant_id" = a."tenant_id"
  );

COMMIT;
