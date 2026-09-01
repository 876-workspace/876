-- Keep the persisted provider catalog aligned with the implemented adapter.
-- Inbound Zoho Books webhooks are deliberately deferred from the minimal
-- accounting-provider release; synchronization uses the durable outbox and
-- explicit reconciliation instead.
UPDATE "billing_accounting_providers"
SET
  "capabilities" = jsonb_set("capabilities", '{webhooks}', 'false'::jsonb, true),
  "updated_at" = EXTRACT(EPOCH FROM NOW())::INTEGER
WHERE "key" = 'zoho-books';
