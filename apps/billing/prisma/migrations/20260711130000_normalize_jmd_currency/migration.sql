-- Normalize the current Billing workspace to Jamaican dollars. Other globally
-- supported currencies remain catalogued but are not enabled for tenants yet.
BEGIN;

INSERT INTO "billing_currencies" (
  "code",
  "name",
  "symbol",
  "decimal_places",
  "is_active",
  "created_at",
  "updated_at"
)
VALUES (
  'JMD',
  'Jamaican Dollar',
  '$',
  2,
  true,
  EXTRACT(EPOCH FROM NOW())::INTEGER,
  EXTRACT(EPOCH FROM NOW())::INTEGER
)
ON CONFLICT ("code") DO UPDATE
SET
  "name" = EXCLUDED."name",
  "decimal_places" = EXCLUDED."decimal_places",
  "is_active" = true,
  "updated_at" = EXCLUDED."updated_at";

UPDATE "billing_tenants"
SET
  "default_currency" = 'JMD',
  "updated_at" = EXTRACT(EPOCH FROM NOW())::INTEGER
WHERE "default_currency" <> 'JMD';

-- Clear any existing non-JMD default before promoting JMD so the partial
-- unique index on one default currency per tenant remains satisfied.
UPDATE "billing_tenant_currencies"
SET
  "is_default" = false,
  "is_enabled" = false,
  "updated_at" = EXTRACT(EPOCH FROM NOW())::INTEGER
WHERE "currency_code" <> 'JMD';

INSERT INTO "billing_tenant_currencies" (
  "tenant_id",
  "currency_code",
  "is_default",
  "is_enabled",
  "created_at",
  "updated_at"
)
SELECT
  "id",
  'JMD',
  true,
  true,
  EXTRACT(EPOCH FROM NOW())::INTEGER,
  EXTRACT(EPOCH FROM NOW())::INTEGER
FROM "billing_tenants"
ON CONFLICT ("tenant_id", "currency_code") DO UPDATE
SET
  "is_default" = true,
  "is_enabled" = true,
  "updated_at" = EXCLUDED."updated_at";

UPDATE "billing_tenant_currencies"
SET
  "is_default" = false,
  "is_enabled" = false,
  "updated_at" = EXTRACT(EPOCH FROM NOW())::INTEGER
WHERE "currency_code" <> 'JMD';

UPDATE "billing_customers"
SET
  "default_currency" = 'JMD',
  "updated_at" = EXTRACT(EPOCH FROM NOW())::INTEGER
WHERE "default_currency" IS DISTINCT FROM 'JMD';

UPDATE "billing_items"
SET
  "default_selling_currency" = 'JMD',
  "updated_at" = EXTRACT(EPOCH FROM NOW())::INTEGER
WHERE
  "default_selling_amount" IS NOT NULL
  OR "default_selling_currency" IS NOT NULL;

UPDATE "billing_items"
SET
  "default_cost_currency" = 'JMD',
  "updated_at" = EXTRACT(EPOCH FROM NOW())::INTEGER
WHERE
  "default_cost_amount" IS NOT NULL
  OR "default_cost_currency" IS NOT NULL;

UPDATE "billing_plans"
SET
  "setup_fee_currency" = 'JMD',
  "updated_at" = EXTRACT(EPOCH FROM NOW())::INTEGER
WHERE
  "setup_fee_amount" IS NOT NULL
  OR "setup_fee_currency" IS NOT NULL;

UPDATE "billing_prices"
SET
  "currency" = 'JMD',
  "updated_at" = EXTRACT(EPOCH FROM NOW())::INTEGER
WHERE "currency" <> 'JMD';

UPDATE "billing_quotes"
SET
  "currency" = 'JMD',
  "updated_at" = EXTRACT(EPOCH FROM NOW())::INTEGER
WHERE "currency" <> 'JMD';

UPDATE "billing_invoices"
SET
  "currency" = 'JMD',
  "updated_at" = EXTRACT(EPOCH FROM NOW())::INTEGER
WHERE "currency" <> 'JMD';

UPDATE "billing_subscription_items"
SET
  "currency" = 'JMD',
  "updated_at" = EXTRACT(EPOCH FROM NOW())::INTEGER
WHERE "currency" IS DISTINCT FROM 'JMD';

COMMIT;
