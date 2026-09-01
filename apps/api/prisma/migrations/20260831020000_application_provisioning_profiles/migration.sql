-- Application provisioning profiles are a first-class routing layer beneath an
-- organization's persisted provisioning setup. Existing application manifests
-- keep their app-ID target keys; the migrated default profile points at that
-- existing manifest identity, while future variant profiles use their own ID as
-- the manifest target key.

CREATE TABLE "application_provisioning_profiles" (
    "id" VARCHAR NOT NULL,
    "app_id" VARCHAR NOT NULL,
    "key" VARCHAR NOT NULL,
    "name" VARCHAR NOT NULL,
    "description" TEXT,
    "status" VARCHAR NOT NULL DEFAULT 'draft',
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "manifest_target_key" VARCHAR NOT NULL,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    CONSTRAINT "application_provisioning_profiles_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ck_application_provisioning_profiles_key_nonblank"
      CHECK (btrim("key") <> ''),
    CONSTRAINT "ck_application_provisioning_profiles_manifest_target_nonblank"
      CHECK (btrim("manifest_target_key") <> ''),
    CONSTRAINT "ck_application_provisioning_profiles_status"
      CHECK ("status" IN ('draft', 'active', 'archived'))
);

CREATE UNIQUE INDEX "application_provisioning_profiles_manifest_target_key_key"
  ON "application_provisioning_profiles"("manifest_target_key");
CREATE UNIQUE INDEX "uq_application_provisioning_profiles_app_key"
  ON "application_provisioning_profiles"("app_id", "key");
CREATE UNIQUE INDEX "uq_application_provisioning_profiles_default"
  ON "application_provisioning_profiles"("app_id")
  WHERE "is_default" = true;
CREATE INDEX "ix_application_provisioning_profiles_app_status"
  ON "application_provisioning_profiles"("app_id", "status");

ALTER TABLE "application_provisioning_profiles"
  ADD CONSTRAINT "application_provisioning_profiles_app_id_fkey"
  FOREIGN KEY ("app_id") REFERENCES "apps"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

CREATE TABLE "application_provisioning_profile_conditions" (
    "id" VARCHAR NOT NULL,
    "profile_id" VARCHAR NOT NULL,
    "group_key" VARCHAR NOT NULL,
    "field" VARCHAR NOT NULL,
    "operator" VARCHAR NOT NULL DEFAULT 'equals',
    "value" VARCHAR NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    CONSTRAINT "application_provisioning_profile_conditions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ck_application_provisioning_profile_conditions_group_nonblank"
      CHECK (btrim("group_key") <> ''),
    CONSTRAINT "ck_application_provisioning_profile_conditions_value_nonblank"
      CHECK (btrim("value") <> ''),
    CONSTRAINT "ck_application_provisioning_profile_conditions_field"
      CHECK ("field" IN ('setup', 'country', 'subdivision', 'jurisdiction', 'plan')),
    CONSTRAINT "ck_application_provisioning_profile_conditions_operator"
      CHECK ("operator" = 'equals')
);

CREATE UNIQUE INDEX "uq_application_provisioning_profile_conditions"
  ON "application_provisioning_profile_conditions"(
    "profile_id", "group_key", "field", "operator", "value"
  );
CREATE INDEX "ix_application_provisioning_profile_conditions_group"
  ON "application_provisioning_profile_conditions"("profile_id", "group_key");
CREATE INDEX "ix_application_provisioning_profile_conditions_match"
  ON "application_provisioning_profile_conditions"("field", "value", "priority");

ALTER TABLE "application_provisioning_profile_conditions"
  ADD CONSTRAINT "application_provisioning_profile_conditions_profile_id_fkey"
  FOREIGN KEY ("profile_id") REFERENCES "application_provisioning_profiles"("id")
  ON DELETE CASCADE ON UPDATE NO ACTION;

