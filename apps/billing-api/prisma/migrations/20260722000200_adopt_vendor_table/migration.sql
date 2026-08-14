-- Bridge the final Alembic-owned Billing change into Prisma's migration
-- ledger. Production may already contain this table, so every statement is
-- intentionally idempotent; fresh databases still receive the full model.
DO $$
BEGIN
  CREATE TYPE "BillingVendorStatus" AS ENUM ('ACTIVE', 'ARCHIVED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "billing_vendors" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "external_reference" TEXT,
  "name" TEXT NOT NULL,
  "email" TEXT,
  "phone" TEXT,
  "billing_address" JSONB,
  "metadata" JSONB,
  "default_currency" TEXT,
  "status" "BillingVendorStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  CONSTRAINT "billing_vendors_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_vendors_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "billing_tenants"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "billing_vendors_external_reference_idx"
  ON "billing_vendors"("external_reference");
CREATE INDEX IF NOT EXISTS "billing_vendors_tenant_id_idx"
  ON "billing_vendors"("tenant_id");
CREATE UNIQUE INDEX IF NOT EXISTS "billing_vendors_tenant_id_external_reference_key"
  ON "billing_vendors"("tenant_id", "external_reference");
