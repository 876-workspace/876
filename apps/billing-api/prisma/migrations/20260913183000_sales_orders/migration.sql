CREATE TYPE "BillingSalesOrderStatus" AS ENUM (
  'DRAFT',
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'COMPLETED',
  'CANCELED'
);

CREATE TYPE "BillingSalesOrderPaymentStatus" AS ENUM (
  'UNPAID',
  'PARTIALLY_PAID',
  'PAID',
  'PARTIALLY_REFUNDED',
  'REFUNDED'
);

CREATE TYPE "BillingSalesOrderFulfillmentStatus" AS ENUM (
  'UNFULFILLED',
  'PARTIALLY_FULFILLED',
  'FULFILLED'
);

CREATE TABLE "billing_sales_orders" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "customer_id" TEXT NOT NULL,
  "price_list_id" TEXT,
  "price_list_name" TEXT,
  "number" TEXT NOT NULL,
  "status" "BillingSalesOrderStatus" NOT NULL DEFAULT 'DRAFT',
  "payment_status" "BillingSalesOrderPaymentStatus" NOT NULL DEFAULT 'UNPAID',
  "fulfillment_status" "BillingSalesOrderFulfillmentStatus" NOT NULL DEFAULT 'UNFULFILLED',
  "currency" TEXT NOT NULL,
  "ordered_at" INTEGER,
  "confirmed_at" INTEGER,
  "processing_at" INTEGER,
  "completed_at" INTEGER,
  "canceled_at" INTEGER,
  "subtotal_amount" BIGINT NOT NULL DEFAULT 0,
  "tax_amount" BIGINT NOT NULL DEFAULT 0,
  "discount_amount" BIGINT NOT NULL DEFAULT 0,
  "total_amount" BIGINT NOT NULL DEFAULT 0,
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
  "description" TEXT NOT NULL,
  "unit" TEXT,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "unit_amount" BIGINT NOT NULL,
  "tax_amount" BIGINT NOT NULL DEFAULT 0,
  "discount_amount" BIGINT NOT NULL DEFAULT 0,
  "total_amount" BIGINT NOT NULL,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,

  CONSTRAINT "billing_sales_order_lines_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "billing_sales_orders_tenant_id_number_key"
  ON "billing_sales_orders"("tenant_id", "number");
CREATE INDEX "billing_sales_orders_tenant_status_idx"
  ON "billing_sales_orders"("tenant_id", "status");
CREATE INDEX "billing_sales_orders_tenant_payment_status_idx"
  ON "billing_sales_orders"("tenant_id", "payment_status");
CREATE INDEX "billing_sales_orders_tenant_fulfillment_status_idx"
  ON "billing_sales_orders"("tenant_id", "fulfillment_status");
CREATE INDEX "billing_sales_orders_customer_id_idx"
  ON "billing_sales_orders"("customer_id");
CREATE INDEX "billing_sales_orders_price_list_id_idx"
  ON "billing_sales_orders"("price_list_id");

CREATE INDEX "billing_sales_order_lines_sales_order_id_idx"
  ON "billing_sales_order_lines"("sales_order_id");
CREATE INDEX "billing_sales_order_lines_item_id_idx"
  ON "billing_sales_order_lines"("item_id");
CREATE INDEX "billing_sales_order_lines_variant_id_idx"
  ON "billing_sales_order_lines"("variant_id");
CREATE INDEX "billing_sales_order_lines_price_id_idx"
  ON "billing_sales_order_lines"("price_id");

ALTER TABLE "billing_sales_orders"
  ADD CONSTRAINT "billing_sales_orders_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "billing_tenants"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "billing_sales_orders"
  ADD CONSTRAINT "billing_sales_orders_customer_id_fkey"
  FOREIGN KEY ("customer_id") REFERENCES "billing_customers"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "billing_sales_orders"
  ADD CONSTRAINT "billing_sales_orders_price_list_fkey"
  FOREIGN KEY ("tenant_id", "price_list_id")
  REFERENCES "billing_price_lists"("tenant_id", "id")
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
