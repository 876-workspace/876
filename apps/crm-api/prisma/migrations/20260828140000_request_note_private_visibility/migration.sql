ALTER TABLE "crm_request_notes"
  ADD COLUMN "private_to_user_id" TEXT;

CREATE INDEX "crm_request_notes_tenant_id_private_to_user_id_created_at_idx"
  ON "crm_request_notes"("tenant_id", "private_to_user_id", "created_at");
