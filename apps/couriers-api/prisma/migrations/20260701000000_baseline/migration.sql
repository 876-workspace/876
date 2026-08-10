-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."BankAccountType" AS ENUM ('CASH', 'BANK', 'CREDIT_CARD', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."CashSessionStatus" AS ENUM ('OPEN', 'CLOSED', 'RECONCILED');

-- CreateEnum
CREATE TYPE "public"."CouponType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');

-- CreateEnum
CREATE TYPE "public"."CustomerStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "public"."InvoiceStatus" AS ENUM ('DRAFT', 'OPEN', 'PAID', 'VOID', 'UNCOLLECTIBLE');

-- CreateEnum
CREATE TYPE "public"."ManifestStatus" AS ENUM ('DRAFT', 'SEALED', 'IN_TRANSIT', 'ARRIVED', 'CUSTOMS_HOLD', 'CLEARED');

-- CreateEnum
CREATE TYPE "public"."PackageDocumentType" AS ENUM ('RECEIPT', 'INVOICE', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."PackageStatus" AS ENUM ('PRE_ALERT', 'RECEIVED', 'IN_TRANSIT', 'ARRIVED', 'READY_FOR_PICKUP', 'COLLECTED', 'UNCLAIMED');

-- CreateEnum
CREATE TYPE "public"."PackageType" AS ENUM ('CARTON', 'ENVELOPE', 'BAG', 'PALLET', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."PaymentStatus" AS ENUM ('DRAFT', 'PAID', 'VOID');

-- CreateEnum
CREATE TYPE "public"."ShipmentMode" AS ENUM ('AIR', 'SEA');

-- CreateEnum
CREATE TYPE "public"."TenantStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "public"."TransactionDirection" AS ENUM ('CREDIT', 'DEBIT');

-- CreateEnum
CREATE TYPE "public"."TransactionStatus" AS ENUM ('PENDING', 'CLEARED', 'VOID');

-- CreateEnum
CREATE TYPE "public"."TransactionType" AS ENUM ('PAYMENT', 'TRANSFER', 'ADJUSTMENT', 'EXPENSE', 'OPENING_BALANCE');

-- CreateTable
CREATE TABLE "public"."account_transactions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "payment_id" TEXT,
    "cash_session_id" TEXT,
    "type" "public"."TransactionType" NOT NULL,
    "direction" "public"."TransactionDirection" NOT NULL,
    "amount" INTEGER NOT NULL,
    "balance_after" INTEGER NOT NULL,
    "currency_code" TEXT NOT NULL,
    "reference_number" TEXT,
    "description" TEXT,
    "notes" TEXT,
    "transaction_date" INTEGER NOT NULL,
    "status" "public"."TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,

    CONSTRAINT "account_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."bank_accounts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "type" "public"."BankAccountType" NOT NULL,
    "name" TEXT NOT NULL,
    "account_code" TEXT,
    "currency_code" TEXT NOT NULL,
    "account_number" TEXT,
    "bank_name" TEXT,
    "routing_number" TEXT,
    "description" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,

    CONSTRAINT "bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."branches" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "street_1" TEXT NOT NULL,
    "street_2" TEXT,
    "city" TEXT NOT NULL,
    "parish" TEXT,
    "country" TEXT NOT NULL DEFAULT 'JM',
    "phone" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "settings" JSONB,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."carriers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo_url" TEXT,
    "website_url" TEXT,
    "tracking_url_template" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,

    CONSTRAINT "carriers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."cash_sessions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "staff_member_id" TEXT NOT NULL,
    "bank_account_id" TEXT NOT NULL,
    "status" "public"."CashSessionStatus" NOT NULL DEFAULT 'OPEN',
    "opening_balance" INTEGER NOT NULL,
    "expected_closing_balance" INTEGER,
    "actual_closing_balance" INTEGER,
    "variance" INTEGER,
    "opened_at" INTEGER NOT NULL,
    "closed_at" INTEGER,
    "reconciled_at" INTEGER,
    "notes" TEXT,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,

    CONSTRAINT "cash_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."contacts" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "user_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."coupon_redemptions" (
    "id" TEXT NOT NULL,
    "coupon_id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "discount_amount" INTEGER NOT NULL,
    "redeemed_at" INTEGER NOT NULL,

    CONSTRAINT "coupon_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."coupons" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "public"."CouponType" NOT NULL,
    "value" INTEGER NOT NULL,
    "max_uses" INTEGER,
    "max_uses_per_customer" INTEGER,
    "min_order_amount" INTEGER,
    "eligible_item_ids" TEXT[],
    "expires_at" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."currencies" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,

    CONSTRAINT "currencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."customer_addresses" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "label" TEXT,
    "street_1" TEXT NOT NULL,
    "street_2" TEXT,
    "city" TEXT NOT NULL,
    "parish" TEXT,
    "country" TEXT NOT NULL DEFAULT 'JM',
    "postal_code" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,

    CONSTRAINT "customer_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."customer_documents" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "type_id" TEXT NOT NULL,
    "number" TEXT,
    "expires_at" INTEGER,
    "file_url" TEXT,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "verified_at" INTEGER,
    "verified_by_id" TEXT,
    "notes" TEXT,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,

    CONSTRAINT "customer_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."customer_id_types" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "has_expiry" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,

    CONSTRAINT "customer_id_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."customers" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" "public"."CustomerStatus" NOT NULL DEFAULT 'ACTIVE',
    "first_seen_at" INTEGER NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "branch_id" TEXT,
    "is_commercial" BOOLEAN NOT NULL DEFAULT false,
    "trn" TEXT,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."domains" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "hostname" TEXT NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,

    CONSTRAINT "domains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."invoice_line_items" (
    "id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "item_id" TEXT,
    "description" TEXT NOT NULL,
    "unit_price" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "total" INTEGER NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,

    CONSTRAINT "invoice_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."invoices" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "status" "public"."InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "currency_code" TEXT NOT NULL,
    "subtotal" INTEGER NOT NULL,
    "discount_amount" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL,
    "due_at" INTEGER,
    "paid_at" INTEGER,
    "notes" TEXT,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."items" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "image_url" TEXT,
    "unit_price" INTEGER NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,

    CONSTRAINT "items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."mailboxes" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,

    CONSTRAINT "mailboxes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."manifests" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "warehouse_id" TEXT,
    "manifest_number" TEXT NOT NULL,
    "status" "public"."ManifestStatus" NOT NULL DEFAULT 'DRAFT',
    "mode" "public"."ShipmentMode" NOT NULL,
    "description" TEXT,
    "notes" TEXT,
    "mawb_number" TEXT,
    "hawb_number" TEXT,
    "airline" TEXT,
    "flight_number" TEXT,
    "departure_airport" TEXT,
    "arrival_airport" TEXT,
    "bill_of_lading" TEXT,
    "vessel_name" TEXT,
    "voyage_number" TEXT,
    "departure_port" TEXT,
    "arrival_port" TEXT,
    "forwarder_name" TEXT,
    "sealed_at" INTEGER,
    "departed_at" INTEGER,
    "estimated_arrival_at" INTEGER,
    "arrived_at" INTEGER,
    "cleared_at" INTEGER,
    "customs_entry_number" TEXT,
    "total_packages" INTEGER NOT NULL DEFAULT 0,
    "total_weight" DOUBLE PRECISION,
    "total_declared_value" INTEGER,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,

    CONSTRAINT "manifests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."package_categories" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "icon" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,

    CONSTRAINT "package_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."package_documents" (
    "id" TEXT NOT NULL,
    "package_id" TEXT NOT NULL,
    "type" "public"."PackageDocumentType" NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,

    CONSTRAINT "package_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."package_notes" (
    "id" TEXT NOT NULL,
    "package_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,

    CONSTRAINT "package_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."packages" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "tracking_num" TEXT,
    "status" "public"."PackageStatus" NOT NULL DEFAULT 'PRE_ALERT',
    "description" TEXT,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "actual_weight" DOUBLE PRECISION,
    "branch_id" TEXT,
    "carrier_id" TEXT,
    "category_id" TEXT,
    "chargeable_weight" DOUBLE PRECISION,
    "collected_at" INTEGER,
    "collected_by_id" TEXT,
    "condition" TEXT,
    "country_of_origin" TEXT,
    "customs_cleared_at" INTEGER,
    "customs_entry_number" TEXT,
    "customs_hold_reason" TEXT,
    "declared_value" INTEGER,
    "dimensional_weight" DOUBLE PRECISION,
    "gct_amount" INTEGER,
    "has_customs_duty" BOOLEAN NOT NULL DEFAULT false,
    "height" DOUBLE PRECISION,
    "hs_code" TEXT,
    "import_duty_amount" INTEGER,
    "invoice_id" TEXT,
    "is_hazardous" BOOLEAN NOT NULL DEFAULT false,
    "length" DOUBLE PRECISION,
    "mailbox_id" TEXT,
    "manifest_id" TEXT,
    "package_type" "public"."PackageType" NOT NULL DEFAULT 'CARTON',
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "seller_id" TEXT,
    "width" DOUBLE PRECISION,

    CONSTRAINT "packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."payment_modes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT '',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,

    CONSTRAINT "payment_modes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."payments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "payment_mode_id" TEXT NOT NULL,
    "invoice_id" TEXT,
    "package_id" TEXT,
    "bank_account_id" TEXT,
    "cash_session_id" TEXT,
    "payment_number" TEXT NOT NULL,
    "status" "public"."PaymentStatus" NOT NULL DEFAULT 'DRAFT',
    "currency_code" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "bank_charge" INTEGER,
    "reference_number" TEXT,
    "attachment_url" TEXT,
    "notes" TEXT,
    "received_at" INTEGER,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sellers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo_url" TEXT,
    "website_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,

    CONSTRAINT "sellers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."staff_members" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "position_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,

    CONSTRAINT "staff_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."staff_positions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,

    CONSTRAINT "staff_positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tenant_payment_modes" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "global_mode_id" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT '',
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,

    CONSTRAINT "tenant_payment_modes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tenants" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "public"."TenantStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "mailbox_prefix" TEXT,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."warehouses" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "street_1" TEXT NOT NULL,
    "street_2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT,
    "country" TEXT NOT NULL DEFAULT 'US',
    "postal_code" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,

    CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "account_transactions_account_id_idx" ON "public"."account_transactions"("account_id" ASC);

-- CreateIndex
CREATE INDEX "account_transactions_cash_session_id_idx" ON "public"."account_transactions"("cash_session_id" ASC);

-- CreateIndex
CREATE INDEX "account_transactions_payment_id_idx" ON "public"."account_transactions"("payment_id" ASC);

-- CreateIndex
CREATE INDEX "account_transactions_tenant_id_idx" ON "public"."account_transactions"("tenant_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "bank_accounts_tenant_id_account_code_key" ON "public"."bank_accounts"("tenant_id" ASC, "account_code" ASC);

-- CreateIndex
CREATE INDEX "bank_accounts_tenant_id_idx" ON "public"."bank_accounts"("tenant_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "bank_accounts_tenant_id_name_key" ON "public"."bank_accounts"("tenant_id" ASC, "name" ASC);

-- CreateIndex
CREATE INDEX "branches_tenant_id_idx" ON "public"."branches"("tenant_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "branches_tenant_id_name_key" ON "public"."branches"("tenant_id" ASC, "name" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "carriers_name_key" ON "public"."carriers"("name" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "carriers_slug_key" ON "public"."carriers"("slug" ASC);

-- CreateIndex
CREATE INDEX "cash_sessions_staff_member_id_idx" ON "public"."cash_sessions"("staff_member_id" ASC);

-- CreateIndex
CREATE INDEX "cash_sessions_tenant_id_idx" ON "public"."cash_sessions"("tenant_id" ASC);

-- CreateIndex
CREATE INDEX "contacts_customer_id_idx" ON "public"."contacts"("customer_id" ASC);

-- CreateIndex
CREATE INDEX "coupon_redemptions_coupon_id_idx" ON "public"."coupon_redemptions"("coupon_id" ASC);

-- CreateIndex
CREATE INDEX "coupon_redemptions_customer_id_idx" ON "public"."coupon_redemptions"("customer_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "coupon_redemptions_invoice_id_key" ON "public"."coupon_redemptions"("invoice_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "coupons_tenant_id_code_key" ON "public"."coupons"("tenant_id" ASC, "code" ASC);

-- CreateIndex
CREATE INDEX "coupons_tenant_id_idx" ON "public"."coupons"("tenant_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "currencies_tenant_id_key" ON "public"."currencies"("tenant_id" ASC);

-- CreateIndex
CREATE INDEX "customer_addresses_customer_id_idx" ON "public"."customer_addresses"("customer_id" ASC);

-- CreateIndex
CREATE INDEX "customer_documents_customer_id_idx" ON "public"."customer_documents"("customer_id" ASC);

-- CreateIndex
CREATE INDEX "customer_documents_tenant_id_idx" ON "public"."customer_documents"("tenant_id" ASC);

-- CreateIndex
CREATE INDEX "customer_id_types_tenant_id_idx" ON "public"."customer_id_types"("tenant_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "customer_id_types_tenant_id_slug_key" ON "public"."customer_id_types"("tenant_id" ASC, "slug" ASC);

-- CreateIndex
CREATE INDEX "customers_branch_id_idx" ON "public"."customers"("branch_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "customers_tenant_id_user_id_key" ON "public"."customers"("tenant_id" ASC, "user_id" ASC);

-- CreateIndex
CREATE INDEX "customers_user_id_idx" ON "public"."customers"("user_id" ASC);

-- CreateIndex
CREATE INDEX "domains_hostname_idx" ON "public"."domains"("hostname" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "domains_hostname_key" ON "public"."domains"("hostname" ASC);

-- CreateIndex
CREATE INDEX "invoice_line_items_invoice_id_idx" ON "public"."invoice_line_items"("invoice_id" ASC);

-- CreateIndex
CREATE INDEX "invoices_customer_id_idx" ON "public"."invoices"("customer_id" ASC);

-- CreateIndex
CREATE INDEX "invoices_tenant_id_idx" ON "public"."invoices"("tenant_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "invoices_tenant_id_invoice_number_key" ON "public"."invoices"("tenant_id" ASC, "invoice_number" ASC);

-- CreateIndex
CREATE INDEX "items_tenant_id_idx" ON "public"."items"("tenant_id" ASC);

-- CreateIndex
CREATE INDEX "mailboxes_customer_id_idx" ON "public"."mailboxes"("customer_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "mailboxes_tenant_id_number_key" ON "public"."mailboxes"("tenant_id" ASC, "number" ASC);

-- CreateIndex
CREATE INDEX "manifests_tenant_id_idx" ON "public"."manifests"("tenant_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "manifests_tenant_id_manifest_number_key" ON "public"."manifests"("tenant_id" ASC, "manifest_number" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "package_categories_tenant_id_slug_key" ON "public"."package_categories"("tenant_id" ASC, "slug" ASC);

-- CreateIndex
CREATE INDEX "package_documents_package_id_idx" ON "public"."package_documents"("package_id" ASC);

-- CreateIndex
CREATE INDEX "package_notes_package_id_idx" ON "public"."package_notes"("package_id" ASC);

-- CreateIndex
CREATE INDEX "packages_customer_id_idx" ON "public"."packages"("customer_id" ASC);

-- CreateIndex
CREATE INDEX "packages_manifest_id_idx" ON "public"."packages"("manifest_id" ASC);

-- CreateIndex
CREATE INDEX "packages_tenant_id_idx" ON "public"."packages"("tenant_id" ASC);

-- CreateIndex
CREATE INDEX "packages_tenant_id_tracking_num_idx" ON "public"."packages"("tenant_id" ASC, "tracking_num" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "payment_modes_name_key" ON "public"."payment_modes"("name" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "payment_modes_slug_key" ON "public"."payment_modes"("slug" ASC);

-- CreateIndex
CREATE INDEX "payments_bank_account_id_idx" ON "public"."payments"("bank_account_id" ASC);

-- CreateIndex
CREATE INDEX "payments_cash_session_id_idx" ON "public"."payments"("cash_session_id" ASC);

-- CreateIndex
CREATE INDEX "payments_customer_id_idx" ON "public"."payments"("customer_id" ASC);

-- CreateIndex
CREATE INDEX "payments_invoice_id_idx" ON "public"."payments"("invoice_id" ASC);

-- CreateIndex
CREATE INDEX "payments_tenant_id_idx" ON "public"."payments"("tenant_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "payments_tenant_id_payment_number_key" ON "public"."payments"("tenant_id" ASC, "payment_number" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sellers_name_key" ON "public"."sellers"("name" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sellers_slug_key" ON "public"."sellers"("slug" ASC);

-- CreateIndex
CREATE INDEX "staff_members_tenant_id_idx" ON "public"."staff_members"("tenant_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "staff_members_tenant_id_user_id_key" ON "public"."staff_members"("tenant_id" ASC, "user_id" ASC);

-- CreateIndex
CREATE INDEX "staff_members_user_id_idx" ON "public"."staff_members"("user_id" ASC);

-- CreateIndex
CREATE INDEX "staff_positions_tenant_id_idx" ON "public"."staff_positions"("tenant_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "staff_positions_tenant_id_name_key" ON "public"."staff_positions"("tenant_id" ASC, "name" ASC);

-- CreateIndex
CREATE INDEX "tenant_payment_modes_tenant_id_idx" ON "public"."tenant_payment_modes"("tenant_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "tenant_payment_modes_tenant_id_slug_key" ON "public"."tenant_payment_modes"("tenant_id" ASC, "slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_org_id_key" ON "public"."tenants"("org_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "public"."tenants"("slug" ASC);

-- CreateIndex
CREATE INDEX "warehouses_tenant_id_idx" ON "public"."warehouses"("tenant_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "warehouses_tenant_id_name_key" ON "public"."warehouses"("tenant_id" ASC, "name" ASC);

-- AddForeignKey
ALTER TABLE "public"."account_transactions" ADD CONSTRAINT "account_transactions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."account_transactions" ADD CONSTRAINT "account_transactions_cash_session_id_fkey" FOREIGN KEY ("cash_session_id") REFERENCES "public"."cash_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."account_transactions" ADD CONSTRAINT "account_transactions_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."account_transactions" ADD CONSTRAINT "account_transactions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."bank_accounts" ADD CONSTRAINT "bank_accounts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."branches" ADD CONSTRAINT "branches_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."cash_sessions" ADD CONSTRAINT "cash_sessions_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."cash_sessions" ADD CONSTRAINT "cash_sessions_staff_member_id_fkey" FOREIGN KEY ("staff_member_id") REFERENCES "public"."staff_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."cash_sessions" ADD CONSTRAINT "cash_sessions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."contacts" ADD CONSTRAINT "contacts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."coupons" ADD CONSTRAINT "coupons_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."currencies" ADD CONSTRAINT "currencies_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."customer_addresses" ADD CONSTRAINT "customer_addresses_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."customer_documents" ADD CONSTRAINT "customer_documents_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."customer_documents" ADD CONSTRAINT "customer_documents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."customer_documents" ADD CONSTRAINT "customer_documents_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "public"."customer_id_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."customer_id_types" ADD CONSTRAINT "customer_id_types_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."customers" ADD CONSTRAINT "customers_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."customers" ADD CONSTRAINT "customers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."domains" ADD CONSTRAINT "domains_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."invoice_line_items" ADD CONSTRAINT "invoice_line_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."invoice_line_items" ADD CONSTRAINT "invoice_line_items_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."invoices" ADD CONSTRAINT "invoices_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."invoices" ADD CONSTRAINT "invoices_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."items" ADD CONSTRAINT "items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."mailboxes" ADD CONSTRAINT "mailboxes_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."manifests" ADD CONSTRAINT "manifests_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."manifests" ADD CONSTRAINT "manifests_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."package_categories" ADD CONSTRAINT "package_categories_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."package_documents" ADD CONSTRAINT "package_documents_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."package_notes" ADD CONSTRAINT "package_notes_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."packages" ADD CONSTRAINT "packages_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."packages" ADD CONSTRAINT "packages_carrier_id_fkey" FOREIGN KEY ("carrier_id") REFERENCES "public"."carriers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."packages" ADD CONSTRAINT "packages_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."package_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."packages" ADD CONSTRAINT "packages_collected_by_id_fkey" FOREIGN KEY ("collected_by_id") REFERENCES "public"."contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."packages" ADD CONSTRAINT "packages_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."packages" ADD CONSTRAINT "packages_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."packages" ADD CONSTRAINT "packages_mailbox_id_fkey" FOREIGN KEY ("mailbox_id") REFERENCES "public"."mailboxes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."packages" ADD CONSTRAINT "packages_manifest_id_fkey" FOREIGN KEY ("manifest_id") REFERENCES "public"."manifests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."packages" ADD CONSTRAINT "packages_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "public"."sellers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."packages" ADD CONSTRAINT "packages_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payments" ADD CONSTRAINT "payments_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payments" ADD CONSTRAINT "payments_cash_session_id_fkey" FOREIGN KEY ("cash_session_id") REFERENCES "public"."cash_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payments" ADD CONSTRAINT "payments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payments" ADD CONSTRAINT "payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payments" ADD CONSTRAINT "payments_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payments" ADD CONSTRAINT "payments_payment_mode_id_fkey" FOREIGN KEY ("payment_mode_id") REFERENCES "public"."tenant_payment_modes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payments" ADD CONSTRAINT "payments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."staff_members" ADD CONSTRAINT "staff_members_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."staff_members" ADD CONSTRAINT "staff_members_position_id_fkey" FOREIGN KEY ("position_id") REFERENCES "public"."staff_positions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."staff_members" ADD CONSTRAINT "staff_members_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."staff_positions" ADD CONSTRAINT "staff_positions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tenant_payment_modes" ADD CONSTRAINT "tenant_payment_modes_global_mode_id_fkey" FOREIGN KEY ("global_mode_id") REFERENCES "public"."payment_modes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tenant_payment_modes" ADD CONSTRAINT "tenant_payment_modes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."warehouses" ADD CONSTRAINT "warehouses_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
