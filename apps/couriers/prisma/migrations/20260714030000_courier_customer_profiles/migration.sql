-- Rename the operational Courier enrollment record so it cannot be confused
-- with the shared Billing customer. PostgreSQL preserves all referencing FKs.
ALTER TABLE "customers" RENAME TO "courier_customer_profiles";

ALTER TABLE "courier_customer_profiles"
  ADD COLUMN "billing_customer_id" TEXT;

ALTER TABLE "courier_customer_profiles"
  RENAME CONSTRAINT "customers_pkey"
  TO "courier_customer_profiles_pkey";

ALTER TABLE "courier_customer_profiles"
  RENAME CONSTRAINT "customers_tenant_id_fkey"
  TO "courier_customer_profiles_tenant_id_fkey";

ALTER TABLE "courier_customer_profiles"
  RENAME CONSTRAINT "customers_branch_id_fkey"
  TO "courier_customer_profiles_branch_id_fkey";

ALTER INDEX "customers_tenant_id_user_id_key"
  RENAME TO "courier_customer_profiles_tenant_user_key";

ALTER INDEX "customers_user_id_idx"
  RENAME TO "courier_customer_profiles_user_id_idx";

ALTER INDEX "customers_branch_id_idx"
  RENAME TO "courier_customer_profiles_branch_id_idx";

CREATE UNIQUE INDEX "courier_customer_profiles_tenant_billing_customer_key"
  ON "courier_customer_profiles"("tenant_id", "billing_customer_id");
