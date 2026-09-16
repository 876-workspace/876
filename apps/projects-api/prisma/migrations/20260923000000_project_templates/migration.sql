-- Project templates: immutable, versioned JSON snapshots of project structure.
-- A template row points at its current version; every edit appends a
-- projects_project_template_versions row and bumps current_version.
-- Instantiation records map idempotency keys to the created project so
-- replays return the same project without writing a second copy.
CREATE TABLE "projects_project_templates" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "current_version" INTEGER NOT NULL DEFAULT 1,
    "definition" JSONB NOT NULL,
    "source_project_id" TEXT,
    "deleted_at" BIGINT,
    "deleted_by" TEXT,
    "deletion_reason" TEXT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    CONSTRAINT "projects_project_templates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "projects_project_template_versions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "definition" JSONB NOT NULL,
    "created_at" BIGINT NOT NULL,
    CONSTRAINT "projects_project_template_versions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "projects_project_template_instantiations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "template_version" INTEGER NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "created_at" BIGINT NOT NULL,
    CONSTRAINT "projects_project_template_instantiations_pkey" PRIMARY KEY ("id")
);

-- Version guards so invalid template rows fail at the database.
ALTER TABLE "projects_project_templates" ADD CONSTRAINT "projects_tpl_current_version_chk" CHECK ("current_version" >= 1);
ALTER TABLE "projects_project_template_versions" ADD CONSTRAINT "projects_tpl_versions_version_chk" CHECK ("version" >= 1);
ALTER TABLE "projects_project_template_instantiations" ADD CONSTRAINT "projects_tpl_inst_version_chk" CHECK ("template_version" >= 1);

-- CreateIndex
ALTER TABLE "projects_project_templates" ADD CONSTRAINT "projects_project_templates_tenant_key_uidx" UNIQUE ("tenant_id", "key");
CREATE INDEX "projects_tpl_tenant_updated_idx" ON "projects_project_templates"("tenant_id", "updated_at");
ALTER TABLE "projects_project_template_versions" ADD CONSTRAINT "projects_tpl_versions_tpl_ver_uidx" UNIQUE ("template_id", "version");
ALTER TABLE "projects_project_template_instantiations" ADD CONSTRAINT "projects_tpl_inst_tenant_tpl_key_uidx" UNIQUE ("tenant_id", "template_id", "idempotency_key");

-- AddForeignKey
ALTER TABLE "projects_project_templates" ADD CONSTRAINT "projects_project_templates_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "projects_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_project_templates" ADD CONSTRAINT "projects_tpl_source_project_fkey" FOREIGN KEY ("source_project_id") REFERENCES "projects_projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "projects_project_template_versions" ADD CONSTRAINT "projects_tpl_versions_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "projects_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_project_template_versions" ADD CONSTRAINT "projects_tpl_versions_template_fkey" FOREIGN KEY ("template_id") REFERENCES "projects_project_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_project_template_instantiations" ADD CONSTRAINT "projects_tpl_inst_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "projects_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_project_template_instantiations" ADD CONSTRAINT "projects_tpl_inst_template_fkey" FOREIGN KEY ("template_id") REFERENCES "projects_project_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_project_template_instantiations" ADD CONSTRAINT "projects_tpl_inst_project_fkey" FOREIGN KEY ("project_id") REFERENCES "projects_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
