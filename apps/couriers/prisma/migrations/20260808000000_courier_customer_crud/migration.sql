-- External customers have no Core account. Deletions retain a tombstone so
-- operational history remains scoped while archived profiles stay invisible.
ALTER TABLE "courier_customer_profiles" ALTER COLUMN "user_id" DROP NOT NULL;

ALTER TABLE "courier_customer_profiles"
    ADD COLUMN "deleted_at" INTEGER,
    ADD COLUMN "deleted_by" TEXT,
    ADD COLUMN "deletion_reason" TEXT;

CREATE INDEX "courier_customer_profiles_tenant_deleted_idx"
    ON "courier_customer_profiles"("tenant_id", "deleted_at");
