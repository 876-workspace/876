-- Phase 6 hardening: serialize sync runs and preserve remote read-only semantics.

CREATE TYPE "WorkSyncDirection" AS ENUM ('BIDIRECTIONAL', 'PULL_ONLY');

ALTER TABLE "work_sync_connections"
  ADD COLUMN "sync_lease_token" TEXT,
  ADD COLUMN "sync_lease_expires_at" TIMESTAMP(3),
  ADD COLUMN "sync_lease_heartbeat_at" TIMESTAMP(3);

CREATE INDEX "work_sync_connections_status_sync_lease_expires_at_idx"
  ON "work_sync_connections"("status", "sync_lease_expires_at");

ALTER TABLE "work_sync_mappings"
  ADD COLUMN "sync_direction" "WorkSyncDirection" NOT NULL DEFAULT 'BIDIRECTIONAL';
