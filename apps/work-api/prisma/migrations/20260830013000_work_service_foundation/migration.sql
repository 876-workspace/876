-- CreateEnum
CREATE TYPE "WorkTenantStatus" AS ENUM ('ACTIVE', 'SUSPENDED');
CREATE TYPE "WorkTaskStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'DONE', 'CANCELLED');
CREATE TYPE "WorkReminderStatus" AS ENUM ('SCHEDULED', 'SENT', 'DISMISSED', 'CANCELLED');

-- CreateTable
CREATE TABLE "work_tenants" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "status" "WorkTenantStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "work_tenants_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "work_tasks" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "context_service" TEXT,
    "context_resource" TEXT,
    "context_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "WorkTaskStatus" NOT NULL DEFAULT 'OPEN',
    "priority_id" TEXT,
    "assignee_id" TEXT,
    "due_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "completed_by" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,
    CONSTRAINT "work_tasks_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "work_tasks_context_complete" CHECK (
      ("context_service" IS NULL AND "context_resource" IS NULL AND "context_id" IS NULL)
      OR
      ("context_service" IS NOT NULL AND "context_resource" IS NOT NULL AND "context_id" IS NOT NULL)
    )
);

CREATE TABLE "work_reminders" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "context_service" TEXT,
    "context_resource" TEXT,
    "context_id" TEXT,
    "title" TEXT NOT NULL,
    "note" TEXT,
    "remind_at" TIMESTAMP(3) NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" "WorkReminderStatus" NOT NULL DEFAULT 'SCHEDULED',
    "sent_at" TIMESTAMP(3),
    "dismissed_at" TIMESTAMP(3),
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,
    CONSTRAINT "work_reminders_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "work_reminders_context_complete" CHECK (
      ("context_service" IS NULL AND "context_resource" IS NULL AND "context_id" IS NULL)
      OR
      ("context_service" IS NOT NULL AND "context_resource" IS NOT NULL AND "context_id" IS NOT NULL)
    )
);

-- CreateIndex
CREATE UNIQUE INDEX "work_tenants_organization_id_key" ON "work_tenants"("organization_id");
CREATE INDEX "work_tasks_tenant_id_context_service_context_resource_conte_idx" ON "work_tasks"("tenant_id", "context_service", "context_resource", "context_id", "status", "sort_order");
CREATE INDEX "work_tasks_tenant_id_priority_id_status_idx" ON "work_tasks"("tenant_id", "priority_id", "status");
CREATE INDEX "work_tasks_tenant_id_assignee_id_status_idx" ON "work_tasks"("tenant_id", "assignee_id", "status");
CREATE INDEX "work_tasks_tenant_id_due_at_idx" ON "work_tasks"("tenant_id", "due_at");
CREATE INDEX "work_reminders_tenant_id_context_service_context_resource_c_idx" ON "work_reminders"("tenant_id", "context_service", "context_resource", "context_id", "remind_at");
CREATE INDEX "work_reminders_tenant_id_user_id_status_remind_at_idx" ON "work_reminders"("tenant_id", "user_id", "status", "remind_at");

-- AddForeignKey
ALTER TABLE "work_tasks" ADD CONSTRAINT "work_tasks_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "work_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "work_reminders" ADD CONSTRAINT "work_reminders_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "work_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