CREATE TABLE "organization_application_provisioning" (
    "id" VARCHAR NOT NULL,
    "organization_id" VARCHAR NOT NULL,
    "app_id" VARCHAR NOT NULL,
    "profile_id" VARCHAR NOT NULL,
    "selection_type" VARCHAR NOT NULL,
    "match_group_key" VARCHAR,
    "match_priority" INTEGER,
    "matched_fields" VARCHAR[] NOT NULL DEFAULT ARRAY[]::VARCHAR[],
    "selected_at" BIGINT NOT NULL,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    CONSTRAINT "organization_application_provisioning_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ck_organization_application_provisioning_selection_type"
      CHECK ("selection_type" IN ('policy', 'default', 'backfill'))
);

CREATE UNIQUE INDEX "uq_organization_application_provisioning_org_app"
  ON "organization_application_provisioning"("organization_id", "app_id");
CREATE INDEX "ix_organization_application_provisioning_app_profile"
  ON "organization_application_provisioning"("app_id", "profile_id");
CREATE INDEX "ix_organization_application_provisioning_profile"
  ON "organization_application_provisioning"("profile_id");

ALTER TABLE "organization_application_provisioning"
  ADD CONSTRAINT "organization_application_provisioning_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
  ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "organization_application_provisioning"
  ADD CONSTRAINT "organization_application_provisioning_app_id_fkey"
  FOREIGN KEY ("app_id") REFERENCES "apps"("id")
  ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "organization_application_provisioning"
  ADD CONSTRAINT "organization_application_provisioning_profile_id_fkey"
  FOREIGN KEY ("profile_id") REFERENCES "application_provisioning_profiles"("id")
  ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE "provisioning_runs"
  ADD COLUMN "application_provisioning_profile_id" VARCHAR,
  ADD COLUMN "application_provisioning_profile_key" VARCHAR,
  ADD COLUMN "application_provisioning_selection_type" VARCHAR,
  ADD COLUMN "application_provisioning_match_group_key" VARCHAR,
  ADD COLUMN "application_provisioning_match_priority" INTEGER,
  ADD COLUMN "application_provisioning_matched_fields" VARCHAR[] NOT NULL DEFAULT ARRAY[]::VARCHAR[];

CREATE INDEX "ix_provisioning_runs_app_profile_id"
  ON "provisioning_runs"("application_provisioning_profile_id");

-- Create the initial default profile for every registered app. The identifier is
-- deterministic so the migration remains stable across environments. The
-- default profile deliberately points at the existing app-ID manifest target so
-- current application manifest APIs remain compatible.
INSERT INTO "application_provisioning_profiles" (
  "id", "app_id", "key", "name", "description", "status", "is_default",
  "manifest_target_key", "created_at", "updated_at"
)
SELECT
  'apppr_' || md5(a."id" || ':default'),
  a."id",
  'default',
  'Default',
  'Default provisioning profile.',
  'active',
  true,
  a."id",
  EXTRACT(EPOCH FROM NOW())::BIGINT,
  EXTRACT(EPOCH FROM NOW())::BIGINT
FROM "apps" a
ON CONFLICT ("app_id", "key") DO NOTHING;

-- Existing active app subscriptions predate profile routing. Because this
-- migration introduces exactly one default profile per app, their historical
-- selection is unambiguous and can be persisted as an explicit backfill now.
INSERT INTO "organization_application_provisioning" (
  "id", "organization_id", "app_id", "profile_id", "selection_type",
  "match_group_key", "match_priority", "matched_fields", "selected_at",
  "created_at", "updated_at"
)
SELECT
  'oap_' || md5(s."organization_id" || ':' || s."app_id"),
  s."organization_id",
  s."app_id",
  profile."id",
  'backfill',
  NULL,
  NULL,
  ARRAY[]::VARCHAR[],
  EXTRACT(EPOCH FROM NOW())::BIGINT,
  EXTRACT(EPOCH FROM NOW())::BIGINT,
  EXTRACT(EPOCH FROM NOW())::BIGINT
FROM "subscriptions" s
JOIN "application_provisioning_profiles" profile
  ON profile."app_id" = s."app_id"
 AND profile."is_default" = true
WHERE s."status" = 'active'
ON CONFLICT ("organization_id", "app_id") DO NOTHING;
