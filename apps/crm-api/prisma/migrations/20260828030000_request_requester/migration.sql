-- A request records who raised it, inside the customer party.
--
-- `customer_id` says which party the request belongs to; for a
-- CORE_ORGANIZATION customer that party is a whole company, so it cannot say
-- which person actually made contact. These two columns carry that.
--
-- Both are opaque ids owned by other bounded contexts — 876 identity and the
-- org-customer registry — so neither gets a foreign key. Null means the request
-- was raised for the organization as a whole rather than by a named person,
-- which is the correct state for a request an operator opens on an org's behalf.
ALTER TABLE "crm_requests"
  ADD COLUMN "requester_user_id" TEXT,
  ADD COLUMN "requester_contact_id" TEXT;

CREATE INDEX "crm_requests_tenant_id_requester_user_id_created_at_idx"
  ON "crm_requests" ("tenant_id", "requester_user_id", "created_at");
