ALTER TABLE "crm_tenants"
  ADD COLUMN "next_request_number" INTEGER NOT NULL DEFAULT 1;

CREATE UNIQUE INDEX "crm_customer_profiles_tenant_id_id_key"
  ON "crm_customer_profiles"("tenant_id", "id");

CREATE TYPE "RequestStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'WAITING', 'RESOLVED', 'CLOSED', 'CANCELLED');
CREATE TYPE "RequestPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
CREATE TYPE "RequestCategory" AS ENUM ('GENERAL', 'SUPPORT', 'BILLING', 'SALES', 'COMPLAINT', 'FEEDBACK', 'OTHER');
CREATE TYPE "RequestSource" AS ENUM ('CRM', 'EMAIL', 'PHONE', 'CHAT', 'WEB', 'API', 'OTHER');

CREATE TABLE "crm_requests" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "customer_id" TEXT NOT NULL,
  "number" INTEGER NOT NULL,
  "subject" TEXT NOT NULL,
  "description" TEXT,
  "category" "RequestCategory" NOT NULL DEFAULT 'GENERAL',
  "status" "RequestStatus" NOT NULL DEFAULT 'OPEN',
  "priority" "RequestPriority" NOT NULL DEFAULT 'NORMAL',
  "source" "RequestSource" NOT NULL DEFAULT 'CRM',
  "assignee_id" TEXT,
  "created_by" TEXT NOT NULL,
  "resolved_at" TIMESTAMP(3),
  "closed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  "deleted_by" TEXT,
  "deletion_reason" TEXT,
  CONSTRAINT "crm_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "crm_request_notes" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "request_id" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "author_id" TEXT NOT NULL,
  "internal" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  "deleted_by" TEXT,
  CONSTRAINT "crm_request_notes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "crm_requests_tenant_id_number_key"
  ON "crm_requests"("tenant_id", "number");
CREATE UNIQUE INDEX "crm_requests_tenant_id_id_key"
  ON "crm_requests"("tenant_id", "id");
CREATE INDEX "crm_requests_tenant_id_status_created_at_idx"
  ON "crm_requests"("tenant_id", "status", "created_at");
CREATE INDEX "crm_requests_tenant_id_customer_id_created_at_idx"
  ON "crm_requests"("tenant_id", "customer_id", "created_at");
CREATE INDEX "crm_requests_tenant_id_assignee_id_status_idx"
  ON "crm_requests"("tenant_id", "assignee_id", "status");
CREATE INDEX "crm_request_notes_tenant_id_request_id_created_at_idx"
  ON "crm_request_notes"("tenant_id", "request_id", "created_at");
CREATE INDEX "crm_request_notes_tenant_id_author_id_created_at_idx"
  ON "crm_request_notes"("tenant_id", "author_id", "created_at");

ALTER TABLE "crm_requests"
  ADD CONSTRAINT "crm_requests_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "crm_tenants"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "crm_requests"
  ADD CONSTRAINT "crm_requests_tenant_id_customer_id_fkey"
  FOREIGN KEY ("tenant_id", "customer_id")
  REFERENCES "crm_customer_profiles"("tenant_id", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "crm_request_notes"
  ADD CONSTRAINT "crm_request_notes_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "crm_tenants"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "crm_request_notes"
  ADD CONSTRAINT "crm_request_notes_tenant_id_request_id_fkey"
  FOREIGN KEY ("tenant_id", "request_id")
  REFERENCES "crm_requests"("tenant_id", "id")
  ON DELETE CASCADE ON UPDATE CASCADE;
