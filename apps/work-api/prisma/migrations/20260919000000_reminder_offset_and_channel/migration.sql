-- Extend WorkReminder with relative scheduling and delivery channel.
-- Additive plus widening: existing rows keep their absolute remind_at, and the
-- new timing CHECK is satisfied by every existing row because remind_at was
-- previously NOT NULL. New rows default to the in-app channel.

ALTER TABLE "work_reminders" ADD COLUMN "offset_minutes_before_due" INTEGER;
ALTER TABLE "work_reminders" ADD COLUMN "channel" TEXT NOT NULL DEFAULT 'in-app';
ALTER TABLE "work_reminders" ALTER COLUMN "remind_at" DROP NOT NULL;
ALTER TABLE "work_reminders" ADD CONSTRAINT "work_reminders_timing_check" CHECK ("remind_at" IS NOT NULL OR "offset_minutes_before_due" IS NOT NULL);
