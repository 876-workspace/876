ALTER TABLE "crm_requests"
  ADD COLUMN "related_resource_type" text NULL,
  ADD COLUMN "related_resource_id" text NULL,
  ADD COLUMN "related_resource_snapshot" jsonb NULL,
  ADD COLUMN "source_app" text NULL;

CREATE INDEX "crm_requests_tenant_id_related_resource_type_related_resource_id_idx"
  ON "crm_requests" ("tenant_id", "related_resource_type", "related_resource_id");
