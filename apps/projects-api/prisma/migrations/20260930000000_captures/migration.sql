CREATE TABLE "projects_captures" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "status" TEXT NOT NULL,
    "source" TEXT,
    "created_by" TEXT NOT NULL,
    "project_id" TEXT,
    "promoted_issue_id" TEXT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,

    CONSTRAINT "projects_captures_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "projects_captures_tenant_id_status_idx" ON "projects_captures"("tenant_id", "status");
