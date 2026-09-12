BEGIN;

-- Existing financial-directory records predate country scoping and were
-- Jamaica-specific. Refuse to manufacture a dangling country reference if an
-- environment has bank data but has not loaded the Core geo catalog.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "banks" LIMIT 1)
     AND NOT EXISTS (SELECT 1 FROM "countries" WHERE "code" = 'JM') THEN
    RAISE EXCEPTION
      'Cannot backfill existing banks to JM because the Jamaica country reference is missing. Run the Core geo seed first.';
  END IF;
END $$;

ALTER TABLE "banks"
  ADD COLUMN "country_code" VARCHAR(2),
  ADD COLUMN "clearing_system" VARCHAR,
  ADD COLUMN "institution_type" VARCHAR NOT NULL DEFAULT 'commercial_bank';

-- Historical directory data was explicitly Jamaica-oriented before this
-- migration. New records must always supply their country through the API.
UPDATE "banks"
SET "country_code" = 'JM'
WHERE "country_code" IS NULL;

ALTER TABLE "banks"
  ALTER COLUMN "country_code" SET NOT NULL;

DROP INDEX IF EXISTS "banks_bank_code_key";

CREATE UNIQUE INDEX "banks_country_code_bank_code_key"
  ON "banks"("country_code", "bank_code");

CREATE INDEX "ix_banks_country_name"
  ON "banks"("country_code", "name");

ALTER TABLE "banks"
  ADD CONSTRAINT "banks_country_code_fkey"
  FOREIGN KEY ("country_code") REFERENCES "countries"("code")
  ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;
