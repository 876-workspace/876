-- A workspace whose owning 876 organization was deleted keeps its financial
-- history — invoices, payments, and ledger entries are records we are obliged
-- to retain — so deletion is recorded as a tombstone and the workspace is
-- suspended, never dropped. Idempotent: production may already carry these.
ALTER TABLE "billing_tenants"
  ADD COLUMN IF NOT EXISTS "deleted_at" INTEGER,
  ADD COLUMN IF NOT EXISTS "deleted_by" TEXT,
  ADD COLUMN IF NOT EXISTS "deletion_reason" TEXT;

