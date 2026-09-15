-- AlterTable projects_issues (additive only)
ALTER TABLE "projects_issues" ADD COLUMN "planned_start_date" BIGINT;
ALTER TABLE "projects_issues" ADD COLUMN "planned_finish_date" BIGINT;
ALTER TABLE "projects_issues" ADD COLUMN "planned_duration_minutes" INTEGER;

-- CreateTable projects_issue_relations
CREATE TABLE "projects_issue_relations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "source_issue_id" TEXT NOT NULL,
    "target_issue_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "created_by" TEXT,
    "created_at" BIGINT NOT NULL,
    CONSTRAINT "projects_issue_relations_pkey" PRIMARY KEY ("id")
);

-- CreateTable projects_issue_dependencies
CREATE TABLE "projects_issue_dependencies" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "predecessor_issue_id" TEXT NOT NULL,
    "successor_issue_id" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'finish-to-start',
    "lag_minutes" INTEGER NOT NULL DEFAULT 0,
    "created_by" TEXT,
    "created_at" BIGINT NOT NULL,
    CONSTRAINT "projects_issue_dependencies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "projects_issue_relations_unique" ON "projects_issue_relations"("tenant_id", "source_issue_id", "target_issue_id", "type");
CREATE INDEX "projects_issue_relations_source_issue_id_idx" ON "projects_issue_relations"("source_issue_id");
CREATE INDEX "projects_issue_relations_target_issue_id_idx" ON "projects_issue_relations"("target_issue_id");
CREATE UNIQUE INDEX "projects_issue_dependencies_unique" ON "projects_issue_dependencies"("tenant_id", "predecessor_issue_id", "successor_issue_id");
CREATE INDEX "projects_issue_dependencies_predecessor_issue_id_idx" ON "projects_issue_dependencies"("predecessor_issue_id");
CREATE INDEX "projects_issue_dependencies_successor_issue_id_idx" ON "projects_issue_dependencies"("successor_issue_id");

-- AddForeignKey
ALTER TABLE "projects_issue_relations" ADD CONSTRAINT "projects_issue_relations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "projects_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_issue_relations" ADD CONSTRAINT "projects_issue_relations_source_issue_id_fkey" FOREIGN KEY ("source_issue_id") REFERENCES "projects_issues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_issue_relations" ADD CONSTRAINT "projects_issue_relations_target_issue_id_fkey" FOREIGN KEY ("target_issue_id") REFERENCES "projects_issues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_issue_dependencies" ADD CONSTRAINT "projects_issue_dependencies_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "projects_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_issue_dependencies" ADD CONSTRAINT "projects_issue_dependencies_predecessor_issue_id_fkey" FOREIGN KEY ("predecessor_issue_id") REFERENCES "projects_issues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_issue_dependencies" ADD CONSTRAINT "projects_issue_dependencies_successor_issue_id_fkey" FOREIGN KEY ("successor_issue_id") REFERENCES "projects_issues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
