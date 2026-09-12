BEGIN;

-- Opaque Core financial-directory identifiers. Billing intentionally does not
-- create cross-database foreign keys to the Core API datastore.
ALTER TABLE "billing_bank_accounts"
  ADD COLUMN "directory_bank_id" VARCHAR(255),
  ADD COLUMN "directory_branch_id" VARCHAR(255);

CREATE INDEX "billing_bank_accounts_directory_bank_id_idx"
  ON "billing_bank_accounts"("directory_bank_id");

CREATE INDEX "billing_bank_accounts_directory_branch_id_idx"
  ON "billing_bank_accounts"("directory_branch_id");

COMMIT;
