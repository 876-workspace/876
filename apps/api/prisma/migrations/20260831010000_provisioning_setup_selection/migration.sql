-- Provisioning Phase 2 — durable setup selection and run audit.
--
-- Selection is resolved once from database-owned setup policy, persisted on the
-- organization, and reused on retries. Provisioning runs copy the durable
-- explanation so operational history states which setup/revision was applied
-- and why. Manifest protocol remains version 1.

ALTER TABLE "organizations"
  ADD COLUMN "provisioning_selection_type" VARCHAR,
  ADD COLUMN "provisioning_match_group_key" VARCHAR,
  ADD COLUMN "provisioning_match_priority" INTEGER,
  ADD COLUMN "provisioning_matched_fields" VARCHAR[] NOT NULL DEFAULT ARRAY[]::VARCHAR[],
  ADD COLUMN "provisioning_setup_selected_at" BIGINT;

ALTER TABLE "organizations"
  ADD CONSTRAINT "ck_organizations_provisioning_selection_type"
  CHECK (
    "provisioning_selection_type" IS NULL OR
    "provisioning_selection_type" IN ('policy', 'fallback', 'backfill')
  );

CREATE INDEX "ix_organizations_provisioning_setup_key"
  ON "organizations"("provisioning_setup_key");

ALTER TABLE "provisioning_runs"
  ADD COLUMN "provisioning_setup_key" VARCHAR,
  ADD COLUMN "provisioning_selection_type" VARCHAR,
  ADD COLUMN "provisioning_match_group_key" VARCHAR,
  ADD COLUMN "provisioning_match_priority" INTEGER,
  ADD COLUMN "provisioning_matched_fields" VARCHAR[] NOT NULL DEFAULT ARRAY[]::VARCHAR[];

ALTER TABLE "provisioning_runs"
  ADD CONSTRAINT "ck_provisioning_runs_selection_type"
  CHECK (
    "provisioning_selection_type" IS NULL OR
    "provisioning_selection_type" IN ('policy', 'fallback', 'backfill')
  );

CREATE INDEX "ix_provisioning_runs_setup_key"
  ON "provisioning_runs"("provisioning_setup_key");
