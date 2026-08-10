-- Contract stage of the address foundation.
--
-- Runs after the expand migration has backfilled every operational row and the
-- application reads and writes addresses exclusively through the relation. It
-- makes the relations required and removes the postal columns that were
-- duplicated onto each operational table.
--
-- This is the destructive step, so it asserts its preconditions first and
-- raises rather than dropping a column whose data has not been migrated.

DO $$
DECLARE
    offending INTEGER;
BEGIN
    SELECT count(*) INTO offending FROM "branches" WHERE "address_id" IS NULL;
    IF offending > 0 THEN
        RAISE EXCEPTION 'cannot contract: % branches have no address', offending;
    END IF;

    SELECT count(*) INTO offending FROM "warehouses" WHERE "address_id" IS NULL;
    IF offending > 0 THEN
        RAISE EXCEPTION 'cannot contract: % warehouses have no address', offending;
    END IF;

    SELECT count(*) INTO offending
      FROM "customer_addresses" WHERE "address_id" IS NULL OR "tenant_id" IS NULL;
    IF offending > 0 THEN
        RAISE EXCEPTION
            'cannot contract: % customer addresses have no address or tenant', offending;
    END IF;

    -- Every owner's address must exist and belong to the same tenant.
    SELECT count(*) INTO offending
      FROM "branches" b
      LEFT JOIN "addresses" a ON a."id" = b."address_id"
     WHERE a."id" IS NULL OR a."tenant_id" <> b."tenant_id";
    IF offending > 0 THEN
        RAISE EXCEPTION 'cannot contract: % branches have a missing or foreign address', offending;
    END IF;

    SELECT count(*) INTO offending
      FROM "warehouses" w
      LEFT JOIN "addresses" a ON a."id" = w."address_id"
     WHERE a."id" IS NULL OR a."tenant_id" <> w."tenant_id";
    IF offending > 0 THEN
        RAISE EXCEPTION 'cannot contract: % warehouses have a missing or foreign address', offending;
    END IF;

    SELECT count(*) INTO offending
      FROM "customer_addresses" ca
      LEFT JOIN "addresses" a ON a."id" = ca."address_id"
     WHERE a."id" IS NULL OR a."tenant_id" <> ca."tenant_id";
    IF offending > 0 THEN
        RAISE EXCEPTION
            'cannot contract: % customer addresses have a missing or foreign address', offending;
    END IF;

    -- A customer address must belong to the same tenant as its customer.
    SELECT count(*) INTO offending
      FROM "customer_addresses" ca
      JOIN "courier_customer_profiles" c ON c."id" = ca."customer_id"
     WHERE c."tenant_id" <> ca."tenant_id";
    IF offending > 0 THEN
        RAISE EXCEPTION
            'cannot contract: % customer addresses belong to another tenant than their customer',
            offending;
    END IF;

    -- The partial unique indexes below cannot be created over duplicate
    -- defaults, so report them as data to fix rather than as an index failure.
    SELECT count(*) INTO offending FROM (
        SELECT 1 FROM "branches" WHERE "is_default" GROUP BY "tenant_id" HAVING count(*) > 1
    ) AS duplicates;
    IF offending > 0 THEN
        RAISE EXCEPTION 'cannot contract: % tenants have more than one default branch', offending;
    END IF;

    SELECT count(*) INTO offending FROM (
        SELECT 1 FROM "warehouses" WHERE "is_primary" GROUP BY "tenant_id" HAVING count(*) > 1
    ) AS duplicates;
    IF offending > 0 THEN
        RAISE EXCEPTION 'cannot contract: % tenants have more than one primary warehouse', offending;
    END IF;

    SELECT count(*) INTO offending FROM (
        SELECT 1 FROM "customer_addresses" WHERE "is_default"
         GROUP BY "customer_id", "type" HAVING count(*) > 1
    ) AS duplicates;
    IF offending > 0 THEN
        RAISE EXCEPTION
            'cannot contract: % customer/role pairs have more than one default address', offending;
    END IF;
END $$;

-- Require the relations.
ALTER TABLE "branches" ALTER COLUMN "address_id" SET NOT NULL;
ALTER TABLE "warehouses" ALTER COLUMN "address_id" SET NOT NULL;
ALTER TABLE "customer_addresses" ALTER COLUMN "address_id" SET NOT NULL;
ALTER TABLE "customer_addresses" ALTER COLUMN "tenant_id" SET NOT NULL;

-- Tenant-scope the customer relation so a customer address can never reference
-- a profile in another tenant.
CREATE UNIQUE INDEX "courier_customer_profiles_id_tenant_id_key"
    ON "courier_customer_profiles"("id", "tenant_id");

ALTER TABLE "customer_addresses" DROP CONSTRAINT IF EXISTS "customer_addresses_customer_id_fkey";
ALTER TABLE "customer_addresses" ADD CONSTRAINT "customer_addresses_customer_id_tenant_id_fkey"
    FOREIGN KEY ("customer_id", "tenant_id")
    REFERENCES "courier_customer_profiles"("id", "tenant_id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- At most one default per scope. The service layer remains responsible for a
-- tenant with branches always having one.
CREATE UNIQUE INDEX "branches_one_default_per_tenant_idx"
    ON "branches"("tenant_id") WHERE "is_default";
CREATE UNIQUE INDEX "warehouses_one_primary_per_tenant_idx"
    ON "warehouses"("tenant_id") WHERE "is_primary";
CREATE UNIQUE INDEX "customer_addresses_one_default_per_type_idx"
    ON "customer_addresses"("customer_id", "type") WHERE "is_default";

-- Drop the duplicated postal columns. Their data now lives in `addresses`.
ALTER TABLE "branches"
    DROP COLUMN "street_1",
    DROP COLUMN "street_2",
    DROP COLUMN "city",
    DROP COLUMN "parish",
    DROP COLUMN "country";

ALTER TABLE "warehouses"
    DROP COLUMN "street_1",
    DROP COLUMN "street_2",
    DROP COLUMN "city",
    DROP COLUMN "state",
    DROP COLUMN "country",
    DROP COLUMN "postal_code";

ALTER TABLE "customer_addresses"
    DROP COLUMN "label",
    DROP COLUMN "street_1",
    DROP COLUMN "street_2",
    DROP COLUMN "city",
    DROP COLUMN "parish",
    DROP COLUMN "country",
    DROP COLUMN "postal_code";
