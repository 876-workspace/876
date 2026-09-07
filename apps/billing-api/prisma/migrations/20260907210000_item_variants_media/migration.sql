ALTER TABLE "billing_items"
  ADD COLUMN "variant_mode" TEXT NOT NULL DEFAULT 'single';

ALTER TABLE "billing_items"
  ADD CONSTRAINT "billing_items_variant_mode_check"
    CHECK ("variant_mode" IN ('single', 'variant'));

ALTER TABLE "billing_items"
  DROP CONSTRAINT "billing_items_tracked_stock_quantity_check";

ALTER TABLE "billing_items"
  ADD CONSTRAINT "billing_items_tracked_stock_quantity_check"
    CHECK (
      NOT "track_stock"
      OR "variant_mode" = 'variant'
      OR "stock_quantity" IS NOT NULL
    ),
  ADD CONSTRAINT "billing_items_variant_parent_stock_check"
    CHECK ("variant_mode" = 'single' OR "stock_quantity" IS NULL);

CREATE INDEX "billing_items_tenant_variant_mode_idx"
  ON "billing_items"("tenant_id", "variant_mode");

CREATE TABLE "billing_module_preferences" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "module" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "value_type" TEXT NOT NULL,
  "string_value" TEXT,
  "integer_value" INTEGER,
  "decimal_value" TEXT,
  "boolean_value" BOOLEAN,
  "reference_namespace" TEXT,
  "reference_key" TEXT,
  "updated_by" TEXT,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,

  CONSTRAINT "billing_module_preferences_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_module_preferences_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "billing_tenants"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_module_preferences_value_type_check"
    CHECK ("value_type" IN ('boolean', 'string', 'integer', 'decimal', 'enum', 'reference'))
);

CREATE UNIQUE INDEX "billing_module_preferences_tenant_module_key"
  ON "billing_module_preferences"("tenant_id", "module", "key");
CREATE INDEX "billing_module_preferences_tenant_module_idx"
  ON "billing_module_preferences"("tenant_id", "module");

CREATE TABLE "billing_item_options" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "item_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,

  CONSTRAINT "billing_item_options_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_item_options_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "billing_tenants"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_item_options_item_id_fkey"
    FOREIGN KEY ("item_id") REFERENCES "billing_items"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_item_options_position_check"
    CHECK ("position" >= 0)
);

CREATE UNIQUE INDEX "billing_item_options_item_name_key"
  ON "billing_item_options"("item_id", "name");
CREATE UNIQUE INDEX "billing_item_options_item_position_key"
  ON "billing_item_options"("item_id", "position");
CREATE INDEX "billing_item_options_tenant_item_idx"
  ON "billing_item_options"("tenant_id", "item_id");

CREATE TABLE "billing_item_option_values" (
  "id" TEXT NOT NULL,
  "option_id" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,

  CONSTRAINT "billing_item_option_values_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_item_option_values_option_id_fkey"
    FOREIGN KEY ("option_id") REFERENCES "billing_item_options"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_item_option_values_position_check"
    CHECK ("position" >= 0)
);

CREATE UNIQUE INDEX "billing_item_option_values_option_value_key"
  ON "billing_item_option_values"("option_id", "value");
CREATE UNIQUE INDEX "billing_item_option_values_option_position_key"
  ON "billing_item_option_values"("option_id", "position");
CREATE INDEX "billing_item_option_values_option_id_idx"
  ON "billing_item_option_values"("option_id");

CREATE TABLE "billing_item_variants" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "item_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "sku" TEXT,
  "default_selling_amount" BIGINT,
  "default_selling_currency" TEXT,
  "default_cost_amount" BIGINT,
  "default_cost_currency" TEXT,
  "stock_quantity" INTEGER,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,

  CONSTRAINT "billing_item_variants_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_item_variants_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "billing_tenants"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_item_variants_item_id_fkey"
    FOREIGN KEY ("item_id") REFERENCES "billing_items"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_item_variants_selling_pair_check"
    CHECK (("default_selling_amount" IS NULL) = ("default_selling_currency" IS NULL)),
  CONSTRAINT "billing_item_variants_cost_pair_check"
    CHECK (("default_cost_amount" IS NULL) = ("default_cost_currency" IS NULL))
);

CREATE UNIQUE INDEX "billing_item_variants_tenant_sku_key"
  ON "billing_item_variants"("tenant_id", "sku");
CREATE UNIQUE INDEX "billing_item_variants_item_name_key"
  ON "billing_item_variants"("item_id", "name");
CREATE INDEX "billing_item_variants_tenant_item_active_idx"
  ON "billing_item_variants"("tenant_id", "item_id", "is_active");

