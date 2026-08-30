-- Phase 2: 876 Work productivity plane.
-- Additive migration: legacy CRM compatibility columns remain until the cutover
-- has been observed in production and the parity verifier is retired.

ALTER TYPE "WorkTaskStatus" ADD VALUE IF NOT EXISTS 'WAITING';
ALTER TYPE "WorkTaskStatus" ADD VALUE IF NOT EXISTS 'DEFERRED';
ALTER TYPE "WorkTaskStatus" ADD VALUE IF NOT EXISTS 'FAILED';

CREATE TYPE "WorkTaskImportance" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
CREATE TYPE "WorkAssignmentTargetType" AS ENUM ('USER', 'TEAM');
CREATE TYPE "WorkAssignmentRole" AS ENUM ('OWNER', 'COLLABORATOR', 'REVIEWER', 'WATCHER');
CREATE TYPE "WorkAssignmentStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'COMPLETED');
CREATE TYPE "WorkRecurrenceFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY');
CREATE TYPE "WorkAlertTriggerType" AS ENUM ('ABSOLUTE', 'RELATIVE');
CREATE TYPE "WorkAlertAction" AS ENUM ('NOTIFICATION', 'EMAIL');
CREATE TYPE "WorkAlertStatus" AS ENUM ('SCHEDULED', 'SENT', 'DISMISSED', 'CANCELLED');
CREATE TYPE "WorkNotificationSourceType" AS ENUM ('ALERT', 'REMINDER');
CREATE TYPE "WorkNotificationStatus" AS ENUM ('PENDING', 'DISPATCHED', 'FAILED');
CREATE TYPE "WorkCalendarVisibility" AS ENUM ('PRIVATE', 'ORGANIZATION');
CREATE TYPE "WorkCalendarRole" AS ENUM ('OWNER', 'EDITOR', 'VIEWER');
CREATE TYPE "WorkEventStatus" AS ENUM ('CONFIRMED', 'TENTATIVE', 'CANCELLED');
CREATE TYPE "WorkEventBusyStatus" AS ENUM ('BUSY', 'FREE');
CREATE TYPE "WorkParticipantKind" AS ENUM ('USER', 'EMAIL');
CREATE TYPE "WorkParticipantRole" AS ENUM ('CHAIR', 'REQUIRED', 'OPTIONAL');
CREATE TYPE "WorkParticipantStatus" AS ENUM ('NEEDS_ACTION', 'ACCEPTED', 'DECLINED', 'TENTATIVE', 'DELEGATED');
CREATE TYPE "WorkSyncProvider" AS ENUM ('ICALENDAR', 'GOOGLE', 'MICROSOFT', 'CALDAV');
CREATE TYPE "WorkSyncConnectionStatus" AS ENUM ('ACTIVE', 'PAUSED', 'REVOKED', 'ERROR');
CREATE TYPE "WorkSyncResourceType" AS ENUM ('TASK', 'TASK_LIST', 'CALENDAR', 'EVENT');

CREATE TABLE "work_task_lists" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "owner_user_id" TEXT,
  "is_default" BOOLEAN NOT NULL DEFAULT false,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" TIMESTAMP(3),
  "deleted_by" TEXT,
  CONSTRAINT "work_task_lists_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "work_task_lists_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "work_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "work_task_lists_tenant_id_owner_user_id_sort_order_idx" ON "work_task_lists"("tenant_id", "owner_user_id", "sort_order");
CREATE UNIQUE INDEX "work_task_lists_one_default_per_tenant" ON "work_task_lists"("tenant_id") WHERE "is_default" = true AND "deleted_at" IS NULL;

INSERT INTO "work_task_lists" (
  "id", "tenant_id", "name", "description", "owner_user_id", "is_default", "sort_order", "created_by", "created_at", "updated_at"
)
SELECT
  'tasklist_' || substr(md5("id"), 1, 24),
  "id",
  'Inbox',
  'Default organization task list.',
  NULL,
  true,
  0,
  'migration',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "work_tenants";

