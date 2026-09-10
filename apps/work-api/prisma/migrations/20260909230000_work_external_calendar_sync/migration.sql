-- Phase 6: external calendar synchronization.
-- Additive only. Existing connection-level sync_cursor remains for compatibility;
-- active provider cursors are stored on calendar mappings because Google sync
-- tokens, Microsoft delta links, and CalDAV sync tokens are collection scoped.

ALTER TABLE "work_sync_connections"
  ADD COLUMN "oauth_state_hash" TEXT,
  ADD COLUMN "oauth_state_expires_at" TIMESTAMP(3);

CREATE TABLE "work_sync_credentials" (
  "id" TEXT NOT NULL,
  "connection_id" TEXT NOT NULL,
  "sealed_secret" TEXT NOT NULL,
  "key_id" TEXT,
  "vault_provider" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "work_sync_credentials_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "work_sync_credentials_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "work_sync_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "work_sync_credentials_connection_id_key" ON "work_sync_credentials"("connection_id");

DROP INDEX "work_sync_mappings_connection_resource_local_key";
DROP INDEX "work_sync_mappings_connection_resource_remote_key";

ALTER TABLE "work_sync_mappings"
  ADD COLUMN "parent_mapping_id" TEXT,
  ADD COLUMN "sync_cursor" TEXT,
  ADD COLUMN "sync_window_start" TIMESTAMP(3),
  ADD COLUMN "sync_window_end" TIMESTAMP(3),
  ADD COLUMN "last_error_code" TEXT,
  ADD CONSTRAINT "work_sync_mappings_parent_mapping_id_fkey" FOREIGN KEY ("parent_mapping_id") REFERENCES "work_sync_mappings"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "work_sync_mappings_sync_window_check" CHECK (
    ("sync_window_start" IS NULL AND "sync_window_end" IS NULL)
    OR
    ("sync_window_start" IS NOT NULL AND "sync_window_end" IS NOT NULL AND "sync_window_end" > "sync_window_start")
  );

-- Calendar mappings are roots. Their local/remote ids stay unique per connection.
CREATE UNIQUE INDEX "work_sync_mappings_root_local_key"
  ON "work_sync_mappings"("connection_id", "resource_type", "local_id")
  WHERE "parent_mapping_id" IS NULL;
CREATE UNIQUE INDEX "work_sync_mappings_root_remote_key"
  ON "work_sync_mappings"("connection_id", "resource_type", "remote_id")
  WHERE "parent_mapping_id" IS NULL;

-- Child mappings are scoped to one remote calendar. Provider event ids are not
-- assumed to be globally unique across all calendars in an account.
CREATE UNIQUE INDEX "work_sync_mappings_child_local_key"
  ON "work_sync_mappings"("parent_mapping_id", "resource_type", "local_id")
  WHERE "parent_mapping_id" IS NOT NULL;
CREATE UNIQUE INDEX "work_sync_mappings_child_remote_key"
  ON "work_sync_mappings"("parent_mapping_id", "resource_type", "remote_id")
  WHERE "parent_mapping_id" IS NOT NULL;
CREATE INDEX "work_sync_mappings_parent_resource_local_idx"
  ON "work_sync_mappings"("parent_mapping_id", "resource_type", "local_id");
CREATE INDEX "work_sync_mappings_parent_resource_remote_idx"
  ON "work_sync_mappings"("parent_mapping_id", "resource_type", "remote_id");
