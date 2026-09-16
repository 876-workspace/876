-- CreateTable projects_events
CREATE TABLE "projects_events" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "milestone_id" TEXT,
    "issue_id" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'event',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "starts_at" BIGINT NOT NULL,
    "ends_at" BIGINT,
    "all_day" BOOLEAN NOT NULL DEFAULT false,
    "location" TEXT,
    "meeting_url" TEXT,
    "created_by" TEXT,
    "recurrence_freq" TEXT,
    "recurrence_interval" INTEGER,
    "recurrence_by_weekday" TEXT,
    "recurrence_until" BIGINT,
    "recurrence_count" INTEGER,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    CONSTRAINT "projects_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable projects_event_attendees
CREATE TABLE "projects_event_attendees" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "response" TEXT NOT NULL DEFAULT 'invited',
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    CONSTRAINT "projects_event_attendees_pkey" PRIMARY KEY ("id")
);

-- CreateTable projects_reminders
CREATE TABLE "projects_reminders" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "issue_id" TEXT,
    "milestone_id" TEXT,
    "event_id" TEXT,
    "remind_at" BIGINT,
    "offset_minutes_before_due" INTEGER,
    "recurrence_freq" TEXT,
    "recurrence_interval" INTEGER,
    "recurrence_by_weekday" TEXT,
    "recurrence_until" BIGINT,
    "recurrence_count" INTEGER,
    "channel" TEXT NOT NULL DEFAULT 'in-app',
    "created_by" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    CONSTRAINT "projects_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "projects_events_tenant_starts_idx" ON "projects_events"("tenant_id", "starts_at");
CREATE INDEX "projects_events_tenant_project_idx" ON "projects_events"("tenant_id", "project_id");
CREATE INDEX "projects_events_tenant_creator_idx" ON "projects_events"("tenant_id", "created_by");
CREATE UNIQUE INDEX "projects_event_attendees_unique" ON "projects_event_attendees"("event_id", "user_id");
CREATE INDEX "projects_event_attendees_tenant_idx" ON "projects_event_attendees"("tenant_id", "event_id");
CREATE INDEX "projects_reminders_tenant_creator_idx" ON "projects_reminders"("tenant_id", "created_by");
CREATE INDEX "projects_reminders_tenant_remind_idx" ON "projects_reminders"("tenant_id", "remind_at");

-- AddForeignKey
ALTER TABLE "projects_events" ADD CONSTRAINT "projects_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "projects_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_events" ADD CONSTRAINT "projects_events_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_events" ADD CONSTRAINT "projects_events_milestone_id_fkey" FOREIGN KEY ("milestone_id") REFERENCES "projects_milestones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "projects_events" ADD CONSTRAINT "projects_events_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "projects_issues"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "projects_event_attendees" ADD CONSTRAINT "projects_event_attendees_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "projects_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_event_attendees" ADD CONSTRAINT "projects_event_attendees_event_fkey" FOREIGN KEY ("event_id") REFERENCES "projects_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_reminders" ADD CONSTRAINT "projects_reminders_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "projects_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_reminders" ADD CONSTRAINT "projects_reminders_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "projects_issues"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "projects_reminders" ADD CONSTRAINT "projects_reminders_milestone_fkey" FOREIGN KEY ("milestone_id") REFERENCES "projects_milestones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "projects_reminders" ADD CONSTRAINT "projects_reminders_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "projects_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