CREATE TABLE "work_recurrence_rules" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "frequency" "WorkRecurrenceFrequency" NOT NULL,
  "interval" INTEGER NOT NULL DEFAULT 1,
  "by_day" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "by_month_day" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
  "by_month" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
  "count" INTEGER,
  "until_at" TIMESTAMP(3),
  "time_zone" TEXT NOT NULL,
  "week_start" TEXT,
  "rrule" TEXT NOT NULL,
  "created_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "work_recurrence_rules_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "work_recurrence_rules_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "work_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "work_recurrence_rules_interval_check" CHECK ("interval" >= 1),
  CONSTRAINT "work_recurrence_rules_count_check" CHECK ("count" IS NULL OR "count" >= 1),
  CONSTRAINT "work_recurrence_rules_count_until_check" CHECK (NOT ("count" IS NOT NULL AND "until_at" IS NOT NULL))
);
CREATE INDEX "work_recurrence_rules_tenant_id_created_at_idx" ON "work_recurrence_rules"("tenant_id", "created_at");

ALTER TABLE "work_tasks"
  ADD COLUMN "uid" TEXT,
  ADD COLUMN "list_id" TEXT,
  ADD COLUMN "parent_task_id" TEXT,
  ADD COLUMN "start_at" TIMESTAMP(3),
  ADD COLUMN "start_time_zone" TEXT,
  ADD COLUMN "due_time_zone" TEXT,
  ADD COLUMN "importance" "WorkTaskImportance" NOT NULL DEFAULT 'NORMAL',
  ADD COLUMN "estimated_duration" TEXT,
  ADD COLUMN "percent_complete" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "recurrence_rule_id" TEXT;

UPDATE "work_tasks"
SET
  "uid" = "id" || '@work.876',
  "list_id" = 'tasklist_' || substr(md5("tenant_id"), 1, 24),
  "due_time_zone" = CASE WHEN "due_at" IS NULL THEN NULL ELSE 'UTC' END;

ALTER TABLE "work_tasks" ALTER COLUMN "uid" SET NOT NULL;
ALTER TABLE "work_tasks" ALTER COLUMN "list_id" SET NOT NULL;
ALTER TABLE "work_tasks"
  ADD CONSTRAINT "work_tasks_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "work_task_lists"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "work_tasks_parent_task_id_fkey" FOREIGN KEY ("parent_task_id") REFERENCES "work_tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "work_tasks_recurrence_rule_id_fkey" FOREIGN KEY ("recurrence_rule_id") REFERENCES "work_recurrence_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "work_tasks_percent_complete_check" CHECK ("percent_complete" BETWEEN 0 AND 100),
  ADD CONSTRAINT "work_tasks_start_zone_check" CHECK (("start_at" IS NULL AND "start_time_zone" IS NULL) OR ("start_at" IS NOT NULL AND "start_time_zone" IS NOT NULL)),
  ADD CONSTRAINT "work_tasks_due_zone_check" CHECK (("due_at" IS NULL AND "due_time_zone" IS NULL) OR ("due_at" IS NOT NULL AND "due_time_zone" IS NOT NULL));
CREATE UNIQUE INDEX "work_tasks_uid_key" ON "work_tasks"("uid");
CREATE INDEX "work_tasks_tenant_id_list_id_status_sort_order_idx" ON "work_tasks"("tenant_id", "list_id", "status", "sort_order");
CREATE INDEX "work_tasks_tenant_id_parent_task_id_status_sort_order_idx" ON "work_tasks"("tenant_id", "parent_task_id", "status", "sort_order");
CREATE INDEX "work_tasks_tenant_id_start_at_idx" ON "work_tasks"("tenant_id", "start_at");

ALTER TABLE "work_reminders"
  ADD COLUMN "time_zone" TEXT,
  ADD COLUMN "recurrence_rule_id" TEXT;
