-- CreateTable
CREATE TABLE "notepad_collections" (
    "id" TEXT NOT NULL,
    "owner_account_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,

    CONSTRAINT "notepad_collections_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "notepad_notes" ADD COLUMN "collection_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "notepad_collections_owner_name_uidx" ON "notepad_collections"("owner_account_id", "name");

-- CreateIndex
CREATE INDEX "notepad_collections_owner_updated_idx" ON "notepad_collections"("owner_account_id", "updated_at" DESC);

-- CreateIndex
CREATE INDEX "notepad_notes_owner_collection_updated_idx" ON "notepad_notes"("owner_account_id", "collection_id", "updated_at" DESC);

-- AddForeignKey
ALTER TABLE "notepad_notes" ADD CONSTRAINT "notepad_notes_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "notepad_collections"("id") ON DELETE SET NULL ON UPDATE CASCADE;
