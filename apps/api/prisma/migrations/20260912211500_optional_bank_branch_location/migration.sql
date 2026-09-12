BEGIN;

-- Routing/transit identity is authoritative reference data even when a trusted
-- physical/geocoded branch location has not yet been loaded. Jamaica's APL ACH
-- catalog publishes routing data independently of Core's structured location
-- model, so requiring an address would make a fresh financial-directory seed
-- incomplete or force invented coordinates.
ALTER TABLE "bank_branches"
  ALTER COLUMN "address_id" DROP NOT NULL;

COMMIT;
