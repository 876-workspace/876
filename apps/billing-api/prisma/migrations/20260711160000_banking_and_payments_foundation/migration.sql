-- Manual banking and customer-payment foundation. External payment processing,
-- automated bank feeds, file attachments, and general-ledger accounting remain
-- outside this migration.

ALTER TYPE "BillingDocumentType" ADD VALUE IF NOT EXISTS 'PAYMENT';

BEGIN;

CREATE TYPE "BillingBankAccountType" AS ENUM (
  'CHECKING',
  'SAVINGS',
  'CREDIT_CARD',
  'CASH',
  'PAYPAL',
  'UNDEPOSITED_FUNDS',
  'PETTY_CASH'
);

CREATE TYPE "BillingBankTransactionType" AS ENUM ('CREDIT', 'DEBIT');

CREATE TYPE "BillingBankTransactionStatus" AS ENUM (
  'UNCATEGORIZED',
  'CATEGORIZED',
  'MATCHED',
  'EXCLUDED'
);

CREATE UNIQUE INDEX "billing_customers_tenant_id_id_key"
  ON "billing_customers" ("tenant_id", "id");

CREATE UNIQUE INDEX "billing_invoices_tenant_id_id_key"
  ON "billing_invoices" ("tenant_id", "id");

CREATE TABLE "billing_payment_modes" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "is_default" BOOLEAN NOT NULL DEFAULT false,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "is_system" BOOLEAN NOT NULL DEFAULT false,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  CONSTRAINT "billing_payment_modes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_payment_modes_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "billing_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "billing_payment_modes_tenant_id_id_key"
  ON "billing_payment_modes" ("tenant_id", "id");
CREATE UNIQUE INDEX "billing_payment_modes_tenant_id_name_key"
  ON "billing_payment_modes" ("tenant_id", "name");
CREATE UNIQUE INDEX "billing_payment_modes_default_key"
  ON "billing_payment_modes" ("tenant_id") WHERE "is_default";
CREATE INDEX "billing_payment_modes_tenant_id_is_active_idx"
  ON "billing_payment_modes" ("tenant_id", "is_active");

CREATE TABLE "billing_bank_accounts" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "account_type" "BillingBankAccountType" NOT NULL,
  "currency" CHAR(3) NOT NULL,
  "description" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  CONSTRAINT "billing_bank_accounts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_bank_accounts_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "billing_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_bank_accounts_currency_check"
    CHECK ("currency" ~ '^[A-Z]{3}$')
);

CREATE UNIQUE INDEX "billing_bank_accounts_tenant_id_id_key"
  ON "billing_bank_accounts" ("tenant_id", "id");
CREATE UNIQUE INDEX "billing_bank_accounts_tenant_id_name_key"
  ON "billing_bank_accounts" ("tenant_id", "name");
CREATE INDEX "billing_bank_accounts_tenant_id_is_active_idx"
  ON "billing_bank_accounts" ("tenant_id", "is_active");

CREATE TABLE "billing_payments" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "customer_id" TEXT NOT NULL,
  "payment_mode_id" TEXT NOT NULL,
  "deposit_account_id" TEXT NOT NULL,
  "number" TEXT NOT NULL,
  "amount" BIGINT NOT NULL,
  "bank_charges" BIGINT NOT NULL DEFAULT 0,
  "currency" CHAR(3) NOT NULL,
  "payment_date" INTEGER NOT NULL,
  "reference_number" VARCHAR(120),
  "notes" TEXT,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  CONSTRAINT "billing_payments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_payments_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "billing_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_payments_customer_fkey"
    FOREIGN KEY ("tenant_id", "customer_id") REFERENCES "billing_customers"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "billing_payments_payment_mode_fkey"
    FOREIGN KEY ("tenant_id", "payment_mode_id") REFERENCES "billing_payment_modes"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "billing_payments_deposit_account_fkey"
    FOREIGN KEY ("tenant_id", "deposit_account_id") REFERENCES "billing_bank_accounts"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "billing_payments_amount_check" CHECK ("amount" > 0),
  CONSTRAINT "billing_payments_bank_charges_check"
    CHECK ("bank_charges" >= 0 AND "bank_charges" < "amount"),
  CONSTRAINT "billing_payments_currency_check"
    CHECK ("currency" ~ '^[A-Z]{3}$'),
  CONSTRAINT "billing_payments_payment_date_check" CHECK ("payment_date" >= 0)
);

CREATE UNIQUE INDEX "billing_payments_tenant_id_id_key"
  ON "billing_payments" ("tenant_id", "id");