UPDATE "work_reminders" SET "time_zone" = 'UTC' WHERE "time_zone" IS NULL;
ALTER TABLE "work_reminders"
  ADD CONSTRAINT "work_reminders_recurrence_rule_id_fkey" FOREIGN KEY ("recurrence_rule_id") REFERENCES "work_recurrence_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "work_task_links" (
  "id" TEXT NOT NULL,
  "task_id" TEXT NOT NULL,
  "service" TEXT NOT NULL,
  "resource" TEXT NOT NULL,
  "external_id" TEXT NOT NULL,
  "label" TEXT,
  "url" TEXT,
  "is_primary" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "work_task_links_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "work_task_links_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "work_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "work_task_links_task_id_service_resource_external_id_key" ON "work_task_links"("task_id", "service", "resource", "external_id");
CREATE INDEX "work_task_links_service_resource_external_id_idx" ON "work_task_links"("service", "resource", "external_id");
CREATE UNIQUE INDEX "work_task_links_one_primary_per_task" ON "work_task_links"("task_id") WHERE "is_primary" = true;

INSERT INTO "work_task_links" ("id", "task_id", "service", "resource", "external_id", "is_primary", "created_at")
SELECT
  'tasklink_' || substr(md5("id" || ':' || "context_service" || ':' || "context_resource" || ':' || "context_id"), 1, 24),
  "id", "context_service", "context_resource", "context_id", true, CURRENT_TIMESTAMP
FROM "work_tasks"
WHERE "context_service" IS NOT NULL AND "context_resource" IS NOT NULL AND "context_id" IS NOT NULL;

