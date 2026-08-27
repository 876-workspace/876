ALTER TABLE "crm_requests"
  ADD COLUMN "team_id" TEXT;

CREATE INDEX "crm_requests_tenant_id_team_id_status_idx"
  ON "crm_requests"("tenant_id", "team_id", "status");
