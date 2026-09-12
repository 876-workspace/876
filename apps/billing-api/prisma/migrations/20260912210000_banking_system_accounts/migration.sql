ALTER TABLE "billing_bank_accounts"
  ADD COLUMN IF NOT EXISTS "is_system" BOOLEAN NOT NULL DEFAULT false;

-- Preserve customer-created holding accounts. The oldest active account of
-- each holding type becomes the canonical account for deposits.
WITH ranked_accounts AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "tenant_id", "account_type"
      ORDER BY "created_at" ASC, "id" ASC
    ) AS position
  FROM "billing_bank_accounts"
  WHERE "is_active" = true
    AND "account_type" IN ('UNDEPOSITED_FUNDS', 'PETTY_CASH')
)
UPDATE "billing_bank_accounts" account
SET "is_system" = true
FROM ranked_accounts ranked
WHERE account."id" = ranked."id"
  AND ranked.position = 1;

-- `generate_series` selects an unused name before the insert. The common
-- collision resolves to "(System)"; numbered variants keep the migration
-- safe for tenants that already used that display name too.
WITH missing_accounts AS (
  SELECT t."id" AS "tenant_id", t."default_currency", definition."account_type", definition."base_name", definition."id_suffix"
  FROM "billing_tenants" t
  CROSS JOIN (
    VALUES
      ('UNDEPOSITED_FUNDS'::"BillingBankAccountType", 'Undeposited Funds', 'undeposited_funds'),
      ('PETTY_CASH'::"BillingBankAccountType", 'Petty Cash', 'petty_cash')
  ) AS definition("account_type", "base_name", "id_suffix")
  WHERE NOT EXISTS (
    SELECT 1
    FROM "billing_bank_accounts" account
    WHERE account."tenant_id" = t."id"
      AND account."account_type" = definition."account_type"
      AND account."is_system" = true
  )
), named_accounts AS (
  SELECT
    missing.*,
    COALESCE(
      (
        SELECT CASE candidate.number
          WHEN 0 THEN missing."base_name"
          WHEN 1 THEN missing."base_name" || ' (System)'
          ELSE missing."base_name" || ' (System ' || candidate.number || ')'
        END
        FROM generate_series(0, 100) AS candidate(number)
        WHERE NOT EXISTS (
          SELECT 1
          FROM "billing_bank_accounts" account
          WHERE account."tenant_id" = missing."tenant_id"
            AND account."name" = CASE candidate.number
              WHEN 0 THEN missing."base_name"
              WHEN 1 THEN missing."base_name" || ' (System)'
              ELSE missing."base_name" || ' (System ' || candidate.number || ')'
            END
        )
        ORDER BY candidate.number
        LIMIT 1
      ),
      missing."base_name" || ' (System ' || missing."tenant_id" || ')'
    ) AS "name"
  FROM missing_accounts missing
)
INSERT INTO "billing_bank_accounts" (
  "id", "tenant_id", "name", "account_type", "currency", "opening_balance",
  "is_active", "is_system", "created_at", "updated_at"
)
SELECT
  'system_' || "tenant_id" || '_' || "id_suffix", "tenant_id", "name", "account_type",
  "default_currency", 0, true, true,
  EXTRACT(EPOCH FROM NOW())::integer, EXTRACT(EPOCH FROM NOW())::integer
FROM named_accounts
ON CONFLICT ("tenant_id", "name") DO NOTHING;

CREATE UNIQUE INDEX IF NOT EXISTS "billing_bank_accounts_system_type_key"
  ON "billing_bank_accounts" ("tenant_id", "account_type")
  WHERE "is_system" = true;