CREATE TABLE "work_task_assignments" (
  "id" TEXT NOT NULL,
  "task_id" TEXT NOT NULL,
  "target_type" "WorkAssignmentTargetType" NOT NULL,
  "assignee_id" TEXT NOT NULL,
  "role" "WorkAssignmentRole" NOT NULL DEFAULT 'OWNER',
  "status" "WorkAssignmentStatus" NOT NULL DEFAULT 'PENDING',
  "assigned_by" TEXT NOT NULL,
  "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "responded_at" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),
  "delegated_from_assignment_id" TEXT,
  CONSTRAINT "work_task_assignments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "work_task_assignments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "work_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "work_task_assignments_delegated_from_assignment_id_fkey" FOREIGN KEY ("delegated_from_assignment_id") REFERENCES "work_task_assignments"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "work_task_assignments_task_target_assignee_role_key" ON "work_task_assignments"("task_id", "target_type", "assignee_id", "role");
CREATE INDEX "work_task_assignments_assignee_id_status_assigned_at_idx" ON "work_task_assignments"("assignee_id", "status", "assigned_at");

INSERT INTO "work_task_assignments" (
  "id", "task_id", "target_type", "assignee_id", "role", "status", "assigned_by", "assigned_at"
)
SELECT
  'assign_' || substr(md5("id" || ':' || "assignee_id"), 1, 24),
  "id", 'USER', "assignee_id", 'OWNER', 'PENDING', "created_by", "created_at"
FROM "work_tasks"
WHERE "assignee_id" IS NOT NULL;

CREATE TABLE "work_calendars" (
  "id" TEXT NOT NULL,
  "uid" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "owner_user_id" TEXT,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "time_zone" TEXT NOT NULL,
  "visibility" "WorkCalendarVisibility" NOT NULL DEFAULT 'PRIVATE',
  "is_primary" BOOLEAN NOT NULL DEFAULT false,
  "created_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" TIMESTAMP(3),
  "deleted_by" TEXT,
  CONSTRAINT "work_calendars_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "work_calendars_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "work_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "work_calendars_primary_owner_check" CHECK (NOT "is_primary" OR "owner_user_id" IS NOT NULL)
);
CREATE UNIQUE INDEX "work_calendars_uid_key" ON "work_calendars"("uid");
CREATE UNIQUE INDEX "work_calendars_one_primary_per_user" ON "work_calendars"("tenant_id", "owner_user_id") WHERE "is_primary" = true AND "deleted_at" IS NULL;
CREATE INDEX "work_calendars_tenant_id_visibility_name_idx" ON "work_calendars"("tenant_id", "visibility", "name");

CREATE TABLE "work_calendar_subscriptions" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "calendar_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "role" "WorkCalendarRole" NOT NULL DEFAULT 'VIEWER',
  "color" TEXT,
  "is_visible" BOOLEAN NOT NULL DEFAULT true,
  "default_reminder_minutes" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "work_calendar_subscriptions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "work_calendar_subscriptions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "work_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "work_calendar_subscriptions_calendar_id_fkey" FOREIGN KEY ("calendar_id") REFERENCES "work_calendars"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "work_calendar_subscriptions_calendar_id_user_id_key" ON "work_calendar_subscriptions"("calendar_id", "user_id");
CREATE INDEX "work_calendar_subscriptions_tenant_id_user_id_visible_idx" ON "work_calendar_subscriptions"("tenant_id", "user_id", "is_visible");

CREATE TABLE "work_events" (
  "id" TEXT NOT NULL,
  "uid" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "calendar_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "location" TEXT,
  "status" "WorkEventStatus" NOT NULL DEFAULT 'CONFIRMED',
  "busy_status" "WorkEventBusyStatus" NOT NULL DEFAULT 'BUSY',
  "start_at" TIMESTAMP(3),
  "end_at" TIMESTAMP(3),
  "time_zone" TEXT,
  "start_date" DATE,
  "end_date" DATE,
  "recurrence_rule_id" TEXT,
  "recurrence_id" TEXT,
  "created_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" TIMESTAMP(3),
  "deleted_by" TEXT,
  CONSTRAINT "work_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "work_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "work_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "work_events_calendar_id_fkey" FOREIGN KEY ("calendar_id") REFERENCES "work_calendars"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "work_events_recurrence_rule_id_fkey" FOREIGN KEY ("recurrence_rule_id") REFERENCES "work_recurrence_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "work_events_time_shape_check" CHECK ((("start_at" IS NOT NULL AND "end_at" IS NOT NULL AND "time_zone" IS NOT NULL) AND ("start_date" IS NULL AND "end_date" IS NULL)) OR (("start_at" IS NULL AND "end_at" IS NULL AND "time_zone" IS NULL) AND ("start_date" IS NOT NULL AND "end_date" IS NOT NULL))),
  CONSTRAINT "work_events_order_check" CHECK (("start_at" IS NULL OR "end_at" > "start_at") AND ("start_date" IS NULL OR "end_date" > "start_date"))
);
CREATE UNIQUE INDEX "work_events_uid_key" ON "work_events"("uid");
CREATE INDEX "work_events_tenant_id_calendar_id_start_at_idx" ON "work_events"("tenant_id", "calendar_id", "start_at");
CREATE INDEX "work_events_tenant_id_calendar_id_start_date_idx" ON "work_events"("tenant_id", "calendar_id", "start_date");
CREATE INDEX "work_events_recurrence_id_idx" ON "work_events"("recurrence_id");

CREATE TABLE "work_event_participants" (
  "id" TEXT NOT NULL,
  "event_id" TEXT NOT NULL,
  "kind" "WorkParticipantKind" NOT NULL,
  "participant_id" TEXT,
  "email" TEXT,
  "name" TEXT,
  "role" "WorkParticipantRole" NOT NULL DEFAULT 'REQUIRED',
  "status" "WorkParticipantStatus" NOT NULL DEFAULT 'NEEDS_ACTION',
  "delegated_to" TEXT,
  "delegated_from" TEXT,
  "responded_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "work_event_participants_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "work_event_participants_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "work_events"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "work_event_participants_identity_check" CHECK (("kind" = 'USER' AND "participant_id" IS NOT NULL AND "email" IS NULL) OR ("kind" = 'EMAIL' AND "participant_id" IS NULL AND "email" IS NOT NULL))
);
CREATE INDEX "work_event_participants_event_id_status_idx" ON "work_event_participants"("event_id", "status");
CREATE INDEX "work_event_participants_participant_id_idx" ON "work_event_participants"("participant_id");
CREATE INDEX "work_event_participants_email_idx" ON "work_event_participants"("email");

CREATE TABLE "work_alerts" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "task_id" TEXT,
  "event_id" TEXT,
  "user_id" TEXT NOT NULL,
  "trigger_type" "WorkAlertTriggerType" NOT NULL,
  "trigger_at" TIMESTAMP(3),
  "offset_seconds" INTEGER,
  "action" "WorkAlertAction" NOT NULL DEFAULT 'NOTIFICATION',
  "status" "WorkAlertStatus" NOT NULL DEFAULT 'SCHEDULED',
  "sent_at" TIMESTAMP(3),
  "dismissed_at" TIMESTAMP(3),
  "created_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "work_alerts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "work_alerts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "work_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "work_alerts_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "work_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "work_alerts_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "work_events"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "work_alerts_parent_check" CHECK ((("task_id" IS NOT NULL)::int + ("event_id" IS NOT NULL)::int) = 1),
  CONSTRAINT "work_alerts_trigger_check" CHECK (("trigger_type" = 'ABSOLUTE' AND "trigger_at" IS NOT NULL AND "offset_seconds" IS NULL) OR ("trigger_type" = 'RELATIVE' AND "trigger_at" IS NULL AND "offset_seconds" IS NOT NULL))
);
CREATE INDEX "work_alerts_tenant_id_user_id_status_trigger_at_idx" ON "work_alerts"("tenant_id", "user_id", "status", "trigger_at");
CREATE INDEX "work_alerts_task_id_idx" ON "work_alerts"("task_id");
CREATE INDEX "work_alerts_event_id_idx" ON "work_alerts"("event_id");

