CREATE TABLE "billing_document_templates" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "document_type" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "layout" TEXT NOT NULL,
  "is_default" BOOLEAN NOT NULL DEFAULT false,
  "settings" JSONB NOT NULL DEFAULT '{}',
  "schema_version" INTEGER NOT NULL,
  "created_by" TEXT,
  "updated_by" TEXT,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  "deleted_at" INTEGER,
  "deleted_by" TEXT,
  "deletion_reason" TEXT,

  CONSTRAINT "billing_document_templates_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "billing_document_templates_tenant_document_deleted_idx"
  ON "billing_document_templates" ("tenant_id", "document_type", "deleted_at");

CREATE UNIQUE INDEX "billing_document_templates_one_default_idx"
  ON "billing_document_templates" ("tenant_id", "document_type")
  WHERE "is_default" = true AND "deleted_at" IS NULL;

ALTER TABLE "billing_document_templates"
  ADD CONSTRAINT "billing_document_templates_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "billing_tenants"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "billing_branding_preferences" (
  "tenant_id" TEXT NOT NULL,
  "accent_color" TEXT NOT NULL,
  "appearance" TEXT NOT NULL,
  "sidebar_tone" TEXT NOT NULL,
  "updated_by" TEXT,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,

  CONSTRAINT "billing_branding_preferences_pkey" PRIMARY KEY ("tenant_id")
);

ALTER TABLE "billing_branding_preferences"
  ADD CONSTRAINT "billing_branding_preferences_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "billing_tenants"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
