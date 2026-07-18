-- Refuse to discard finance-domain data that has not first been moved into the
-- shared Billing workspace. This migration is intentionally one-way: there are
-- no compatibility tables or aliases after it succeeds.
DO $$
DECLARE
    unmigrated_rows BIGINT;
BEGIN
    SELECT
        (SELECT COUNT(*) FROM "items") +
        (SELECT COUNT(*) FROM "invoices") +
        (SELECT COUNT(*) FROM "invoice_line_items") +
        (SELECT COUNT(*) FROM "coupons") +
        (SELECT COUNT(*) FROM "coupon_redemptions") +
        (SELECT COUNT(*) FROM "payment_modes") +
        (SELECT COUNT(*) FROM "tenant_payment_modes") +
        (SELECT COUNT(*) FROM "payments") +
        (SELECT COUNT(*) FROM "bank_accounts") +
        (SELECT COUNT(*) FROM "account_transactions") +
        (SELECT COUNT(*) FROM "cash_sessions") +
        (SELECT COUNT(*) FROM "packages" WHERE "invoice_id" IS NOT NULL)
    INTO unmigrated_rows;

    IF unmigrated_rows > 0 THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P0001',
            MESSAGE = 'Couriers finance cutover blocked: migrate local finance rows and package invoice links to Billing before deploying this migration.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM "currencies"
        WHERE "code" <> 'JMD'
    ) THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P0001',
            MESSAGE = 'Couriers finance cutover blocked: migrate non-JMD currency settings to Billing before deploying this migration.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM "courier_customer_profiles"
        WHERE "billing_customer_id" IS NULL
    ) THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P0001',
            MESSAGE = 'Couriers finance cutover blocked: link every operational customer profile to Billing before deploying this migration.';
    END IF;
END $$;

-- The only removable currency rows are JMD defaults. Billing's versioned
-- provisioning manifest recreates that same tenant default without relying on
-- the retired Couriers table.

-- DropForeignKey
ALTER TABLE "account_transactions" DROP CONSTRAINT "account_transactions_account_id_fkey";

-- DropForeignKey
ALTER TABLE "account_transactions" DROP CONSTRAINT "account_transactions_cash_session_id_fkey";

-- DropForeignKey
ALTER TABLE "account_transactions" DROP CONSTRAINT "account_transactions_payment_id_fkey";

-- DropForeignKey
ALTER TABLE "account_transactions" DROP CONSTRAINT "account_transactions_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "bank_accounts" DROP CONSTRAINT "bank_accounts_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "cash_sessions" DROP CONSTRAINT "cash_sessions_bank_account_id_fkey";

-- DropForeignKey
ALTER TABLE "coupon_redemptions" DROP CONSTRAINT "coupon_redemptions_coupon_id_fkey";

-- DropForeignKey
ALTER TABLE "coupon_redemptions" DROP CONSTRAINT "coupon_redemptions_customer_id_fkey";

-- DropForeignKey
ALTER TABLE "coupon_redemptions" DROP CONSTRAINT "coupon_redemptions_invoice_id_fkey";

-- DropForeignKey
ALTER TABLE "coupons" DROP CONSTRAINT "coupons_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "currencies" DROP CONSTRAINT "currencies_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "invoice_line_items" DROP CONSTRAINT "invoice_line_items_invoice_id_fkey";

-- DropForeignKey
ALTER TABLE "invoice_line_items" DROP CONSTRAINT "invoice_line_items_item_id_fkey";

-- DropForeignKey
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_customer_id_fkey";

-- DropForeignKey
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "items" DROP CONSTRAINT "items_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "packages" DROP CONSTRAINT "packages_invoice_id_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_bank_account_id_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_cash_session_id_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_customer_id_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_invoice_id_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_package_id_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_payment_mode_id_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "tenant_payment_modes" DROP CONSTRAINT "tenant_payment_modes_global_mode_id_fkey";

-- DropForeignKey
ALTER TABLE "tenant_payment_modes" DROP CONSTRAINT "tenant_payment_modes_tenant_id_fkey";

-- AlterTable
ALTER TABLE "cash_sessions" DROP COLUMN "bank_account_id",
ADD COLUMN     "billing_deposit_account_id" TEXT NOT NULL,
ADD COLUMN     "currency_code" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "courier_customer_profiles" ALTER COLUMN "billing_customer_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "packages" DROP COLUMN "invoice_id",
ADD COLUMN     "billing_invoice_id" TEXT;

-- DropTable
DROP TABLE "account_transactions";

-- DropTable
DROP TABLE "bank_accounts";

-- DropTable
DROP TABLE "coupon_redemptions";

-- DropTable
DROP TABLE "coupons";

-- DropTable
DROP TABLE "currencies";

-- DropTable
DROP TABLE "invoice_line_items";

-- DropTable
DROP TABLE "invoices";

-- DropTable
DROP TABLE "items";

-- DropTable
DROP TABLE "payment_modes";

-- DropTable
DROP TABLE "payments";

-- DropTable
DROP TABLE "tenant_payment_modes";

-- DropEnum
DROP TYPE "BankAccountType";

-- DropEnum
DROP TYPE "CouponType";

-- DropEnum
DROP TYPE "InvoiceStatus";

-- DropEnum
DROP TYPE "PaymentStatus";

-- DropEnum
DROP TYPE "TransactionDirection";

-- DropEnum
DROP TYPE "TransactionStatus";

-- DropEnum
DROP TYPE "TransactionType";

-- CreateTable
CREATE TABLE "cash_session_payments" (
    "id" TEXT NOT NULL,
    "cash_session_id" TEXT NOT NULL,
    "billing_payment_id" TEXT NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,

    CONSTRAINT "cash_session_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cash_session_payments_billing_payment_id_key" ON "cash_session_payments"("billing_payment_id");

-- CreateIndex
CREATE INDEX "cash_session_payments_cash_session_id_idx" ON "cash_session_payments"("cash_session_id");

-- AddForeignKey
ALTER TABLE "cash_session_payments" ADD CONSTRAINT "cash_session_payments_cash_session_id_fkey" FOREIGN KEY ("cash_session_id") REFERENCES "cash_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
