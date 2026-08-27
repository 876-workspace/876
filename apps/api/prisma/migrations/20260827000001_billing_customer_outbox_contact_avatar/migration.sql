-- Carry the primary contact's 876 account picture alongside the name, email,
-- and phone the customer.ensure snapshot already ships, so Billing (and the
-- CRM reading through it) can show the person's face without a live lookup
-- into an organization the calling app has no permission to read.
ALTER TABLE "billing_customer_outbox"
  ADD COLUMN IF NOT EXISTS "contact_avatar" VARCHAR;
