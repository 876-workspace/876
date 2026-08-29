-- Backfill the system priority palette without overwriting tenant customizations.
UPDATE "crm_request_priorities"
SET "color" = CASE "provisioning_key"
  WHEN 'low' THEN 'blue'
  WHEN 'normal' THEN 'slate'
  WHEN 'high' THEN 'amber'
  WHEN 'urgent' THEN 'red'
END
WHERE "color" IS NULL
  AND "provisioning_key" IN ('low', 'normal', 'high', 'urgent');
