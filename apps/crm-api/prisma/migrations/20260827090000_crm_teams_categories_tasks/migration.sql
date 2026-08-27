CREATE TYPE "TeamStatus" AS ENUM ('ACTIVE', 'ARCHIVED');
CREATE TYPE "TeamAutoAssign" AS ENUM ('NONE', 'ROUND_ROBIN', 'LEAST_BUSY');
CREATE TYPE "TeamMemberRole" AS ENUM ('LEAD', 'MEMBER');
CREATE TYPE "TaskStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'DONE', 'CANCELLED');
CREATE TYPE "ReminderStatus" AS ENUM ('SCHEDULED', 'SENT', 'DISMISSED', 'CANCELLED');
CREATE TYPE "EmailDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- This must be committed before any statement uses EMAIL; PostgreSQL cannot use
-- a newly-added enum value in the same transaction that added it.
ALTER TYPE "RequestNoteKind" ADD VALUE 'EMAIL';

CREATE TABLE "crm_teams" (
  "id" TEXT NOT NULL, "tenant_id" TEXT NOT NULL, "name" TEXT NOT NULL, "slug" TEXT NOT NULL,
  "description" TEXT, "color" TEXT, "is_default" BOOLEAN NOT NULL DEFAULT false,
  "auto_assign" "TeamAutoAssign" NOT NULL DEFAULT 'NONE', "status" "TeamStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_by" TEXT NOT NULL, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL, "deleted_at" TIMESTAMP(3), "deleted_by" TEXT,
  CONSTRAINT "crm_teams_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "crm_teams_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "crm_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "crm_teams_tenant_id_slug_key" ON "crm_teams"("tenant_id", "slug");
CREATE UNIQUE INDEX "crm_teams_tenant_id_id_key" ON "crm_teams"("tenant_id", "id");
CREATE INDEX "crm_teams_tenant_id_status_name_idx" ON "crm_teams"("tenant_id", "status", "name");

CREATE TABLE "crm_team_members" (
  "id" TEXT NOT NULL, "tenant_id" TEXT NOT NULL, "team_id" TEXT NOT NULL, "user_id" TEXT NOT NULL,
  "role" "TeamMemberRole" NOT NULL DEFAULT 'MEMBER', "added_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "crm_team_members_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "crm_team_members_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "crm_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "crm_team_members_tenant_id_team_id_fkey" FOREIGN KEY ("tenant_id", "team_id") REFERENCES "crm_teams"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "crm_team_members_tenant_id_team_id_user_id_key" ON "crm_team_members"("tenant_id", "team_id", "user_id");
CREATE INDEX "crm_team_members_tenant_id_user_id_idx" ON "crm_team_members"("tenant_id", "user_id");

CREATE TABLE "crm_request_categories" (
  "id" TEXT NOT NULL, "tenant_id" TEXT NOT NULL, "name" TEXT NOT NULL, "slug" TEXT NOT NULL,
  "description" TEXT, "color" TEXT, "icon" TEXT, "sort_order" INTEGER NOT NULL DEFAULT 0, "is_active" BOOLEAN NOT NULL DEFAULT true,
  "default_team_id" TEXT, "default_priority" "RequestPriority", "created_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3), "deleted_by" TEXT, CONSTRAINT "crm_request_categories_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "crm_request_categories_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "crm_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "crm_request_categories_tenant_id_default_team_id_fkey" FOREIGN KEY ("tenant_id", "default_team_id") REFERENCES "crm_teams"("tenant_id", "id") ON DELETE NO ACTION ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "crm_request_categories_tenant_id_slug_key" ON "crm_request_categories"("tenant_id", "slug");
CREATE UNIQUE INDEX "crm_request_categories_tenant_id_id_key" ON "crm_request_categories"("tenant_id", "id");
CREATE INDEX "crm_request_categories_tenant_id_is_active_sort_order_idx" ON "crm_request_categories"("tenant_id", "is_active", "sort_order");

CREATE TABLE "crm_request_subcategories" (
  "id" TEXT NOT NULL, "tenant_id" TEXT NOT NULL, "category_id" TEXT NOT NULL, "name" TEXT NOT NULL, "slug" TEXT NOT NULL,
  "description" TEXT, "icon" TEXT, "sort_order" INTEGER NOT NULL DEFAULT 0, "is_active" BOOLEAN NOT NULL DEFAULT true,
  "default_team_id" TEXT, "default_priority" "RequestPriority", "created_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3), "deleted_by" TEXT, CONSTRAINT "crm_request_subcategories_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "crm_request_subcategories_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "crm_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "crm_request_subcategories_tenant_id_category_id_fkey" FOREIGN KEY ("tenant_id", "category_id") REFERENCES "crm_request_categories"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "crm_request_subcategories_tenant_id_default_team_id_fkey" FOREIGN KEY ("tenant_id", "default_team_id") REFERENCES "crm_teams"("tenant_id", "id") ON DELETE NO ACTION ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "crm_request_subcategories_tenant_id_category_id_slug_key" ON "crm_request_subcategories"("tenant_id", "category_id", "slug");
CREATE UNIQUE INDEX "crm_request_subcategories_tenant_id_id_key" ON "crm_request_subcategories"("tenant_id", "id");
CREATE INDEX "crm_request_subcategories_tenant_id_category_id_is_active_sort_order_idx" ON "crm_request_subcategories"("tenant_id", "category_id", "is_active", "sort_order");

CREATE TABLE "crm_request_tasks" (
  "id" TEXT NOT NULL, "tenant_id" TEXT NOT NULL, "request_id" TEXT NOT NULL, "title" TEXT NOT NULL, "description" TEXT,
  "status" "TaskStatus" NOT NULL DEFAULT 'OPEN', "priority" "RequestPriority" NOT NULL DEFAULT 'NORMAL', "assignee_id" TEXT,
  "due_at" TIMESTAMP(3), "completed_at" TIMESTAMP(3), "completed_by" TEXT, "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_by" TEXT NOT NULL, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3), "deleted_by" TEXT, CONSTRAINT "crm_request_tasks_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "crm_request_tasks_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "crm_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "crm_request_tasks_tenant_id_request_id_fkey" FOREIGN KEY ("tenant_id", "request_id") REFERENCES "crm_requests"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "crm_request_tasks_tenant_id_request_id_status_sort_order_idx" ON "crm_request_tasks"("tenant_id", "request_id", "status", "sort_order");
CREATE INDEX "crm_request_tasks_tenant_id_assignee_id_status_idx" ON "crm_request_tasks"("tenant_id", "assignee_id", "status");

CREATE TABLE "crm_request_reminders" (
  "id" TEXT NOT NULL, "tenant_id" TEXT NOT NULL, "request_id" TEXT NOT NULL, "title" TEXT NOT NULL, "note" TEXT,
  "remind_at" TIMESTAMP(3) NOT NULL, "user_id" TEXT NOT NULL, "status" "ReminderStatus" NOT NULL DEFAULT 'SCHEDULED',
  "sent_at" TIMESTAMP(3), "dismissed_at" TIMESTAMP(3), "created_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3), "deleted_by" TEXT, CONSTRAINT "crm_request_reminders_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "crm_request_reminders_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "crm_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "crm_request_reminders_tenant_id_request_id_fkey" FOREIGN KEY ("tenant_id", "request_id") REFERENCES "crm_requests"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "crm_request_reminders_tenant_id_request_id_remind_at_idx" ON "crm_request_reminders"("tenant_id", "request_id", "remind_at");
CREATE INDEX "crm_request_reminders_tenant_id_user_id_status_remind_at_idx" ON "crm_request_reminders"("tenant_id", "user_id", "status", "remind_at");

CREATE UNIQUE INDEX "crm_teams_default_unique" ON "crm_teams"("tenant_id") WHERE "is_default" AND "deleted_at" IS NULL;

-- Existing values point to Core departments, not CRM-local teams.
UPDATE "crm_requests" SET "team_id" = NULL;
ALTER TABLE "crm_requests" ADD COLUMN "category_id" TEXT, ADD COLUMN "subcategory_id" TEXT, ADD COLUMN "owner_id" TEXT;
ALTER TABLE "crm_requests" ADD CONSTRAINT "crm_requests_tenant_id_team_id_fkey" FOREIGN KEY ("tenant_id", "team_id") REFERENCES "crm_teams"("tenant_id", "id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "crm_requests" ADD CONSTRAINT "crm_requests_tenant_id_category_id_fkey" FOREIGN KEY ("tenant_id", "category_id") REFERENCES "crm_request_categories"("tenant_id", "id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "crm_requests" ADD CONSTRAINT "crm_requests_tenant_id_subcategory_id_fkey" FOREIGN KEY ("tenant_id", "subcategory_id") REFERENCES "crm_request_subcategories"("tenant_id", "id") ON DELETE NO ACTION ON UPDATE CASCADE;
CREATE INDEX "crm_requests_tenant_id_category_id_status_idx" ON "crm_requests"("tenant_id", "category_id", "status");
CREATE INDEX "crm_requests_tenant_id_owner_id_status_idx" ON "crm_requests"("tenant_id", "owner_id", "status");

INSERT INTO "crm_request_categories" ("id", "tenant_id", "name", "slug", "sort_order", "created_by", "updated_at")
SELECT 'crm_cat_' || replace(gen_random_uuid()::text, '-', ''), t."id", v."name", v."slug", v."sort_order", 'system', CURRENT_TIMESTAMP
FROM "crm_tenants" t CROSS JOIN (VALUES
  ('General', 'general', 0), ('Support', 'support', 1), ('Billing', 'billing', 2), ('Sales', 'sales', 3),
  ('Complaint', 'complaint', 4), ('Feedback', 'feedback', 5), ('Other', 'other', 6)
) AS v("name", "slug", "sort_order");
UPDATE "crm_requests" r SET "category_id" = c."id"
FROM "crm_request_categories" c WHERE c."tenant_id" = r."tenant_id" AND c."slug" = lower(r."category"::text);
ALTER TABLE "crm_requests" DROP COLUMN "category";
DROP TYPE "RequestCategory";

ALTER TABLE "crm_request_notes" ADD COLUMN "email_message_id" TEXT, ADD COLUMN "email_direction" "EmailDirection", ADD COLUMN "email_from" TEXT, ADD COLUMN "email_to" TEXT[] NOT NULL DEFAULT '{}', ADD COLUMN "email_cc" TEXT[] NOT NULL DEFAULT '{}', ADD COLUMN "email_subject" TEXT;
CREATE INDEX "crm_request_notes_tenant_id_kind_created_at_idx" ON "crm_request_notes"("tenant_id", "kind", "created_at");
