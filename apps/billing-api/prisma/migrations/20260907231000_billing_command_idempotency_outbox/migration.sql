CREATE TABLE "billing_command_idempotency_keys" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "operation" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "request_hash" TEXT NOT NULL,
  "resource_type" TEXT,
  "resource_id" TEXT,
  "http_status" INTEGER,
  "created_at" INTEGER NOT NULL,
  "expires_at" INTEGER,

  CONSTRAINT "billing_command_idempotency_keys_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_command_idempotency_keys_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "billing_tenants"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "billing_command_idempotency_keys_tenant_operation_key"
  ON "billing_command_idempotency_keys"("tenant_id", "operation", "key");
CREATE INDEX "billing_command_idempotency_keys_tenant_created_idx"
  ON "billing_command_idempotency_keys"("tenant_id", "created_at");
CREATE INDEX "billing_command_idempotency_keys_expires_idx"
  ON "billing_command_idempotency_keys"("expires_at");

CREATE TABLE "billing_outbox_events" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "resource_type" TEXT NOT NULL,
  "resource_id" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "occurred_at" INTEGER NOT NULL,
  "published_at" INTEGER,
  "attempt_count" INTEGER NOT NULL DEFAULT 0,
  "last_error" TEXT,

  CONSTRAINT "billing_outbox_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_outbox_events_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "billing_tenants"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_outbox_events_version_check" CHECK ("version" > 0),
  CONSTRAINT "billing_outbox_events_attempt_count_check" CHECK ("attempt_count" >= 0)
);

CREATE INDEX "billing_outbox_events_tenant_occurred_idx"
  ON "billing_outbox_events"("tenant_id", "occurred_at");
CREATE INDEX "billing_outbox_events_publish_idx"
  ON "billing_outbox_events"("published_at", "occurred_at");
