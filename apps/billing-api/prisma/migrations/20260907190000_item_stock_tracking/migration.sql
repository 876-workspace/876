ALTER TABLE "billing_items"
  ADD COLUMN "track_stock" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN "stock_quantity" INTEGER,
  ADD COLUMN "low_stock_threshold" INTEGER,
  ADD COLUMN "allow_out_of_stock" BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE "billing_items"
  ADD CONSTRAINT "billing_items_low_stock_threshold_check"
    CHECK ("low_stock_threshold" IS NULL OR "low_stock_threshold" >= 0),
  ADD CONSTRAINT "billing_items_tracked_stock_quantity_check"
    CHECK (NOT "track_stock" OR "stock_quantity" IS NOT NULL),
  ADD CONSTRAINT "billing_items_stock_good_check"
    CHECK (NOT "track_stock" OR "type" = 'GOOD');

CREATE TABLE "billing_item_stock_movements" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "item_id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "quantity_delta" INTEGER NOT NULL,
  "quantity_before" INTEGER NOT NULL,
  "quantity_after" INTEGER NOT NULL,
  "reference_type" TEXT,
  "reference_id" TEXT,
  "note" TEXT,
  "created_by" TEXT,
  "created_at" INTEGER NOT NULL,

  CONSTRAINT "billing_item_stock_movements_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_item_stock_movements_item_id_fkey"
    FOREIGN KEY ("item_id") REFERENCES "billing_items"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_item_stock_movements_type_check"
    CHECK ("type" IN ('initial-stock', 'manual-adjustment', 'invoice-finalized', 'invoice-voided'))
);

CREATE UNIQUE INDEX "billing_item_stock_movements_reference_key"
  ON "billing_item_stock_movements"("tenant_id", "item_id", "type", "reference_id");

CREATE INDEX "billing_item_stock_movements_item_created_idx"
  ON "billing_item_stock_movements"("tenant_id", "item_id", "created_at");

CREATE INDEX "billing_item_stock_movements_reference_idx"
  ON "billing_item_stock_movements"("tenant_id", "reference_type", "reference_id");
