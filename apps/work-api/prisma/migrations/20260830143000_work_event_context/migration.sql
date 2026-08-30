-- Context is an opaque host-service reference, never a cross-database FK.
ALTER TABLE "work_events"
  ADD COLUMN "context_service" TEXT,
  ADD COLUMN "context_resource" TEXT,
  ADD COLUMN "context_id" TEXT,
  ADD CONSTRAINT "work_events_context_tuple_check" CHECK (
    ("context_service" IS NULL AND "context_resource" IS NULL AND "context_id" IS NULL)
    OR
    ("context_service" IS NOT NULL AND "context_resource" IS NOT NULL AND "context_id" IS NOT NULL)
  );

CREATE INDEX "work_events_tenant_context_start_idx"
  ON "work_events"("tenant_id", "context_service", "context_resource", "context_id", "start_at");
