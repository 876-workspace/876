DROP INDEX IF EXISTS "work_notification_outbox_source_type_source_id_channel_key";
ALTER TABLE "work_notification_outbox" ADD COLUMN "occurrence_key" TEXT;
UPDATE "work_notification_outbox" SET "occurrence_key" = 'single' WHERE "occurrence_key" IS NULL;
ALTER TABLE "work_notification_outbox" ALTER COLUMN "occurrence_key" SET NOT NULL;
CREATE UNIQUE INDEX "work_notification_outbox_source_occurrence_channel_key"
  ON "work_notification_outbox"("source_type", "source_id", "occurrence_key", "channel");
