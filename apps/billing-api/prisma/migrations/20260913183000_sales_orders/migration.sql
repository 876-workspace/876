ALTER TYPE "BillingDocumentType" ADD VALUE 'SALES_ORDER';

ALTER TYPE "BillingInvoiceBillingReason" ADD VALUE 'SALES_ORDER';

CREATE TYPE "BillingSalesOrderStatus" AS ENUM (
  'DRAFT',
  'CONFIRMED',
  'COMPLETED',
  'CANCELED'
);

ALTER TABLE "billing_invoices"
  ADD COLUMN "sales_order_id" TEXT;

CREATE TABLE "billing_sales_orders" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "source_app_id" TEXT,
  "source_external_reference" TEXT,
  "source_idempotency_key" TEXT,
  "source_payload_hash" TEXT,
  "customer_id" TEXT NOT NULL,
  "price_list_id" TEXT,
  "price_list_name" TEXT,
  "quote_id" TEXT,
  "salesperson_id" TEXT,
  "number" TEXT NOT NULL,
  "status" "BillingSalesOrderStatus" NOT NULL DEFAULT 'DRAFT',
  "currency" TEXT NOT NULL,
  "reference_number" TEXT,
  "tax_behavior" "BillingTaxBehavior" NOT NULL DEFAULT 'EXCLUSIVE',
  "customer_name" TEXT,
  "customer_email" TEXT,
  "billing_address_snapshot" JSONB,
  "shipping_address_snapshot" JSONB,
  "ordered_at" INTEGER NOT NULL,
  "confirmed_at" INTEGER,
  "completed_at" INTEGER,
  "canceled_at" INTEGER,
  "subtotal_amount" BIGINT NOT NULL DEFAULT 0,
  "tax_amount" BIGINT NOT NULL DEFAULT 0,
  "discount_amount" BIGINT NOT NULL DEFAULT 0,
  "total_amount" BIGINT NOT NULL DEFAULT 0,
  "salesperson_name" TEXT,
  "notes" TEXT,
  "terms" TEXT,
  "metadata" JSONB,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,

  CONSTRAINT "billing_sales_orders_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "billing_sales_order_lines" (
  "id" TEXT NOT NULL,
  "sales_order_id" TEXT NOT NULL,
  "item_id" TEXT,
  "variant_id" TEXT,
  "variant_name" TEXT,
  "variant_sku" TEXT,
  "price_id" TEXT,
  "tax_rate_id" TEXT,
  "description" TEXT NOT NULL,
  "unit" TEXT,
  "position" INTEGER NOT NULL DEFAULT 0,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "unit_amount" BIGINT NOT NULL,
  "tax_amount" BIGINT NOT NULL DEFAULT 0,
  "tax_name" TEXT,
  "tax_rate" DECIMAL(7,4),
  "tax_inclusive" BOOLEAN NOT NULL DEFAULT false,
  "discount_amount" BIGINT NOT NULL DEFAULT 0,
  "total_amount" BIGINT NOT NULL,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,

  CONSTRAINT "billing_sales_order_lines_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "billing_sales_orders_tenant_id_id_key"
  ON "billing_sales_orders"("tenant_id", "id");
CREATE UNIQUE INDEX "billing_sales_orders_tenant_id_number_key"
  ON "billing_sales_orders"("tenant_id", "number");
CREATE UNIQUE INDEX "billing_sales_orders_quote_id_key"
  ON "billing_sales_orders"("quote_id");
CREATE UNIQUE INDEX "billing_sales_orders_source_external_key"
  ON "billing_sales_orders"("tenant_id", "source_app_id", "source_external_reference");
CREATE UNIQUE INDEX "billing_sales_orders_source_idempotency_key"
  ON "billing_sales_orders"("tenant_id", "source_app_id", "source_idempotency_key");
CREATE INDEX "billing_sales_orders_tenant_status_ordered_at_idx"
  ON "billing_sales_orders"("tenant_id", "status", "ordered_at");
CREATE INDEX "billing_sales_orders_tenant_customer_ordered_at_idx"
  ON "billing_sales_orders"("tenant_id", "customer_id", "ordered_at");
CREATE INDEX "billing_sales_orders_source_app_idx"
  ON "billing_sales_orders"("tenant_id", "source_app_id");
CREATE INDEX "billing_sales_orders_price_list_id_idx"
  ON "billing_sales_orders"("price_list_id");
CREATE INDEX "billing_sales_orders_salesperson_id_idx"
  ON "billing_sales_orders"("salesperson_id");

CREATE UNIQUE INDEX "billing_sales_order_lines_sales_order_id_position_key"
  ON "billing_sales_order_lines"("sales_order_id", "position");
CREATE INDEX "billing_sales_order_lines_sales_order_id_idx"
  ON "billing_sales_order_lines"("sales_order_id");
CREATE INDEX "billing_sales_order_lines_item_id_idx"
  ON "billing_sales_order_lines"("item_id");
CREATE INDEX "billing_sales_order_lines_variant_id_idx"
  ON "billing_sales_order_lines"("variant_id");
CREATE INDEX "billing_sales_order_lines_price_id_idx"
  ON "billing_sales_order_lines"("price_id");
CREATE INDEX "billing_sales_order_lines_tax_rate_id_idx"
  ON "billing_sales_order_lines"("tax_rate_id");

CREATE INDEX "billing_invoices_sales_order_id_idx"
  ON "billing_invoices"("sales_order_id");

ALTER TABLE "billing_sales_orders"
  ADD CONSTRAINT "billing_sales_orders_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "billing_tenants"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "billing_sales_orders"
  ADD CONSTRAINT "billing_sales_orders_customer_fkey"
  FOREIGN KEY ("tenant_id", "customer_id")
  REFERENCES "billing_customers"("tenant_id", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "billing_sales_orders"
  ADD CONSTRAINT "billing_sales_orders_price_list_fkey"
  FOREIGN KEY ("tenant_id", "price_list_id")
  REFERENCES "billing_price_lists"("tenant_id", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "billing_sales_orders"
  ADD CONSTRAINT "billing_sales_orders_quote_id_fkey"
  FOREIGN KEY ("quote_id") REFERENCES "billing_quotes"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "billing_sales_orders"
  ADD CONSTRAINT "billing_sales_orders_salesperson_fkey"
  FOREIGN KEY ("tenant_id", "salesperson_id")
  REFERENCES "billing_salespeople"("tenant_id", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "billing_sales_order_lines"
  ADD CONSTRAINT "billing_sales_order_lines_sales_order_id_fkey"
  FOREIGN KEY ("sales_order_id") REFERENCES "billing_sales_orders"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "billing_sales_order_lines"
  ADD CONSTRAINT "billing_sales_order_lines_item_id_fkey"
  FOREIGN KEY ("item_id") REFERENCES "billing_items"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "billing_sales_order_lines"
  ADD CONSTRAINT "billing_sales_order_lines_variant_id_fkey"
  FOREIGN KEY ("variant_id") REFERENCES "billing_item_variants"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "billing_sales_order_lines"
  ADD CONSTRAINT "billing_sales_order_lines_price_id_fkey"
  FOREIGN KEY ("price_id") REFERENCES "billing_prices"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "billing_sales_order_lines"
  ADD CONSTRAINT "billing_sales_order_lines_tax_rate_id_fkey"
  FOREIGN KEY ("tax_rate_id") REFERENCES "billing_tax_rates"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "billing_invoices"
  ADD CONSTRAINT "billing_invoices_sales_order_id_fkey"
  FOREIGN KEY ("sales_order_id") REFERENCES "billing_sales_orders"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
