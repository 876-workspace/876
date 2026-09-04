-- CreateTable
CREATE TABLE "projects_work_item_types" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon_key" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "hierarchy_level" INTEGER NOT NULL DEFAULT 1,
    "description" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "archived_at" BIGINT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    CONSTRAINT "projects_work_item_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects_workflow_states" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "description" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "archived_at" BIGINT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    CONSTRAINT "projects_workflow_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects_milestones" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "start_date" BIGINT,
    "target_date" BIGINT,
    "completed_at" BIGINT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "deleted_at" BIGINT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    CONSTRAINT "projects_milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects_cycles" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "project_id" TEXT,
    "number" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "starts_at" BIGINT NOT NULL,
    "ends_at" BIGINT NOT NULL,
    "completed_at" BIGINT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    CONSTRAINT "projects_cycles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects_custom_fields" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "field_type" TEXT NOT NULL,
    "options" JSONB,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "archived_at" BIGINT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    CONSTRAINT "projects_custom_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects_custom_fields_on_types" (
    "field_id" TEXT NOT NULL,
    "type_id" TEXT NOT NULL,
    CONSTRAINT "projects_custom_fields_on_types_pkey" PRIMARY KEY ("field_id", "type_id")
);

-- CreateTable
CREATE TABLE "projects_custom_field_values" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "issue_id" TEXT NOT NULL,
    "field_id" TEXT NOT NULL,
    "string_value" TEXT,
    "integer_value" INTEGER,
    "decimal_value" DECIMAL(20,6),
    "boolean_value" BOOLEAN,
    "date_value" BIGINT,
    "select_key" TEXT,
    "select_keys" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "updated_by" TEXT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    CONSTRAINT "projects_custom_field_values_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "projects_tenants" ADD COLUMN "preset_key" TEXT NOT NULL DEFAULT 'software-development';
ALTER TABLE "projects_projects" ADD COLUMN "default_work_item_type_id" TEXT;
ALTER TABLE "projects_issues" ADD COLUMN "workflow_state_id" TEXT;
ALTER TABLE "projects_issues" ADD COLUMN "type_key" TEXT NOT NULL DEFAULT 'task';
ALTER TABLE "projects_issues" ADD COLUMN "work_item_type_id" TEXT;
ALTER TABLE "projects_issues" ADD COLUMN "milestone_id" TEXT;
ALTER TABLE "projects_issues" ADD COLUMN "cycle_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "projects_work_item_types_tenant_id_key_key" ON "projects_work_item_types"("tenant_id", "key");
CREATE UNIQUE INDEX "projects_workflow_states_tenant_id_key_key" ON "projects_workflow_states"("tenant_id", "key");
CREATE INDEX "projects_workflow_states_tenant_id_category_idx" ON "projects_workflow_states"("tenant_id", "category");
CREATE UNIQUE INDEX "projects_milestones_project_id_key_key" ON "projects_milestones"("project_id", "key");
CREATE INDEX "projects_milestones_tenant_id_status_idx" ON "projects_milestones"("tenant_id", "status");
CREATE UNIQUE INDEX "projects_cycles_tenant_id_number_key" ON "projects_cycles"("tenant_id", "number");
CREATE INDEX "projects_cycles_tenant_id_starts_at_idx" ON "projects_cycles"("tenant_id", "starts_at");
CREATE UNIQUE INDEX "projects_custom_fields_tenant_id_key_key" ON "projects_custom_fields"("tenant_id", "key");
CREATE UNIQUE INDEX "projects_custom_field_values_issue_id_field_id_key" ON "projects_custom_field_values"("issue_id", "field_id");
CREATE INDEX "projects_custom_field_values_tenant_id_field_id_idx" ON "projects_custom_field_values"("tenant_id", "field_id");
CREATE INDEX "projects_issues_tenant_id_milestone_id_idx" ON "projects_issues"("tenant_id", "milestone_id");

-- AddForeignKey
ALTER TABLE "projects_work_item_types" ADD CONSTRAINT "projects_work_item_types_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "projects_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_workflow_states" ADD CONSTRAINT "projects_workflow_states_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "projects_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_milestones" ADD CONSTRAINT "projects_milestones_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "projects_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_milestones" ADD CONSTRAINT "projects_milestones_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_cycles" ADD CONSTRAINT "projects_cycles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "projects_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_custom_fields" ADD CONSTRAINT "projects_custom_fields_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "projects_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_custom_fields_on_types" ADD CONSTRAINT "projects_custom_fields_on_types_field_id_fkey" FOREIGN KEY ("field_id") REFERENCES "projects_custom_fields"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_custom_fields_on_types" ADD CONSTRAINT "projects_custom_fields_on_types_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "projects_work_item_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_custom_field_values" ADD CONSTRAINT "projects_custom_field_values_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "projects_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_custom_field_values" ADD CONSTRAINT "projects_custom_field_values_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "projects_issues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_custom_field_values" ADD CONSTRAINT "projects_custom_field_values_field_id_fkey" FOREIGN KEY ("field_id") REFERENCES "projects_custom_fields"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_issues" ADD CONSTRAINT "projects_issues_workflow_state_id_fkey" FOREIGN KEY ("workflow_state_id") REFERENCES "projects_workflow_states"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "projects_issues" ADD CONSTRAINT "projects_issues_work_item_type_id_fkey" FOREIGN KEY ("work_item_type_id") REFERENCES "projects_work_item_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "projects_issues" ADD CONSTRAINT "projects_issues_milestone_id_fkey" FOREIGN KEY ("milestone_id") REFERENCES "projects_milestones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "projects_issues" ADD CONSTRAINT "projects_issues_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "projects_cycles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Status becomes a tenant-extensible workflow-state key (see WorkflowState):
-- the fixed six-value CHECK from the init migration would reject a custom
-- state's key. Validation moves to the service layer
-- (issues.service.ts resolves `status` against the tenant's WorkflowState
-- rows), so the column keeps its data, type, and default — only the
-- hard-coded whitelist is dropped.
ALTER TABLE "projects_issues" DROP CONSTRAINT "projects_issues_status_check";
