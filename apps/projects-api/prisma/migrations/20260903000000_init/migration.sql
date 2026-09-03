-- CreateTable
CREATE TABLE "projects_tenants" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "triage_project_id" TEXT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,

    CONSTRAINT "projects_tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects_projects" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "lead_user_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'planned',
    "health" TEXT NOT NULL DEFAULT 'on-track',
    "start_date" BIGINT,
    "target_date" BIGINT,
    "next_issue_number" INTEGER NOT NULL DEFAULT 1,
    "customer_id" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "archived_at" BIGINT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,

    CONSTRAINT "projects_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects_project_members" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "created_at" BIGINT NOT NULL,

    CONSTRAINT "projects_project_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects_issues" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "identifier" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'todo',
    "priority" TEXT NOT NULL DEFAULT 'none',
    "assignee_user_id" TEXT,
    "creator_user_id" TEXT,
    "parent_issue_id" TEXT,
    "estimate" INTEGER,
    "due_date" BIGINT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "started_at" BIGINT,
    "completed_at" BIGINT,
    "canceled_at" BIGINT,
    "deleted_at" BIGINT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,

    CONSTRAINT "projects_issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects_comments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "issue_id" TEXT NOT NULL,
    "author_user_id" TEXT,
    "body" TEXT NOT NULL,
    "deleted_at" BIGINT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,

    CONSTRAINT "projects_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects_issue_events" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "issue_id" TEXT NOT NULL,
    "actor_user_id" TEXT,
    "type" TEXT NOT NULL,
    "from_value" TEXT,
    "to_value" TEXT,
    "created_at" BIGINT NOT NULL,

    CONSTRAINT "projects_issue_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects_labels" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6b7280',
    "description" TEXT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,

    CONSTRAINT "projects_labels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects_issue_labels" (
    "issue_id" TEXT NOT NULL,
    "label_id" TEXT NOT NULL,

    CONSTRAINT "projects_issue_labels_pkey" PRIMARY KEY ("issue_id","label_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "projects_tenants_organization_id_key" ON "projects_tenants"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "projects_projects_tenant_id_key_key" ON "projects_projects"("tenant_id", "key");

-- CreateIndex
CREATE UNIQUE INDEX "projects_projects_tenant_id_slug_key" ON "projects_projects"("tenant_id", "slug");

-- CreateIndex
CREATE INDEX "projects_projects_tenant_id_status_idx" ON "projects_projects"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "projects_project_members_project_id_user_id_key" ON "projects_project_members"("project_id", "user_id");

-- CreateIndex
CREATE INDEX "projects_project_members_user_id_idx" ON "projects_project_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "projects_issues_tenant_id_identifier_key" ON "projects_issues"("tenant_id", "identifier");

-- CreateIndex
CREATE UNIQUE INDEX "projects_issues_project_id_number_key" ON "projects_issues"("project_id", "number");

-- CreateIndex
CREATE INDEX "projects_issues_tenant_id_status_idx" ON "projects_issues"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "projects_issues_tenant_id_assignee_user_id_idx" ON "projects_issues"("tenant_id", "assignee_user_id");

-- CreateIndex
CREATE INDEX "projects_issues_tenant_id_updated_at_idx" ON "projects_issues"("tenant_id", "updated_at");

-- CreateIndex
CREATE INDEX "projects_issues_project_id_status_idx" ON "projects_issues"("project_id", "status");

-- CreateIndex
CREATE INDEX "projects_comments_issue_id_created_at_idx" ON "projects_comments"("issue_id", "created_at");

-- CreateIndex
CREATE INDEX "projects_issue_events_issue_id_created_at_idx" ON "projects_issue_events"("issue_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "projects_labels_tenant_id_name_key" ON "projects_labels"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "projects_issue_labels_label_id_idx" ON "projects_issue_labels"("label_id");

-- AddForeignKey
ALTER TABLE "projects_projects" ADD CONSTRAINT "projects_projects_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "projects_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects_project_members" ADD CONSTRAINT "projects_project_members_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects_issues" ADD CONSTRAINT "projects_issues_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "projects_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects_issues" ADD CONSTRAINT "projects_issues_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects_issues" ADD CONSTRAINT "projects_issues_parent_issue_id_fkey" FOREIGN KEY ("parent_issue_id") REFERENCES "projects_issues"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects_comments" ADD CONSTRAINT "projects_comments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "projects_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects_comments" ADD CONSTRAINT "projects_comments_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "projects_issues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects_issue_events" ADD CONSTRAINT "projects_issue_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "projects_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects_issue_events" ADD CONSTRAINT "projects_issue_events_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "projects_issues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects_labels" ADD CONSTRAINT "projects_labels_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "projects_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects_issue_labels" ADD CONSTRAINT "projects_issue_labels_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "projects_issues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects_issue_labels" ADD CONSTRAINT "projects_issue_labels_label_id_fkey" FOREIGN KEY ("label_id") REFERENCES "projects_labels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Check Constraints
ALTER TABLE "projects_projects" ADD CONSTRAINT "projects_projects_status_check"
  CHECK ("status" IN ('planned','active','paused','completed','canceled'));
ALTER TABLE "projects_projects" ADD CONSTRAINT "projects_projects_health_check"
  CHECK ("health" IN ('on-track','at-risk','off-track'));
ALTER TABLE "projects_project_members" ADD CONSTRAINT "projects_project_members_role_check"
  CHECK ("role" IN ('lead','member','viewer'));
ALTER TABLE "projects_issues" ADD CONSTRAINT "projects_issues_status_check"
  CHECK ("status" IN ('backlog','todo','in-progress','in-review','done','canceled'));
ALTER TABLE "projects_issues" ADD CONSTRAINT "projects_issues_priority_check"
  CHECK ("priority" IN ('none','low','medium','high','urgent'));
