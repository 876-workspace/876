-- Replace the old overlapping RequestSource axis with the canonical request
-- intake channel vocabulary. Existing rows are mapped without losing origin.
CREATE TYPE "RequestChannel" AS ENUM (
  'FORM',
  'WIDGET',
  'CHAT',
  'EMAIL',
  'API',
  'AGENT'
);

ALTER TABLE "crm_requests"
  ADD COLUMN "channel" "RequestChannel";

UPDATE "crm_requests"
SET "channel" = CASE "source"::text
  WHEN 'EMAIL' THEN 'EMAIL'::"RequestChannel"
  WHEN 'CHAT' THEN 'CHAT'::"RequestChannel"
  WHEN 'WEB' THEN 'FORM'::"RequestChannel"
  WHEN 'API' THEN 'API'::"RequestChannel"
  WHEN 'CRM' THEN 'AGENT'::"RequestChannel"
  WHEN 'PHONE' THEN 'AGENT'::"RequestChannel"
  WHEN 'OTHER' THEN 'AGENT'::"RequestChannel"
  ELSE 'AGENT'::"RequestChannel"
END;

ALTER TABLE "crm_requests"
  ALTER COLUMN "channel" SET DEFAULT 'AGENT',
  ALTER COLUMN "channel" SET NOT NULL,
  DROP COLUMN "source";

DROP TYPE "RequestSource";

CREATE INDEX "crm_requests_tenant_id_channel_created_at_idx"
  ON "crm_requests"("tenant_id", "channel", "created_at");

-- Provisioned/system request forms need a stable tenant-local key so the
-- platform support intake can be repaired idempotently without relying on a
-- mutable name or slug.
ALTER TABLE "crm_request_forms"
  ADD COLUMN "provisioning_key" TEXT;

CREATE UNIQUE INDEX "crm_request_forms_tenant_id_provisioning_key_key"
  ON "crm_request_forms"("tenant_id", "provisioning_key");
