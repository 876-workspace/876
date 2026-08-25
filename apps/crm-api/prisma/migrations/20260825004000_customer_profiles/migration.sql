CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'SUSPENDED');
CREATE TYPE "CustomerProfileStatus" AS ENUM ('ACTIVE', 'INACTIVE');

CREATE TABLE "crm_tenants" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "crm_tenants_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "crm_tenants_organization_id_key"
  ON "crm_tenants"("organization_id");

CREATE TABLE "crm_customer_profiles" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "billing_customer_id" TEXT NOT NULL,
  "owner_id" TEXT,
  "status" "CustomerProfileStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  "deleted_by" TEXT,
  "deletion_reason" TEXT,
  CONSTRAINT "crm_customer_profiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "crm_customer_profiles_tenant_id_billing_customer_id_key"
  ON "crm_customer_profiles"("tenant_id", "billing_customer_id");
CREATE INDEX "crm_customer_profiles_tenant_id_status_created_at_idx"
  ON "crm_customer_profiles"("tenant_id", "status", "created_at");
CREATE INDEX "crm_customer_profiles_owner_id_idx"
  ON "crm_customer_profiles"("owner_id");

ALTER TABLE "crm_customer_profiles"
  ADD CONSTRAINT "crm_customer_profiles_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "crm_tenants"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