CREATE TABLE "billing_item_variant_values" (
  "variant_id" TEXT NOT NULL,
  "option_id" TEXT NOT NULL,
  "option_value_id" TEXT NOT NULL,

  CONSTRAINT "billing_item_variant_values_pkey"
    PRIMARY KEY ("variant_id", "option_id"),
  CONSTRAINT "billing_item_variant_values_variant_id_fkey"
    FOREIGN KEY ("variant_id") REFERENCES "billing_item_variants"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_item_variant_values_option_id_fkey"
    FOREIGN KEY ("option_id") REFERENCES "billing_item_options"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_item_variant_values_option_value_id_fkey"
    FOREIGN KEY ("option_value_id") REFERENCES "billing_item_option_values"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "billing_item_variant_values_variant_value_key"
  ON "billing_item_variant_values"("variant_id", "option_value_id");
CREATE INDEX "billing_item_variant_values_option_value_idx"
  ON "billing_item_variant_values"("option_id", "option_value_id");

CREATE TABLE "billing_item_media" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "item_id" TEXT NOT NULL,
  "variant_id" TEXT,
  "target_key" TEXT NOT NULL,
  "file_id" TEXT NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,

  CONSTRAINT "billing_item_media_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_item_media_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "billing_tenants"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_item_media_item_id_fkey"
    FOREIGN KEY ("item_id") REFERENCES "billing_items"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_item_media_variant_id_fkey"
    FOREIGN KEY ("variant_id") REFERENCES "billing_item_variants"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_item_media_position_check"
    CHECK ("position" >= 0),
  CONSTRAINT "billing_item_media_target_check"
    CHECK (
      ("variant_id" IS NULL AND "target_key" = "item_id")
      OR ("variant_id" IS NOT NULL AND "target_key" = "variant_id")
    )
);

CREATE UNIQUE INDEX "billing_item_media_target_file_key"
  ON "billing_item_media"("tenant_id", "target_key", "file_id");
CREATE UNIQUE INDEX "billing_item_media_target_position_key"
  ON "billing_item_media"("tenant_id", "target_key", "position");
CREATE INDEX "billing_item_media_tenant_item_idx"
  ON "billing_item_media"("tenant_id", "item_id");
CREATE INDEX "billing_item_media_tenant_variant_idx"
  ON "billing_item_media"("tenant_id", "variant_id");

ALTER TABLE "billing_item_stock_movements"
  ADD COLUMN "variant_id" TEXT,
  ADD COLUMN "stock_target_key" TEXT;

UPDATE "billing_item_stock_movements"
SET "stock_target_key" = "item_id"
WHERE "stock_target_key" IS NULL;

ALTER TABLE "billing_item_stock_movements"
  ALTER COLUMN "stock_target_key" SET NOT NULL,
  ADD CONSTRAINT "billing_item_stock_movements_variant_id_fkey"
    FOREIGN KEY ("variant_id") REFERENCES "billing_item_variants"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

DROP INDEX "billing_item_stock_movements_reference_key";

CREATE UNIQUE INDEX "billing_item_stock_movements_target_reference_key"
  ON "billing_item_stock_movements"("tenant_id", "stock_target_key", "type", "reference_id");
CREATE INDEX "billing_item_stock_movements_variant_created_idx"
  ON "billing_item_stock_movements"("tenant_id", "variant_id", "created_at");

ALTER TABLE "billing_quote_lines"
  ADD COLUMN "variant_id" TEXT,
  ADD COLUMN "variant_name" TEXT,
  ADD COLUMN "variant_sku" TEXT,
  ADD CONSTRAINT "billing_quote_lines_variant_id_fkey"
    FOREIGN KEY ("variant_id") REFERENCES "billing_item_variants"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "billing_quote_lines_variant_id_idx"
  ON "billing_quote_lines"("variant_id");

ALTER TABLE "billing_invoice_lines"
  ADD COLUMN "variant_id" TEXT,
  ADD COLUMN "variant_name" TEXT,
  ADD COLUMN "variant_sku" TEXT,
  ADD CONSTRAINT "billing_invoice_lines_variant_id_fkey"
    FOREIGN KEY ("variant_id") REFERENCES "billing_item_variants"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "billing_invoice_lines_variant_id_idx"
  ON "billing_invoice_lines"("variant_id");

ALTER TABLE "billing_credit_note_lines"
  ADD COLUMN "variant_id" TEXT,
  ADD COLUMN "variant_name" TEXT,
  ADD COLUMN "variant_sku" TEXT,
  ADD CONSTRAINT "billing_credit_note_lines_variant_id_fkey"
    FOREIGN KEY ("variant_id") REFERENCES "billing_item_variants"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "billing_credit_note_lines_variant_id_idx"
  ON "billing_credit_note_lines"("variant_id");
