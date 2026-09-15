-- AlterTable
ALTER TABLE "projects_milestones" ADD COLUMN "owner_user_id" TEXT;
ALTER TABLE "projects_custom_fields" ADD COLUMN "scope" TEXT NOT NULL DEFAULT 'work-item';

-- CreateTable
CREATE TABLE "projects_milestone_comments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "milestone_id" TEXT NOT NULL,
    "author_user_id" TEXT,
    "body" TEXT NOT NULL,
    "deleted_at" BIGINT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    CONSTRAINT "projects_milestone_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects_milestone_events" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "milestone_id" TEXT NOT NULL,
    "actor_user_id" TEXT,
    "type" TEXT NOT NULL,
    "from_value" TEXT,
    "to_value" TEXT,
    "created_at" BIGINT NOT NULL,
    CONSTRAINT "projects_milestone_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects_milestone_custom_field_values" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "milestone_id" TEXT NOT NULL,
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
    CONSTRAINT "projects_milestone_custom_field_values_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "projects_milestones_tenant_id_owner_user_id_idx" ON "projects_milestones"("tenant_id", "owner_user_id");
CREATE INDEX "projects_custom_fields_tenant_id_scope_idx" ON "projects_custom_fields"("tenant_id", "scope");
CREATE INDEX "projects_milestone_comments_milestone_id_created_at_idx" ON "projects_milestone_comments"("milestone_id", "created_at");
CREATE INDEX "projects_milestone_events_milestone_id_created_at_idx" ON "projects_milestone_events"("milestone_id", "created_at");
CREATE UNIQUE INDEX "projects_milestone_custom_field_values_milestone_id_field_id_key" ON "projects_milestone_custom_field_values"("milestone_id", "field_id");
CREATE INDEX "projects_milestone_custom_field_values_tenant_id_field_id_idx" ON "projects_milestone_custom_field_values"("tenant_id", "field_id");

-- AddForeignKey
ALTER TABLE "projects_milestone_comments" ADD CONSTRAINT "projects_milestone_comments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "projects_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_milestone_comments" ADD CONSTRAINT "projects_milestone_comments_milestone_id_fkey" FOREIGN KEY ("milestone_id") REFERENCES "projects_milestones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_milestone_events" ADD CONSTRAINT "projects_milestone_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "projects_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_milestone_events" ADD CONSTRAINT "projects_milestone_events_milestone_id_fkey" FOREIGN KEY ("milestone_id") REFERENCES "projects_milestones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_milestone_custom_field_values" ADD CONSTRAINT "projects_milestone_custom_field_values_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "projects_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_milestone_custom_field_values" ADD CONSTRAINT "projects_milestone_custom_field_values_milestone_id_fkey" FOREIGN KEY ("milestone_id") REFERENCES "projects_milestones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_milestone_custom_field_values" ADD CONSTRAINT "projects_milestone_custom_field_values_field_id_fkey" FOREIGN KEY ("field_id") REFERENCES "projects_custom_fields"("id") ON DELETE CASCADE ON UPDATE CASCADE;
