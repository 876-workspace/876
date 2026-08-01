-- Link Couriers' operational sites to the canonical core organization-location
-- registry. These remain nullable while the mirror catches up after deploy.
ALTER TABLE "branches" ADD COLUMN "org_location_id" TEXT;
ALTER TABLE "warehouses" ADD COLUMN "org_location_id" TEXT;

CREATE UNIQUE INDEX "branches_org_location_id_key"
    ON "branches"("org_location_id");
CREATE UNIQUE INDEX "warehouses_org_location_id_key"
    ON "warehouses"("org_location_id");
