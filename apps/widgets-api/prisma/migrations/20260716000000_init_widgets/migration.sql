-- CreateTable
CREATE TABLE "notepad_notes" (
    "id" TEXT NOT NULL,
    "owner_account_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "color" TEXT,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "legacy_convex_id" TEXT,

    CONSTRAINT "notepad_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "widget_audit_events" (
    "id" TEXT NOT NULL,
    "widget_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "actor_user_id" TEXT NOT NULL,
    "target_owner_account_id" TEXT NOT NULL,
    "occurred_at" INTEGER NOT NULL,

    CONSTRAINT "widget_audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "notepad_notes_legacy_convex_id_key" ON "notepad_notes"("legacy_convex_id");

-- CreateIndex
CREATE INDEX "notepad_notes_owner_updated_idx" ON "notepad_notes"("owner_account_id", "updated_at" DESC);

-- CreateIndex
CREATE INDEX "notepad_notes_updated_idx" ON "notepad_notes"("updated_at" DESC);

-- CreateIndex
CREATE INDEX "widget_audit_events_widget_occurred_idx" ON "widget_audit_events"("widget_id", "occurred_at");

-- CreateIndex
CREATE INDEX "widget_audit_events_resource_occurred_idx" ON "widget_audit_events"("resource_id", "occurred_at");
