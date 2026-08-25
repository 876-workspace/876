CREATE TYPE "CustomerProfileStatus" AS ENUM ('ACTIVE', 'INACTIVE');

CREATE TABLE "crm_customer_profiles" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
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

CREATE UNIQUE INDEX "crm_customer_profiles_organization_id_billing_customer_id_key"
  ON "crm_customer_profiles"("organization_id", "billing_customer_id");
CREATE INDEX "crm_customer_profiles_organization_id_status_created_at_idx"
  ON "crm_customer_profiles"("organization_id", "status", "created_at");
CREATE INDEX "crm_customer_profiles_owner_id_idx"
  ON "crm_customer_profiles"("owner_id");
