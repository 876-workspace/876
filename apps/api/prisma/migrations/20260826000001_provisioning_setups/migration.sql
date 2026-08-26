-- Provisioning setups — named day-zero configurations.
--
-- Until now the platform had exactly one finance manifest, `finance/shared`,
-- carrying Jamaica's currency, tax authority, and GCT rate. This migration
-- names that configuration "Jamaica", re-keys its manifest to `finance/jamaica`,
-- and makes room for further setups (United States, other Caribbean markets)
-- that Console can create and switch between.
--
-- Every manifest revision is also reset to revision 1: the apps are still in
-- development, no manifest content has shipped to a customer, and carrying
-- inherited revision numbers forward makes the history read as though it had.

CREATE TABLE "provisioning_setups" (
    "id" VARCHAR NOT NULL,
    "key" VARCHAR NOT NULL,
    "name" VARCHAR NOT NULL,
    "description" TEXT,
    "country_code" VARCHAR(2),
    "currency_code" VARCHAR(3),
    "status" VARCHAR NOT NULL DEFAULT 'active',
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,

    CONSTRAINT "provisioning_setups_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "uq_provisioning_setups_key" ON "provisioning_setups"("key");
CREATE INDEX "ix_provisioning_setups_status" ON "provisioning_setups"("status");

-- Exactly one setup may be the platform default.
CREATE UNIQUE INDEX "uq_provisioning_setups_default"
ON "provisioning_setups"("is_default")
WHERE ("is_default" = true);

-- The existing shared finance defaults become the Jamaica setup.
INSERT INTO "provisioning_setups" (
    "id", "key", "name", "description",
    "country_code", "currency_code", "status", "is_default",
    "created_at", "updated_at"
)
VALUES (
    'psu_' || replace(gen_random_uuid()::text, '-', ''),
    'jamaica',
    'Jamaica',
    'Jamaican dollar, Tax Administration Jamaica, and the standard GCT rate.',
    'JM',
    'JMD',
    'active',
    true,
    EXTRACT(EPOCH FROM NOW())::bigint,
    EXTRACT(EPOCH FROM NOW())::bigint
);

UPDATE "provisioning_manifests"
SET "target_key" = 'jamaica', "updated_at" = EXTRACT(EPOCH FROM NOW())::bigint
WHERE "target_type" = 'finance' AND "target_key" = 'shared';

-- Reset every manifest to revision 1: drop superseded revisions, then renumber
-- the surviving published (or, where nothing was published, draft) revision.
DELETE FROM "provisioning_manifest_revisions" WHERE "status" = 'archived';

DELETE FROM "provisioning_manifest_revisions" r
WHERE r."status" = 'draft'
  AND EXISTS (
    SELECT 1 FROM "provisioning_manifest_revisions" p
    WHERE p."manifest_id" = r."manifest_id" AND p."status" = 'published'
  );

UPDATE "provisioning_manifest_revisions" SET "revision" = 1 WHERE "revision" <> 1;

-- Organizations remember the setup they were provisioned with, so changing the
-- platform default never silently re-points an existing organization.
ALTER TABLE "organizations" ADD COLUMN "provisioning_setup_key" VARCHAR;

UPDATE "organizations" SET "provisioning_setup_key" = 'jamaica'
WHERE "provisioning_setup_key" IS NULL;
