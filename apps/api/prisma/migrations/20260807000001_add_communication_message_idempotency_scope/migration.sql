-- Add `idempotency_scope` to `communication_messages`.
--
-- The SQLAlchemy model has declared this column, and a
-- `(idempotency_scope, idempotency_key)` unique constraint, since the table was
-- written; the live database has neither. The FastAPI service builds its schema
-- from ad-hoc `ensure_*` functions replayed at boot, and those only create a
-- table that is absent — an existing table is never altered — so the column was
-- never added and every send path raises today. This is the same defect the
-- preceding migration fixed for `communication_calls`, which was missing
-- entirely.
--
-- Why the scope column is needed rather than reusing the existing
-- `(app_id, idempotency_key)` index: `app_id` is nullable, and Postgres treats
-- each NULL as distinct in a unique index, so a platform-scoped send (no app,
-- no organization, no user) has no idempotency at all. A retry after an
-- uncertain timeout would reach Twilio a second time and bill a second message.
-- The scope column collapses to a literal 'platform' in that case, which does
-- constrain.
--
-- The existing `uq_communication_messages_app_idempotency` index is deliberately
-- left in place. It is redundant with the new one whenever `app_id` is set, and
-- dropping an index the running FastAPI service may still rely on is not worth
-- the risk of an additive migration.
--
-- Backfill: existing rows take `app_id`, then `organization_id`, then `user_id`,
-- then the literal 'platform' — the same precedence the service computes at
-- write time. The column is added nullable, backfilled, and only then made NOT
-- NULL, so the migration does not fail on a non-empty table.

ALTER TABLE "communication_messages"
    ADD COLUMN IF NOT EXISTS "idempotency_scope" VARCHAR;

UPDATE "communication_messages"
   SET "idempotency_scope" = COALESCE("app_id", "organization_id", "user_id", 'platform')
 WHERE "idempotency_scope" IS NULL;

ALTER TABLE "communication_messages"
    ALTER COLUMN "idempotency_scope" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "uq_communication_messages_idempotency"
    ON "communication_messages" ("idempotency_scope", "idempotency_key");
