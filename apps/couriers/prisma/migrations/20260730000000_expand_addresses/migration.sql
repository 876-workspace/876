-- CreateEnum
CREATE TYPE "CustomerAddressType" AS ENUM ('HOME', 'WORK', 'DELIVERY', 'SHIPPING', 'BILLING', 'RETURN', 'OTHER');

-- CreateTable addresses
CREATE TABLE "addresses" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "line_1" TEXT NOT NULL,
    "line_2" TEXT,
    "city" TEXT NOT NULL,
    "region_code" TEXT,
    "region_name" TEXT,
    "country_code" TEXT NOT NULL DEFAULT 'JM',
    "postal_code" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,

    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

-- Add address_id to branches (nullable for expand)
ALTER TABLE "branches" ADD COLUMN "address_id" TEXT;
-- Add address_id to warehouses (nullable for expand)
ALTER TABLE "warehouses" ADD COLUMN "address_id" TEXT;
-- Add columns to customer_addresses (nullable for expand)
ALTER TABLE "customer_addresses" ADD COLUMN IF NOT EXISTS "address_id" TEXT;
ALTER TABLE "customer_addresses" ADD COLUMN IF NOT EXISTS "tenant_id" TEXT;
ALTER TABLE "customer_addresses" ADD COLUMN IF NOT EXISTS "type" "CustomerAddressType" NOT NULL DEFAULT 'DELIVERY';

-- Create unique constraints and indices for addresses
CREATE UNIQUE INDEX "addresses_id_tenant_id_key" ON "addresses"("id", "tenant_id");
CREATE INDEX "addresses_tenant_id_idx" ON "addresses"("tenant_id");
CREATE INDEX "addresses_tenant_country_region_idx" ON "addresses"("tenant_id", "country_code", "region_code");

-- Create constraints and indices for branch, warehouse, customer addresses
CREATE UNIQUE INDEX "branches_address_id_key" ON "branches"("address_id");
CREATE UNIQUE INDEX "warehouses_address_id_key" ON "warehouses"("address_id");
CREATE UNIQUE INDEX "customer_addresses_customer_address_type_key" ON "customer_addresses"("customer_id", "address_id", "type");
CREATE INDEX "customer_addresses_tenant_id_idx" ON "customer_addresses"("tenant_id");
CREATE INDEX "customer_addresses_address_id_idx" ON "customer_addresses"("address_id");

-- Add Foreign Keys
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "branches" ADD CONSTRAINT "branches_address_id_tenant_id_fkey" FOREIGN KEY ("address_id", "tenant_id") REFERENCES "addresses"("id", "tenant_id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_address_id_tenant_id_fkey" FOREIGN KEY ("address_id", "tenant_id") REFERENCES "addresses"("id", "tenant_id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "customer_addresses" ADD CONSTRAINT "customer_addresses_address_id_tenant_id_fkey" FOREIGN KEY ("address_id", "tenant_id") REFERENCES "addresses"("id", "tenant_id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- Backfill logic
-- 1. Insert Branch addresses
INSERT INTO "addresses" (
    "id", "tenant_id", "name", "line_1", "line_2", "city", 
    "region_code", "region_name", "country_code", "postal_code",
    "is_active", "created_at", "updated_at"
)
SELECT 
    'cuid_b_' || substr(md5(random()::text), 1, 15), "tenant_id", "name", "street_1", "street_2", "city", 
    NULL, "parish", "country", NULL,
    "is_active", "created_at", "updated_at"
FROM "branches" WHERE "address_id" IS NULL;

-- 2. Link Branch addresses back
UPDATE "branches" b
SET "address_id" = a."id"
FROM "addresses" a
WHERE a."tenant_id" = b."tenant_id" AND a."name" = b."name" AND b."address_id" IS NULL;

-- 3. Insert Warehouse addresses
INSERT INTO "addresses" (
    "id", "tenant_id", "name", "line_1", "line_2", "city", 
    "region_code", "region_name", "country_code", "postal_code",
    "is_active", "created_at", "updated_at"
)
SELECT 
    'cuid_w_' || substr(md5(random()::text), 1, 15), "tenant_id", "name", "street_1", "street_2", "city", 
    NULL, "state", "country", "postal_code",
    true, "created_at", "updated_at"
FROM "warehouses" WHERE "address_id" IS NULL;

-- 4. Link Warehouse addresses back
UPDATE "warehouses" w
SET "address_id" = a."id"
FROM "addresses" a
WHERE a."tenant_id" = w."tenant_id" AND a."name" = w."name" AND w."address_id" IS NULL;

-- 5. Insert Customer addresses
INSERT INTO "addresses" (
    "id", "tenant_id", "name", "line_1", "line_2", "city", 
    "region_code", "region_name", "country_code", "postal_code",
    "is_active", "created_at", "updated_at"
)
SELECT 
    'cuid_c_' || substr(md5(random()::text), 1, 15), c."tenant_id", 
    COALESCE(ca."label", 'Delivery Address'), ca."street_1", ca."street_2", ca."city", 
    NULL, ca."parish", COALESCE(ca."country", 'JM'), ca."postal_code",
    true, ca."created_at", ca."updated_at"
FROM "customer_addresses" ca
JOIN "courier_customer_profiles" c ON c."id" = ca."customer_id"
WHERE ca."address_id" IS NULL;

-- 6. Link Customer addresses back and set tenant_id
UPDATE "customer_addresses" ca
SET 
    "address_id" = a."id",
    "tenant_id" = c."tenant_id"
FROM "addresses" a
JOIN "courier_customer_profiles" c ON c."tenant_id" = a."tenant_id"
WHERE a."line_1" = ca."street_1" 
AND c."id" = ca."customer_id"
AND ca."address_id" IS NULL;
