-- 876 Projects phase 16: external platform (integration clients, webhooks, imports).

CREATE TABLE "projects_integration_clients" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "scopes" TEXT[] NOT NULL DEFAULT '{}',
    "secret_hash" TEXT NOT NULL,
    "key_prefix" TEXT NOT NULL,
    "last_used_at" BIGINT,
    "revoked_at" BIGINT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    CONSTRAINT "projects_integration_clients_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "projects_iclients_tenant_idx" ON "projects_integration_clients"("tenant_id");
CREATE INDEX "projects_iclients_org_idx" ON "projects_integration_clients"("organization_id");

ALTER TABLE "projects_integration_clients" ADD CONSTRAINT "projects_iclients_tenant_fk"
    FOREIGN KEY ("tenant_id") REFERENCES "projects_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "projects_webhook_endpoints" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "event_types" TEXT[] NOT NULL DEFAULT '{}',
    "secret" JSONB NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "consecutive_failures" INTEGER NOT NULL DEFAULT 0,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    CONSTRAINT "projects_webhook_endpoints_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "projects_whep_tenant_enabled_idx" ON "projects_webhook_endpoints"("tenant_id", "enabled");

ALTER TABLE "projects_webhook_endpoints" ADD CONSTRAINT "projects_whep_tenant_fk"
    FOREIGN KEY ("tenant_id") REFERENCES "projects_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "projects_webhook_deliveries" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "endpoint_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "attempt" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "response_code" INTEGER,
    "error_code" TEXT,
    "next_attempt_at" BIGINT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    CONSTRAINT "projects_webhook_deliveries_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "projects_whdl_endpoint_event_uidx" UNIQUE ("endpoint_id", "event_id")
);

CREATE INDEX "projects_whdl_tenant_status_idx" ON "projects_webhook_deliveries"("tenant_id", "status", "next_attempt_at");

ALTER TABLE "projects_webhook_deliveries" ADD CONSTRAINT "projects_whdl_tenant_fk"
    FOREIGN KEY ("tenant_id") REFERENCES "projects_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "projects_webhook_deliveries" ADD CONSTRAINT "projects_whdl_endpoint_fk"
    FOREIGN KEY ("endpoint_id") REFERENCES "projects_webhook_endpoints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "projects_import_jobs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "project_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'preview',
    "row_count" INTEGER NOT NULL DEFAULT 0,
    "success_count" INTEGER NOT NULL DEFAULT 0,
    "failure_count" INTEGER NOT NULL DEFAULT 0,
    "content_hash" TEXT NOT NULL,
    "bundle" JSONB NOT NULL DEFAULT '{}',
    "preview" JSONB NOT NULL DEFAULT '{}',
    "unmapped_fields" JSONB NOT NULL DEFAULT '[]',
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    CONSTRAINT "projects_import_jobs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "projects_impj_tenant_status_idx" ON "projects_import_jobs"("tenant_id", "status");

ALTER TABLE "projects_import_jobs" ADD CONSTRAINT "projects_impj_tenant_fk"
    FOREIGN KEY ("tenant_id") REFERENCES "projects_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "projects_import_job_rows" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "row_index" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "external_ref" TEXT,
    "created_id" TEXT,
    "error" JSONB,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    CONSTRAINT "projects_import_job_rows_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "projects_impr_job_row_uidx" UNIQUE ("job_id", "row_index")
);

CREATE INDEX "projects_impr_job_status_idx" ON "projects_import_job_rows"("job_id", "status");

ALTER TABLE "projects_import_job_rows" ADD CONSTRAINT "projects_impr_tenant_fk"
    FOREIGN KEY ("tenant_id") REFERENCES "projects_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "projects_import_job_rows" ADD CONSTRAINT "projects_impr_job_fk"
    FOREIGN KEY ("job_id") REFERENCES "projects_import_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
