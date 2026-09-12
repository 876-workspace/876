-- Full bank account numbers are Tier 2 data (billing-data-plane rule): they are
-- stored only as a sealed ciphertext, never as plaintext. Additive and nullable.
ALTER TABLE "billing_bank_accounts"
  ADD COLUMN IF NOT EXISTS "account_number_ciphertext" TEXT,
  ADD COLUMN IF NOT EXISTS "account_number_key_id" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "account_number_provider" VARCHAR(40);