CREATE UNIQUE INDEX "billing_payments_tenant_id_number_key"
  ON "billing_payments" ("tenant_id", "number");
CREATE INDEX "billing_payments_tenant_customer_date_idx"
  ON "billing_payments" ("tenant_id", "customer_id", "payment_date");
CREATE INDEX "billing_payments_tenant_deposit_account_idx"
  ON "billing_payments" ("tenant_id", "deposit_account_id");

CREATE TABLE "billing_payment_allocations" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "payment_id" TEXT NOT NULL,
  "invoice_id" TEXT NOT NULL,
  "amount" BIGINT NOT NULL,
  "invoice_status_before" "BillingInvoiceStatus" NOT NULL,
  "invoice_paid_at_before" INTEGER,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  CONSTRAINT "billing_payment_allocations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_payment_allocations_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "billing_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_payment_allocations_payment_fkey"
    FOREIGN KEY ("tenant_id", "payment_id") REFERENCES "billing_payments"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_payment_allocations_invoice_fkey"
    FOREIGN KEY ("tenant_id", "invoice_id") REFERENCES "billing_invoices"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "billing_payment_allocations_amount_check" CHECK ("amount" > 0)
);

CREATE UNIQUE INDEX "billing_payment_allocations_payment_id_invoice_id_key"
  ON "billing_payment_allocations" ("payment_id", "invoice_id");
CREATE INDEX "billing_payment_allocations_tenant_payment_idx"
  ON "billing_payment_allocations" ("tenant_id", "payment_id");
CREATE INDEX "billing_payment_allocations_tenant_invoice_idx"
  ON "billing_payment_allocations" ("tenant_id", "invoice_id");

CREATE TABLE "billing_bank_transactions" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "account_id" TEXT NOT NULL,
  "payment_id" TEXT,
  "type" "BillingBankTransactionType" NOT NULL,
  "amount" BIGINT NOT NULL,
  "date" INTEGER NOT NULL,
  "description" TEXT,
  "status" "BillingBankTransactionStatus" NOT NULL DEFAULT 'UNCATEGORIZED',
  "reference" VARCHAR(120),
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  CONSTRAINT "billing_bank_transactions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_bank_transactions_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "billing_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_bank_transactions_account_fkey"
    FOREIGN KEY ("tenant_id", "account_id") REFERENCES "billing_bank_accounts"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_bank_transactions_payment_fkey"
    FOREIGN KEY ("tenant_id", "payment_id") REFERENCES "billing_payments"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_bank_transactions_amount_check" CHECK ("amount" > 0),
  CONSTRAINT "billing_bank_transactions_date_check" CHECK ("date" >= 0)
);

CREATE UNIQUE INDEX "billing_bank_transactions_tenant_id_payment_id_key"
  ON "billing_bank_transactions" ("tenant_id", "payment_id");
CREATE INDEX "billing_bank_transactions_tenant_account_date_idx"
  ON "billing_bank_transactions" ("tenant_id", "account_id", "date");
CREATE INDEX "billing_bank_transactions_tenant_id_date_idx"
  ON "billing_bank_transactions" ("tenant_id", "date");

INSERT INTO "billing_payment_modes" (
  "id", "tenant_id", "name", "is_default", "is_active", "is_system",
  "created_at", "updated_at"
)
SELECT
  'blpmode_' || substr(md5(tenant."id" || ':' || seed."name"), 1, 20),
  tenant."id",
  seed."name",
  seed."is_default",
  true,
  true,
  tenant."created_at",
  tenant."updated_at"
FROM "billing_tenants" AS tenant
CROSS JOIN (
  VALUES
    ('Cash', true),
    ('Credit Card', false),
    ('Bank Transfer', false)
) AS seed("name", "is_default");

UPDATE "billing_roles"
SET
  "permissions" = "permissions" || ARRAY[
    'vendors:read', 'vendors:write', 'purchases:read', 'purchases:write',
    'banking:read', 'banking:write', 'payments:read', 'payments:write'
  ]::TEXT[],
  "updated_at" = EXTRACT(EPOCH FROM NOW())::INTEGER
WHERE "is_system" AND "slug" IN ('owner', 'admin', 'accountant');

UPDATE "billing_roles"
SET
  "permissions" = "permissions" || ARRAY[
    'vendors:read', 'purchases:read', 'banking:read', 'payments:read'
  ]::TEXT[],
  "updated_at" = EXTRACT(EPOCH FROM NOW())::INTEGER
WHERE "is_system" AND "slug" = 'viewer';

COMMIT;
