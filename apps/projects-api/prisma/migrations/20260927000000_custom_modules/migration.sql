-- 876 Projects phase 15: custom modules, records, statuses, links, widgets.
-- Layouts entity check is dropped because custom-module entities carry a
-- dynamic `custom-module:<key>` suffix that cannot be enumerated in a CHECK.

ALTER TABLE "projects_layouts" DROP CONSTRAINT IF EXISTS "projects_layouts_entity_chk";

CREATE TABLE "projects_custom_modules" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "project_id" TEXT,
    "key" TEXT NOT NULL,
    "singular_name" TEXT NOT NULL,
    "plural_name" TEXT NOT NULL,
    "icon" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "restricted_to_role_keys" TEXT[] NOT NULL DEFAULT '{}',
    "deleted_at" BIGINT,
    "deleted_by" TEXT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    CONSTRAINT "projects_custom_modules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "projects_custom_module_fields" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "module_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "field_type" TEXT NOT NULL,
    "options" JSONB,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    CONSTRAINT "projects_custom_module_fields_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "projects_custom_module_statuses" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "module_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    CONSTRAINT "projects_custom_module_statuses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "projects_custom_module_records" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "module_id" TEXT NOT NULL,
    "project_id" TEXT,
    "title" TEXT NOT NULL,
    "status_key" TEXT NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,
    "deleted_at" BIGINT,
    "deleted_by" TEXT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    CONSTRAINT "projects_custom_module_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "projects_custom_module_record_values" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "record_id" TEXT NOT NULL,
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
    CONSTRAINT "projects_custom_module_record_values_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "projects_custom_module_links" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "source_record_id" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "relation" TEXT NOT NULL,
    "created_by" TEXT,
    "created_at" BIGINT NOT NULL,
    CONSTRAINT "projects_custom_module_links_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "projects_dashboard_widgets" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT,
    "kind" TEXT NOT NULL,
    "module_id" TEXT NOT NULL,
    "config" JSONB NOT NULL DEFAULT '{}',
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    CONSTRAINT "projects_dashboard_widgets_pkey" PRIMARY KEY ("id")
);

-- Guards so invalid rows fail at the database.
ALTER TABLE "projects_custom_modules" ADD CONSTRAINT "projects_cmod_scope_chk" CHECK ("scope" IN ('org', 'project'));
ALTER TABLE "projects_custom_modules" ADD CONSTRAINT "projects_cmod_version_chk" CHECK ("version" >= 1);
ALTER TABLE "projects_custom_module_statuses" ADD CONSTRAINT "projects_cmods_category_chk" CHECK ("category" IN ('open', 'in-progress', 'done'));
ALTER TABLE "projects_custom_module_links" ADD CONSTRAINT "projects_cmodl_target_chk" CHECK ("target_type" IN ('record', 'work-item', 'project', 'phase'));
ALTER TABLE "projects_dashboard_widgets" ADD CONSTRAINT "projects_dshw_kind_chk" CHECK ("kind" IN ('record-count', 'status-breakdown', 'recent-records'));

-- CreateIndex
ALTER TABLE "projects_custom_modules" ADD CONSTRAINT "projects_cmod_tenant_key_uidx" UNIQUE ("tenant_id", "key");
CREATE INDEX "projects_cmod_tenant_scope_idx" ON "projects_custom_modules"("tenant_id", "scope");
ALTER TABLE "projects_custom_module_fields" ADD CONSTRAINT "projects_cmodf_module_key_uidx" UNIQUE ("module_id", "key");
CREATE INDEX "projects_cmodf_module_pos_idx" ON "projects_custom_module_fields"("module_id", "position");
ALTER TABLE "projects_custom_module_statuses" ADD CONSTRAINT "projects_cmods_module_key_uidx" UNIQUE ("module_id", "key");
CREATE INDEX "projects_cmods_module_pos_idx" ON "projects_custom_module_statuses"("module_id", "position");
CREATE INDEX "projects_cmodr_tenant_module_idx" ON "projects_custom_module_records"("tenant_id", "module_id");
CREATE INDEX "projects_cmodr_module_status_idx" ON "projects_custom_module_records"("tenant_id", "module_id", "status_key");
CREATE INDEX "projects_cmodr_tenant_project_idx" ON "projects_custom_module_records"("tenant_id", "project_id");
ALTER TABLE "projects_custom_module_record_values" ADD CONSTRAINT "projects_cmodrv_record_field_uidx" UNIQUE ("record_id", "field_id");
CREATE INDEX "projects_cmodrv_tenant_field_idx" ON "projects_custom_module_record_values"("tenant_id", "field_id");
ALTER TABLE "projects_custom_module_links" ADD CONSTRAINT "projects_cmodl_pair_relation_uidx" UNIQUE ("source_record_id", "target_type", "target_id", "relation");
CREATE INDEX "projects_cmodl_tenant_source_idx" ON "projects_custom_module_links"("tenant_id", "source_record_id");
CREATE INDEX "projects_cmodl_tenant_target_idx" ON "projects_custom_module_links"("tenant_id", "target_type", "target_id");
CREATE INDEX "projects_dshw_tenant_module_idx" ON "projects_dashboard_widgets"("tenant_id", "module_id");
CREATE INDEX "projects_dshw_tenant_user_idx" ON "projects_dashboard_widgets"("tenant_id", "user_id");

-- AddForeignKey
ALTER TABLE "projects_custom_modules" ADD CONSTRAINT "projects_custom_modules_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "projects_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_custom_module_fields" ADD CONSTRAINT "projects_custom_module_fields_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "projects_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_custom_module_fields" ADD CONSTRAINT "projects_custom_module_fields_module_fkey" FOREIGN KEY ("module_id") REFERENCES "projects_custom_modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_custom_module_statuses" ADD CONSTRAINT "projects_custom_module_statuses_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "projects_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_custom_module_statuses" ADD CONSTRAINT "projects_custom_module_statuses_module_fkey" FOREIGN KEY ("module_id") REFERENCES "projects_custom_modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_custom_module_records" ADD CONSTRAINT "projects_custom_module_records_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "projects_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_custom_module_records" ADD CONSTRAINT "projects_custom_module_records_module_fkey" FOREIGN KEY ("module_id") REFERENCES "projects_custom_modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_custom_module_record_values" ADD CONSTRAINT "projects_custom_module_record_values_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "projects_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_custom_module_record_values" ADD CONSTRAINT "projects_custom_module_record_values_record_fkey" FOREIGN KEY ("record_id") REFERENCES "projects_custom_module_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_custom_module_record_values" ADD CONSTRAINT "projects_custom_module_record_values_field_fkey" FOREIGN KEY ("field_id") REFERENCES "projects_custom_module_fields"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_custom_module_links" ADD CONSTRAINT "projects_custom_module_links_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "projects_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_custom_module_links" ADD CONSTRAINT "projects_custom_module_links_source_fkey" FOREIGN KEY ("source_record_id") REFERENCES "projects_custom_module_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_dashboard_widgets" ADD CONSTRAINT "projects_dashboard_widgets_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "projects_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_dashboard_widgets" ADD CONSTRAINT "projects_dashboard_widgets_module_fkey" FOREIGN KEY ("module_id") REFERENCES "projects_custom_modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
