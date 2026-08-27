-- Snapshot of the linked 876 account's picture, refreshed by the Core customer
-- sync alongside the contact's name and email. Null for a hand-entered contact.
ALTER TABLE "billing_contacts"
  ADD COLUMN IF NOT EXISTS "avatar" TEXT;
