-- Move reminders to Work: drop the Projects-local table.
-- Reminders now live in the Work service under context service 'projects'
-- (resource issue/milestone/event). Work runs on a separate database, so no
-- cross-service row backfill is possible in SQL; rows still present here are
-- dropped with the table.

ALTER TABLE "projects_reminders" DROP CONSTRAINT "projects_reminders_tenant_fkey";
ALTER TABLE "projects_reminders" DROP CONSTRAINT "projects_reminders_issue_id_fkey";
ALTER TABLE "projects_reminders" DROP CONSTRAINT "projects_reminders_milestone_fkey";
ALTER TABLE "projects_reminders" DROP CONSTRAINT "projects_reminders_event_id_fkey";
DROP TABLE "projects_reminders";
