-- CreateTable projects_project_baselines
CREATE TABLE "projects_project_baselines" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "captured_by" TEXT,
    "captured_at" BIGINT NOT NULL,
    "note" TEXT,
    CONSTRAINT "projects_project_baselines_pkey" PRIMARY KEY ("id")
);

-- CreateTable projects_project_baseline_items
CREATE TABLE "projects_project_baseline_items" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "baseline_id" TEXT NOT NULL,
    "issue_id" TEXT NOT NULL,
    "planned_start_date" BIGINT,
    "planned_finish_date" BIGINT,
    "planned_duration_minutes" INTEGER,
    "status" TEXT NOT NULL,
    CONSTRAINT "projects_project_baseline_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "projects_baselines_tenant_project_idx" ON "projects_project_baselines"("tenant_id", "project_id");
CREATE UNIQUE INDEX "projects_baseline_items_unique" ON "projects_project_baseline_items"("baseline_id", "issue_id");
CREATE INDEX "projects_baseline_items_baseline_idx" ON "projects_project_baseline_items"("baseline_id");
CREATE INDEX "projects_baseline_items_issue_idx" ON "projects_project_baseline_items"("issue_id");

-- AddForeignKey
ALTER TABLE "projects_project_baselines" ADD CONSTRAINT "projects_baselines_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "projects_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_project_baselines" ADD CONSTRAINT "projects_baselines_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_project_baseline_items" ADD CONSTRAINT "projects_baseline_items_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "projects_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_project_baseline_items" ADD CONSTRAINT "projects_baseline_items_baseline_fkey" FOREIGN KEY ("baseline_id") REFERENCES "projects_project_baselines"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_project_baseline_items" ADD CONSTRAINT "projects_baseline_items_issue_fkey" FOREIGN KEY ("issue_id") REFERENCES "projects_issues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
