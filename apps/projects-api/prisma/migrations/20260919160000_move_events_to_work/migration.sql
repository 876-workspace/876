-- Move events to Work: retain only Projects-local links to Work event ids.
-- Work runs on a separate database, so existing Projects event and attendee
-- rows cannot be backfilled in SQL; rows still present here are dropped with
-- their former tables.

CREATE TABLE "projects_event_links" (
    "tenant_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "milestone_id" TEXT,
    "issue_id" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'event',
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    CONSTRAINT "projects_event_links_pkey" PRIMARY KEY ("event_id")
);

CREATE INDEX "projects_event_links_tenant_id_project_id_idx"
ON "projects_event_links"("tenant_id", "project_id");

ALTER TABLE "projects_event_links"
ADD CONSTRAINT "projects_event_links_tenant_id_fkey"
FOREIGN KEY ("tenant_id") REFERENCES "projects_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "projects_event_links"
ADD CONSTRAINT "projects_event_links_project_id_fkey"
FOREIGN KEY ("project_id") REFERENCES "projects_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "projects_event_links"
ADD CONSTRAINT "projects_event_links_milestone_id_fkey"
FOREIGN KEY ("milestone_id") REFERENCES "projects_milestones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "projects_event_links"
ADD CONSTRAINT "projects_event_links_issue_id_fkey"
FOREIGN KEY ("issue_id") REFERENCES "projects_issues"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "projects_event_attendees" DROP CONSTRAINT "projects_event_attendees_tenant_fkey";
ALTER TABLE "projects_event_attendees" DROP CONSTRAINT "projects_event_attendees_event_fkey";
ALTER TABLE "projects_events" DROP CONSTRAINT "projects_events_tenant_id_fkey";
ALTER TABLE "projects_events" DROP CONSTRAINT "projects_events_project_id_fkey";
ALTER TABLE "projects_events" DROP CONSTRAINT "projects_events_milestone_id_fkey";
ALTER TABLE "projects_events" DROP CONSTRAINT "projects_events_issue_id_fkey";
DROP TABLE "projects_event_attendees";
DROP TABLE "projects_events";
