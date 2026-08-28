CREATE TYPE "RequestFormStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

CREATE TABLE "crm_request_forms" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "status" "RequestFormStatus" NOT NULL DEFAULT 'DRAFT',
  "definition" JSONB NOT NULL,
  "published_definition" JSONB,
  "version" INTEGER NOT NULL DEFAULT 0,
  "default_category_id" TEXT,
  "default_subcategory_id" TEXT,
  "default_team_id" TEXT,
  "default_priority" "RequestPriority",
  "confirmation_title" TEXT,
  "confirmation_message" TEXT,
  "created_by" TEXT NOT NULL,
  "updated_by" TEXT,
  "published_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  "deleted_by" TEXT,
  "deletion_reason" TEXT,

  CONSTRAINT "crm_request_forms_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "crm_request_form_submissions" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "form_id" TEXT NOT NULL,
  "request_id" TEXT NOT NULL,
  "form_version" INTEGER NOT NULL,
  "definition_snapshot" JSONB NOT NULL,
  "answers" JSONB NOT NULL,
  "customer_organization_id" TEXT,
  "customer_user_id" TEXT,
  "requester_user_id" TEXT,
  "requester_contact_id" TEXT,
  "created_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "crm_request_form_submissions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "crm_request_forms_tenant_id_slug_key"
  ON "crm_request_forms"("tenant_id", "slug");
CREATE UNIQUE INDEX "crm_request_forms_tenant_id_id_key"
  ON "crm_request_forms"("tenant_id", "id");
CREATE INDEX "crm_request_forms_tenant_id_status_updated_at_idx"
  ON "crm_request_forms"("tenant_id", "status", "updated_at");

CREATE UNIQUE INDEX "crm_request_form_submissions_tenant_id_id_key"
  ON "crm_request_form_submissions"("tenant_id", "id");
CREATE UNIQUE INDEX "crm_request_form_submissions_tenant_id_request_id_key"
  ON "crm_request_form_submissions"("tenant_id", "request_id");
CREATE INDEX "crm_request_form_submissions_tenant_id_form_id_created_at_idx"
  ON "crm_request_form_submissions"("tenant_id", "form_id", "created_at");
CREATE INDEX "crm_request_form_submissions_tenant_id_customer_organization_id_created_at_idx"
  ON "crm_request_form_submissions"("tenant_id", "customer_organization_id", "created_at");
CREATE INDEX "crm_request_form_submissions_tenant_id_customer_user_id_created_at_idx"
  ON "crm_request_form_submissions"("tenant_id", "customer_user_id", "created_at");

ALTER TABLE "crm_request_forms"
  ADD CONSTRAINT "crm_request_forms_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "crm_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "crm_request_form_submissions"
  ADD CONSTRAINT "crm_request_form_submissions_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "crm_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "crm_request_form_submissions"
  ADD CONSTRAINT "crm_request_form_submissions_tenant_id_form_id_fkey"
  FOREIGN KEY ("tenant_id", "form_id") REFERENCES "crm_request_forms"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "crm_request_form_submissions"
  ADD CONSTRAINT "crm_request_form_submissions_tenant_id_request_id_fkey"
  FOREIGN KEY ("tenant_id", "request_id") REFERENCES "crm_requests"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
