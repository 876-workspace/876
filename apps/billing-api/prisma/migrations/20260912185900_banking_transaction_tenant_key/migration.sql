-- New Banking evidence tables use tenant-scoped composite foreign keys to
-- canonical booked cash. BankTransaction ids are globally unique already, but
-- Postgres requires an explicit unique key on the referenced column pair.

CREATE UNIQUE INDEX "billing_bank_transactions_tenant_id_id_key"
  ON "billing_bank_transactions" ("tenant_id", "id");
