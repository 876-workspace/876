ALTER TABLE "billing_accounting_provider_connections"
  ADD COLUMN "oauth_state_hash" TEXT,
  ADD COLUMN "oauth_state_expires_at" INTEGER;
