-- CreateTable projects_timesheets
CREATE TABLE "projects_timesheets" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "period_start" BIGINT NOT NULL,
    "period_end" BIGINT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "submitted_at" BIGINT,
    "decided_at" BIGINT,
    "decided_by" TEXT,
    "note" TEXT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    CONSTRAINT "projects_timesheets_pkey" PRIMARY KEY ("id")
);

-- CreateTable projects_time_entries
CREATE TABLE "projects_time_entries" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "issue_id" TEXT,
    "milestone_id" TEXT,
    "task_list_id" TEXT,
    "user_id" TEXT NOT NULL,
    "started_at" BIGINT NOT NULL,
    "ended_at" BIGINT,
    "duration_minutes" INTEGER,
    "billable" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "approval_status" TEXT NOT NULL DEFAULT 'draft',
    "timesheet_id" TEXT,
    "created_by" TEXT,
    "deleted_at" BIGINT,
    "deleted_by" TEXT,
    "deletion_reason" TEXT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    CONSTRAINT "projects_time_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable projects_timesheet_events
CREATE TABLE "projects_timesheet_events" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "timesheet_id" TEXT NOT NULL,
    "actor_user_id" TEXT NOT NULL,
    "from_status" TEXT NOT NULL,
    "to_status" TEXT NOT NULL,
    "note" TEXT,
    "created_at" BIGINT NOT NULL,
    CONSTRAINT "projects_timesheet_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "projects_timesheets_tenant_user_idx" ON "projects_timesheets"("tenant_id", "user_id");
CREATE INDEX "projects_time_entries_tenant_user_start_idx" ON "projects_time_entries"("tenant_id", "user_id", "started_at");
CREATE INDEX "projects_time_entries_tenant_project_idx" ON "projects_time_entries"("tenant_id", "project_id");
CREATE INDEX "projects_time_entries_tenant_issue_idx" ON "projects_time_entries"("tenant_id", "issue_id");
CREATE INDEX "projects_time_entries_tenant_sheet_idx" ON "projects_time_entries"("tenant_id", "timesheet_id");
CREATE INDEX "projects_timesheet_events_tenant_sheet_idx" ON "projects_timesheet_events"("tenant_id", "timesheet_id");
-- A user may have at most one running entry at a time: a running entry is a
-- row with ended_at IS NULL that has not been soft-deleted.
CREATE UNIQUE INDEX "projects_time_entries_one_running_idx" ON "projects_time_entries"("tenant_id", "user_id") WHERE "ended_at" IS NULL AND "deleted_at" IS NULL;

-- AddForeignKey
ALTER TABLE "projects_timesheets" ADD CONSTRAINT "projects_timesheets_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "projects_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_time_entries" ADD CONSTRAINT "projects_time_entries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "projects_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_time_entries" ADD CONSTRAINT "projects_time_entries_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_time_entries" ADD CONSTRAINT "projects_time_entries_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "projects_issues"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "projects_time_entries" ADD CONSTRAINT "projects_time_entries_milestone_fkey" FOREIGN KEY ("milestone_id") REFERENCES "projects_milestones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "projects_time_entries" ADD CONSTRAINT "projects_time_entries_task_list_fkey" FOREIGN KEY ("task_list_id") REFERENCES "projects_task_lists"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "projects_time_entries" ADD CONSTRAINT "projects_time_entries_timesheet_fkey" FOREIGN KEY ("timesheet_id") REFERENCES "projects_timesheets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "projects_timesheet_events" ADD CONSTRAINT "projects_timesheet_events_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "projects_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_timesheet_events" ADD CONSTRAINT "projects_timesheet_events_timesheet_fkey" FOREIGN KEY ("timesheet_id") REFERENCES "projects_timesheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
