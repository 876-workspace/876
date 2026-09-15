-- CreateTable projects_task_lists
CREATE TABLE "projects_task_lists" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "milestone_id" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "owner_user_id" TEXT,
    "start_date" BIGINT,
    "target_date" BIGINT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "archived_at" BIGINT,
    "deleted_at" BIGINT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    CONSTRAINT "projects_task_lists_pkey" PRIMARY KEY ("id")
);

-- AlterTable projects_cycles (additive only)
ALTER TABLE "projects_cycles" ADD COLUMN "description" TEXT;
ALTER TABLE "projects_cycles" ADD COLUMN "goal" TEXT;
ALTER TABLE "projects_cycles" ADD COLUMN "deleted_at" BIGINT;

-- AlterTable projects_issues (additive only)
ALTER TABLE "projects_issues" ADD COLUMN "task_list_id" TEXT;

-- CreateIndex
CREATE INDEX "projects_task_lists_tenant_id_project_id_idx" ON "projects_task_lists"("tenant_id", "project_id");
CREATE INDEX "projects_task_lists_project_id_position_idx" ON "projects_task_lists"("project_id", "position");
CREATE INDEX "projects_task_lists_milestone_id_idx" ON "projects_task_lists"("milestone_id");
CREATE INDEX "projects_issues_tenant_id_task_list_id_idx" ON "projects_issues"("tenant_id", "task_list_id");
CREATE INDEX "projects_issues_project_id_task_list_id_idx" ON "projects_issues"("project_id", "task_list_id");
CREATE INDEX "projects_cycles_project_id_idx" ON "projects_cycles"("project_id");

-- AddForeignKey
ALTER TABLE "projects_task_lists" ADD CONSTRAINT "projects_task_lists_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "projects_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_task_lists" ADD CONSTRAINT "projects_task_lists_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_task_lists" ADD CONSTRAINT "projects_task_lists_milestone_id_fkey" FOREIGN KEY ("milestone_id") REFERENCES "projects_milestones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "projects_issues" ADD CONSTRAINT "projects_issues_task_list_id_fkey" FOREIGN KEY ("task_list_id") REFERENCES "projects_task_lists"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "projects_cycles" ADD CONSTRAINT "projects_cycles_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects_projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