CREATE TABLE "work_notification_outbox" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "source_type" "WorkNotificationSourceType" NOT NULL,
  "source_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "channel" "WorkAlertAction" NOT NULL,
  "deliver_at" TIMESTAMP(3) NOT NULL,
  "payload" JSONB NOT NULL,
  "status" "WorkNotificationStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "dispatched_at" TIMESTAMP(3),
  "last_error" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "work_notification_outbox_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "work_notification_outbox_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "work_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "work_notification_outbox_source_type_source_id_channel_key" ON "work_notification_outbox"("source_type", "source_id", "channel");
CREATE INDEX "work_notification_outbox_status_deliver_at_idx" ON "work_notification_outbox"("status", "deliver_at");

CREATE TABLE "work_sync_connections" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "provider" "WorkSyncProvider" NOT NULL,
  "status" "WorkSyncConnectionStatus" NOT NULL DEFAULT 'ACTIVE',
  "credential_ref" TEXT,
  "remote_account_id" TEXT,
  "remote_account_label" TEXT,
  "caldav_url" TEXT,
  "sync_cursor" TEXT,
  "last_synced_at" TIMESTAMP(3),
  "last_error_code" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "work_sync_connections_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "work_sync_connections_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "work_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "work_sync_connections_tenant_id_user_id_provider_status_idx" ON "work_sync_connections"("tenant_id", "user_id", "provider", "status");

CREATE TABLE "work_sync_mappings" (
  "id" TEXT NOT NULL,
  "connection_id" TEXT NOT NULL,
  "resource_type" "WorkSyncResourceType" NOT NULL,
  "local_id" TEXT NOT NULL,
  "remote_id" TEXT NOT NULL,
  "remote_etag" TEXT,
  "ical_uid" TEXT,
  "content_hash" TEXT,
  "last_synced_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "work_sync_mappings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "work_sync_mappings_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "work_sync_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "work_sync_mappings_connection_resource_local_key" ON "work_sync_mappings"("connection_id", "resource_type", "local_id");
CREATE UNIQUE INDEX "work_sync_mappings_connection_resource_remote_key" ON "work_sync_mappings"("connection_id", "resource_type", "remote_id");
CREATE INDEX "work_sync_mappings_ical_uid_idx" ON "work_sync_mappings"("ical_uid");
