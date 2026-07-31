-- Expand stage of the address foundation.
--
-- Introduces the tenant-owned `addresses` table and points branches, warehouses
-- and customer addresses at it. This migration is deliberately additive: every
-- legacy postal column is left in place so the deployed application keeps
-- working while it is rolled out. The contract migration drops them once all
-- reads and writes go through the relation.
--
-- Backfilled address ids carry the canonical `adr_` prefix (see
-- COURIERS_ID_PREFIXES) applied to the owning row's id, rather than being
-- generated randomly. The mapping is therefore reproducible, re-running cannot
-- create a second address for the same owner, the link-back is an exact id
-- match rather than a fuzzy match on name or street, and each backfilled row
-- records the owner it came from.

-- CreateEnum
CREATE TYPE "CustomerAddressType" AS ENUM ('HOME', 'WORK', 'DELIVERY', 'SHIPPING', 'BILLING', 'RETURN', 'OTHER');

-- CreateTable
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

CREATE UNIQUE INDEX "addresses_id_tenant_id_key" ON "addresses"("id", "tenant_id");
CREATE INDEX "addresses_tenant_id_idx" ON "addresses"("tenant_id");
CREATE INDEX "addresses_tenant_country_region_idx" ON "addresses"("tenant_id", "country_code", "region_code");

ALTER TABLE "addresses" ADD CONSTRAINT "addresses_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: nullable during expand so existing writes keep succeeding.
ALTER TABLE "branches" ADD COLUMN "address_id" TEXT;
ALTER TABLE "warehouses" ADD COLUMN "address_id" TEXT;
ALTER TABLE "customer_addresses" ADD COLUMN "address_id" TEXT;
ALTER TABLE "customer_addresses" ADD COLUMN "tenant_id" TEXT;
ALTER TABLE "customer_addresses" ADD COLUMN "type" "CustomerAddressType" NOT NULL DEFAULT 'DELIVERY';

-- Backfill: branches.
INSERT INTO "addresses" (
    "id", "tenant_id", "name", "line_1", "line_2", "city",
    "region_code", "region_name", "country_code", "postal_code",
    "is_active", "created_at", "updated_at"
)
SELECT
    'adr_' || b."id",
    b."tenant_id",
    b."name",
    b."street_1",
    b."street_2",
    b."city",
    NULL,
    NULLIF(btrim(COALESCE(b."parish", '')), ''),
    COALESCE(NULLIF(btrim(COALESCE(b."country", '')), ''), 'JM'),
    NULL,
    b."is_active",
    b."created_at",
    b."updated_at"
FROM "branches" b
WHERE b."address_id" IS NULL
ON CONFLICT ("id") DO NOTHING;

UPDATE "branches" b
SET "address_id" = 'adr_' || b."id"
WHERE b."address_id" IS NULL;

-- Backfill: warehouses.
INSERT INTO "addresses" (
    "id", "tenant_id", "name", "line_1", "line_2", "city",
    "region_code", "region_name", "country_code", "postal_code",
    "is_active", "created_at", "updated_at"
)
SELECT
    'adr_' || w."id",
    w."tenant_id",
    w."name",
    w."street_1",
    w."street_2",
    w."city",
    NULL,
    NULLIF(btrim(COALESCE(w."state", '')), ''),
    COALESCE(NULLIF(btrim(COALESCE(w."country", '')), ''), 'US'),
    w."postal_code",
    true,
    w."created_at",
    w."updated_at"
FROM "warehouses" w
WHERE w."address_id" IS NULL
ON CONFLICT ("id") DO NOTHING;

UPDATE "warehouses" w
SET "address_id" = 'adr_' || w."id"
WHERE w."address_id" IS NULL;

-- Backfill: customer addresses. The tenant is resolved through the owning
-- customer profile, which is the only place it exists before this migration.
INSERT INTO "addresses" (
    "id", "tenant_id", "name", "line_1", "line_2", "city",
    "region_code", "region_name", "country_code", "postal_code",
    "is_active", "created_at", "updated_at"
)
SELECT
    'adr_' || ca."id",
    c."tenant_id",
    COALESCE(NULLIF(btrim(COALESCE(ca."label", '')), ''), 'Address'),
    COALESCE(ca."street_1", ''),
    ca."street_2",
    COALESCE(ca."city", ''),
    NULL,
    NULLIF(btrim(COALESCE(ca."parish", '')), ''),
    COALESCE(NULLIF(btrim(COALESCE(ca."country", '')), ''), 'JM'),
    ca."postal_code",
    true,
    ca."created_at",
    ca."updated_at"
