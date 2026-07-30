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

