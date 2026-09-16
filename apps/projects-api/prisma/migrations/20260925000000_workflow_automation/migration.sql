-- Workflow transitions (blueprints), automation rules/events/runs (outbox),
-- and in-app notifications for 876 Projects phase 13.
CREATE TABLE "projects_workflow_transitions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "work_item_type_id" TEXT,
    "from_state_key" TEXT,
    "to_state_key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "required_permission" TEXT,
    "required_field_keys" TEXT[] NOT NULL DEFAULT '{}',
    "requires_comment" BOOLEAN NOT NULL DEFAULT false,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    CONSTRAINT "projects_workflow_transitions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "projects_automation_rules" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "project_id" TEXT,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "trigger" TEXT NOT NULL,
    "conditions" JSONB NOT NULL DEFAULT '[]',
    "actions" JSONB NOT NULL DEFAULT '[]',
    "webhook_secret" JSONB,
    "deleted_at" BIGINT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    CONSTRAINT "projects_automation_rules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "projects_automation_events" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "subject_type" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "causation_depth" INTEGER NOT NULL DEFAULT 0,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "claimed_at" BIGINT,
    "processed_at" BIGINT,
    "next_attempt_at" BIGINT,
    "created_at" BIGINT NOT NULL,
    CONSTRAINT "projects_automation_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "projects_automation_runs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "rule_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "error_code" TEXT,
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "response_code" INTEGER,
    "started_at" BIGINT NOT NULL,
    "finished_at" BIGINT NOT NULL,
    "duration_ms" INTEGER NOT NULL,
    "created_at" BIGINT NOT NULL,
    CONSTRAINT "projects_automation_runs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "projects_notifications" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subject_type" TEXT,
    "subject_id" TEXT,
    "read_at" BIGINT,
    "created_at" BIGINT NOT NULL,
    CONSTRAINT "projects_notifications_pkey" PRIMARY KEY ("id")
);

-- Guards so invalid rows fail at the database.
ALTER TABLE "projects_automation_events" ADD CONSTRAINT "projects_aevents_depth_chk" CHECK ("causation_depth" >= 0);
ALTER TABLE "projects_automation_events" ADD CONSTRAINT "projects_aevents_attempts_chk" CHECK ("attempts" >= 0);
ALTER TABLE "projects_automation_runs" ADD CONSTRAINT "projects_aruns_status_chk" CHECK ("status" IN ('succeeded', 'failed', 'skipped'));
ALTER TABLE "projects_automation_runs" ADD CONSTRAINT "projects_aruns_attempt_chk" CHECK ("attempt" >= 1);

CREATE INDEX "projects_arules_tenant_deleted_idx" ON "projects_automation_rules"("tenant_id") WHERE "deleted_at" IS NULL;

-- CreateIndex
CREATE INDEX "projects_wf_trans_tenant_type_idx" ON "projects_workflow_transitions"("tenant_id", "work_item_type_id");
CREATE INDEX "projects_arules_tenant_trigger_idx" ON "projects_automation_rules"("tenant_id", "trigger");
CREATE INDEX "projects_arules_tenant_project_idx" ON "projects_automation_rules"("tenant_id", "project_id");
CREATE INDEX "projects_aevents_tenant_processed_idx" ON "projects_automation_events"("tenant_id", "processed_at");
CREATE INDEX "projects_aevents_subject_idx" ON "projects_automation_events"("tenant_id", "type", "subject_type", "subject_id");
ALTER TABLE "projects_automation_runs" ADD CONSTRAINT "projects_aruns_rule_event_uidx" UNIQUE ("rule_id", "event_id");
CREATE INDEX "projects_aruns_tenant_event_idx" ON "projects_automation_runs"("tenant_id", "event_id");
CREATE INDEX "projects_aruns_tenant_rule_idx" ON "projects_automation_runs"("tenant_id", "rule_id");
CREATE INDEX "projects_notifications_tenant_user_idx" ON "projects_notifications"("tenant_id", "user_id");

-- AddForeignKey
ALTER TABLE "projects_workflow_transitions" ADD CONSTRAINT "projects_workflow_transitions_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "projects_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_automation_rules" ADD CONSTRAINT "projects_automation_rules_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "projects_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_automation_events" ADD CONSTRAINT "projects_automation_events_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "projects_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_automation_runs" ADD CONSTRAINT "projects_automation_runs_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "projects_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_automation_runs" ADD CONSTRAINT "projects_automation_runs_rule_fkey" FOREIGN KEY ("rule_id") REFERENCES "projects_automation_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_automation_runs" ADD CONSTRAINT "projects_automation_runs_event_fkey" FOREIGN KEY ("event_id") REFERENCES "projects_automation_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_notifications" ADD CONSTRAINT "projects_notifications_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "projects_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
