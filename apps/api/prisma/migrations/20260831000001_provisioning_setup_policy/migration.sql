-- Provisioning setup matching and entitlement policy.
--
-- This migration is intentionally additive. Existing ProvisioningSetup rows,
-- finance manifests, revisions, and organization assignments are left intact.
-- The one-time Phase 1 provisioning importer backfills country-match conditions
-- and application/service/service-capability policy rows after this migration
-- is applied.
--
-- Manifest protocol remains version 1.

CREATE TABLE "provisioning_setup_conditions" (
    "id" VARCHAR NOT NULL,
    "setup_id" VARCHAR NOT NULL,
    "group_key" VARCHAR NOT NULL,
    "field" VARCHAR NOT NULL,
    "operator" VARCHAR NOT NULL DEFAULT 'equals',
    "value" VARCHAR NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,

    CONSTRAINT "provisioning_setup_conditions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ck_provisioning_setup_conditions_group_key"
      CHECK (length(btrim("group_key")) > 0),
    CONSTRAINT "ck_provisioning_setup_conditions_field"
      CHECK ("field" IN ('country', 'subdivision', 'jurisdiction')),
    CONSTRAINT "ck_provisioning_setup_conditions_operator"
      CHECK ("operator" = 'equals'),
    CONSTRAINT "ck_provisioning_setup_conditions_value"
      CHECK (length(btrim("value")) > 0)
);

CREATE TABLE "provisioning_setup_entitlements" (
    "id" VARCHAR NOT NULL,
    "setup_id" VARCHAR NOT NULL,
    "target_type" VARCHAR NOT NULL,
    "target_key" VARCHAR NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,

    CONSTRAINT "provisioning_setup_entitlements_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ck_provisioning_setup_entitlements_target_type"
      CHECK ("target_type" IN ('application', 'service', 'service_capability')),
    CONSTRAINT "ck_provisioning_setup_entitlements_target_key"
      CHECK (length(btrim("target_key")) > 0)
);

CREATE UNIQUE INDEX "uq_provisioning_setup_conditions"
ON "provisioning_setup_conditions"(
    "setup_id", "group_key", "field", "operator", "value"
);

CREATE INDEX "ix_provisioning_setup_conditions_group"
ON "provisioning_setup_conditions"("setup_id", "group_key");

CREATE INDEX "ix_provisioning_setup_conditions_match"
ON "provisioning_setup_conditions"("field", "value", "priority");

CREATE UNIQUE INDEX "uq_provisioning_setup_entitlements"
ON "provisioning_setup_entitlements"("setup_id", "target_type", "target_key");

CREATE INDEX "ix_provisioning_setup_entitlements_target"
ON "provisioning_setup_entitlements"("target_type", "target_key", "enabled");

ALTER TABLE "provisioning_setup_conditions"
ADD CONSTRAINT "provisioning_setup_conditions_setup_id_fkey"
FOREIGN KEY ("setup_id") REFERENCES "provisioning_setups"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "provisioning_setup_entitlements"
ADD CONSTRAINT "provisioning_setup_entitlements_setup_id_fkey"
FOREIGN KEY ("setup_id") REFERENCES "provisioning_setups"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
