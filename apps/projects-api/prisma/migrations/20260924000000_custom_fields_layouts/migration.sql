-- Project custom fields reuse the work-item field-type vocabulary and value
-- columns. Layouts store one JSONB definition per row; exactly one default
-- layout per (tenant, entity, work item type) is enforced by a partial
-- unique index below rather than a Prisma-level constraint.
CREATE TABLE "projects_project_custom_fields" (
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
    CONSTRAINT "projects_project_custom_fields_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "projects_project_custom_field_values" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "field_id" TEXT NOT NULL,
    "string_value" TEXT,
    "integer_value" INTEGER,
    "decimal_value" DECIMAL(20,6),
    "boolean_value" BOOLEAN,
    "date_value" BIGINT,
    "select_key" TEXT,
    "select_keys" TEXT[] NOT NULL DEFAULT '{}',
    "updated_by" TEXT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    CONSTRAINT "projects_project_custom_field_values_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "projects_layouts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "work_item_type_id" TEXT,
    "name" TEXT NOT NULL,
    "definition" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" BIGINT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    CONSTRAINT "projects_layouts_pkey" PRIMARY KEY ("id")
);

-- Layout guards so invalid rows fail at the database.
ALTER TABLE "projects_layouts" ADD CONSTRAINT "projects_layouts_entity_chk" CHECK ("entity" IN ('project', 'phase', 'work-item'));
ALTER TABLE "projects_layouts" ADD CONSTRAINT "projects_layouts_version_chk" CHECK ("version" >= 1);

-- CreateIndex
ALTER TABLE "projects_project_custom_fields" ADD CONSTRAINT "projects_project_cf_tenant_key_uidx" UNIQUE ("tenant_id", "key");
CREATE INDEX "projects_project_cf_tenant_pos_idx" ON "projects_project_custom_fields"("tenant_id", "position");
ALTER TABLE "projects_project_custom_field_values" ADD CONSTRAINT "projects_project_cfv_proj_field_uidx" UNIQUE ("project_id", "field_id");
CREATE INDEX "projects_project_cfv_tenant_field_idx" ON "projects_project_custom_field_values"("tenant_id", "field_id");
CREATE INDEX "projects_layouts_tenant_entity_idx" ON "projects_layouts"("tenant_id", "entity");
CREATE INDEX "projects_layouts_scope_idx" ON "projects_layouts"("tenant_id", "entity", "work_item_type_id");
-- Exactly one default layout per (tenant, entity, work item type); NULL
-- work_item_type_id values coalesce so entity defaults are singletons too.
CREATE UNIQUE INDEX "projects_layouts_one_default_uidx" ON "projects_layouts"("tenant_id", "entity", COALESCE("work_item_type_id", '')) WHERE "is_default" = TRUE AND "deleted_at" IS NULL;

-- AddForeignKey
ALTER TABLE "projects_project_custom_fields" ADD CONSTRAINT "projects_project_custom_fields_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "projects_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_project_custom_field_values" ADD CONSTRAINT "projects_project_custom_field_values_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "projects_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_project_custom_field_values" ADD CONSTRAINT "projects_project_custom_field_values_project_fkey" FOREIGN KEY ("project_id") REFERENCES "projects_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_project_custom_field_values" ADD CONSTRAINT "projects_project_custom_field_values_field_fkey" FOREIGN KEY ("field_id") REFERENCES "projects_project_custom_fields"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_layouts" ADD CONSTRAINT "projects_layouts_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "projects_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
