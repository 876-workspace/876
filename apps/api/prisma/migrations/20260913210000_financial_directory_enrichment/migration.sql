BEGIN;

-- Public contact, classification and provenance enrichment for the financial
-- directory.
--
-- Every column is additive and nullable. Existing ACH routing rows keep working
-- without enrichment, and a null status/branch type means "not verified yet"
-- rather than a fabricated value. `last_verified_at` is set only when a human
-- verified the record against the cited `source_url`.

ALTER TABLE "banks"
  ADD COLUMN "general_phone" VARCHAR,
  ADD COLUMN "support_phone" VARCHAR,
  ADD COLUMN "support_email" VARCHAR,
  ADD COLUMN "complaints_email" VARCHAR,
  ADD COLUMN "contact_url" VARCHAR,
  ADD COLUMN "source_url" VARCHAR,
  ADD COLUMN "source_as_of" VARCHAR(10),
  ADD COLUMN "last_verified_at" BIGINT;

ALTER TABLE "bank_branches"
  ADD COLUMN "raw_address" VARCHAR,
  ADD COLUMN "branch_type" VARCHAR,
  ADD COLUMN "status" VARCHAR,
  ADD COLUMN "source_url" VARCHAR,
  ADD COLUMN "source_as_of" VARCHAR(10),
  ADD COLUMN "last_verified_at" BIGINT;

ALTER TABLE "credit_unions"
  ADD COLUMN "code" VARCHAR,
  ADD COLUMN "website" VARCHAR,
  ADD COLUMN "general_phone" VARCHAR,
  ADD COLUMN "support_phone" VARCHAR,
  ADD COLUMN "support_email" VARCHAR,
  ADD COLUMN "complaints_email" VARCHAR,
  ADD COLUMN "contact_url" VARCHAR,
  ADD COLUMN "source_url" VARCHAR,
  ADD COLUMN "source_as_of" VARCHAR(10),
  ADD COLUMN "last_verified_at" BIGINT;

ALTER TABLE "credit_union_branches"
  ADD COLUMN "code" VARCHAR,
  ADD COLUMN "raw_address" VARCHAR,
  ADD COLUMN "branch_type" VARCHAR,
  ADD COLUMN "status" VARCHAR,
  ADD COLUMN "operating_hours" VARCHAR,
  ADD COLUMN "source_url" VARCHAR,
  ADD COLUMN "source_as_of" VARCHAR(10),
  ADD COLUMN "last_verified_at" BIGINT;

-- The seed upserts credit unions and their branches by these slugs. Nullable
-- keeps the change additive for any row created before the column existed.
CREATE UNIQUE INDEX "credit_unions_code_key"
  ON "credit_unions"("code");

CREATE UNIQUE INDEX "credit_union_branches_code_key"
  ON "credit_union_branches"("code");

-- A verified street address can be stored before trusted geocoding exists.
-- Requiring coordinates would force an invented location or drop the address.
ALTER TABLE "directory_addresses"
  ALTER COLUMN "latitude" DROP NOT NULL,
  ALTER COLUMN "longitude" DROP NOT NULL;

ALTER TABLE "credit_union_branches"
  ALTER COLUMN "address_id" DROP NOT NULL;

COMMIT;
