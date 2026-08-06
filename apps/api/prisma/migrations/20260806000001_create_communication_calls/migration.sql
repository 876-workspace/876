-- Create the `communication_calls` table.
--
-- The SQLAlchemy model and CommunicationCallRepository have always existed, but
-- the table was never created: the FastAPI service builds its schema from
-- ad-hoc `ensure_*` functions replayed at boot, and this table was missed. Every
-- code path touching it raises today. This is the first migration to run after
-- the baseline, so the schema finally matches what the code expects.
--
-- IF NOT EXISTS so the migration is safe to apply to an environment where the
-- table was created by hand.

CREATE TABLE IF NOT EXISTS "communication_calls" (
    "id" VARCHAR NOT NULL,
    "provider" VARCHAR NOT NULL,
    "provider_sid" VARCHAR,
    "direction" VARCHAR NOT NULL DEFAULT 'outbound',
    "status" VARCHAR NOT NULL,
    "to_number" VARCHAR NOT NULL,
    "from_number" VARCHAR,
    "template_key" VARCHAR NOT NULL,
    "user_id" VARCHAR,
    "organization_id" VARCHAR,
    "app_id" VARCHAR,
    "client_reference" VARCHAR,
    "idempotency_scope" VARCHAR NOT NULL,
    "idempotency_key" VARCHAR NOT NULL,
    "duration_seconds" INTEGER,
    "provider_error_code" VARCHAR,
    "started_at" BIGINT,
    "answered_at" BIGINT,
    "completed_at" BIGINT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    CONSTRAINT "communication_calls_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ix_communication_calls_provider_sid"
    ON "communication_calls" ("provider_sid");

CREATE UNIQUE INDEX IF NOT EXISTS "uq_communication_calls_idempotency"
    ON "communication_calls" ("idempotency_scope", "idempotency_key");