FROM "customer_addresses" ca
JOIN "courier_customer_profiles" c ON c."id" = ca."customer_id"
WHERE ca."address_id" IS NULL
ON CONFLICT ("id") DO NOTHING;

UPDATE "customer_addresses" ca
SET "address_id" = 'adr_' || ca."id",
    "tenant_id" = c."tenant_id"
FROM "courier_customer_profiles" c
WHERE c."id" = ca."customer_id"
  AND ca."address_id" IS NULL;

-- Guard: refuse to complete a partial backfill. A row that reached this point
-- without an address would silently lose its postal data at the contract stage.
DO $$
DECLARE
    orphaned INTEGER;
BEGIN
    SELECT count(*) INTO orphaned FROM "branches" WHERE "address_id" IS NULL;
    IF orphaned > 0 THEN
        RAISE EXCEPTION 'address backfill incomplete: % branches have no address', orphaned;
    END IF;

    SELECT count(*) INTO orphaned FROM "warehouses" WHERE "address_id" IS NULL;
    IF orphaned > 0 THEN
        RAISE EXCEPTION 'address backfill incomplete: % warehouses have no address', orphaned;
    END IF;

    SELECT count(*) INTO orphaned
      FROM "customer_addresses" WHERE "address_id" IS NULL OR "tenant_id" IS NULL;
    IF orphaned > 0 THEN
        RAISE EXCEPTION
            'address backfill incomplete: % customer addresses have no address or tenant', orphaned;
    END IF;

    -- An owner must never point at another tenant's address.
    SELECT count(*) INTO orphaned
      FROM "branches" b JOIN "addresses" a ON a."id" = b."address_id"
     WHERE a."tenant_id" <> b."tenant_id";
    IF orphaned > 0 THEN
        RAISE EXCEPTION 'address backfill corrupt: % branches reference another tenant', orphaned;
    END IF;

    SELECT count(*) INTO orphaned
      FROM "warehouses" w JOIN "addresses" a ON a."id" = w."address_id"
     WHERE a."tenant_id" <> w."tenant_id";
    IF orphaned > 0 THEN
        RAISE EXCEPTION 'address backfill corrupt: % warehouses reference another tenant', orphaned;
    END IF;

    SELECT count(*) INTO orphaned
      FROM "customer_addresses" ca JOIN "addresses" a ON a."id" = ca."address_id"
     WHERE a."tenant_id" <> ca."tenant_id";
    IF orphaned > 0 THEN
        RAISE EXCEPTION 'address backfill corrupt: % customer addresses reference another tenant', orphaned;
    END IF;
END $$;

-- Constraints are added after the backfill so the data they guard already holds.
CREATE UNIQUE INDEX "branches_address_id_key" ON "branches"("address_id");
CREATE UNIQUE INDEX "warehouses_address_id_key" ON "warehouses"("address_id");
CREATE UNIQUE INDEX "customer_addresses_customer_address_type_key"
    ON "customer_addresses"("customer_id", "address_id", "type");
CREATE INDEX "customer_addresses_tenant_id_idx" ON "customer_addresses"("tenant_id");
CREATE INDEX "customer_addresses_address_id_idx" ON "customer_addresses"("address_id");

ALTER TABLE "branches" ADD CONSTRAINT "branches_address_id_tenant_id_fkey"
    FOREIGN KEY ("address_id", "tenant_id") REFERENCES "addresses"("id", "tenant_id")
    ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_address_id_tenant_id_fkey"
    FOREIGN KEY ("address_id", "tenant_id") REFERENCES "addresses"("id", "tenant_id")
    ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "customer_addresses" ADD CONSTRAINT "customer_addresses_address_id_tenant_id_fkey"
    FOREIGN KEY ("address_id", "tenant_id") REFERENCES "addresses"("id", "tenant_id")
    ON DELETE NO ACTION ON UPDATE CASCADE;
