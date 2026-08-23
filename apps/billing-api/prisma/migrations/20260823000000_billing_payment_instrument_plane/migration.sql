+-- CreateEnum
CREATE TYPE "BillingPaymentMethodType" AS ENUM ('CARD', 'BANK_ACCOUNT', 'WALLET', 'MANUAL');

-- CreateEnum
CREATE TYPE "BillingPaymentMethodStatus" AS ENUM ('PENDING', 'ACTIVE', 'REQUIRES_ACTION', 'EXPIRED', 'DETACHED', 'FAILED');

-- CreateEnum
CREATE TYPE "BillingPaymentMethodRedisplay" AS ENUM ('ALWAYS', 'LIMITED', 'UNSPECIFIED');

-- CreateEnum
CREATE TYPE "BillingPaymentCredentialType" AS ENUM ('CARD_PAN', 'BANK_ACCOUNT_NUMBER', 'PROVIDER_TOKEN');

-- CreateEnum
CREATE TYPE "BillingPaymentCredentialStorage" AS ENUM ('WORKOS_VAULT', 'LOCAL_KEY', 'PROVIDER_TOKEN');

-- CreateEnum
CREATE TYPE "BillingPaymentCredentialStatus" AS ENUM ('ACTIVE', 'ROTATED', 'REVOKED');

-- CreateEnum
CREATE TYPE "BillingSetupIntentStatus" AS ENUM ('REQUIRES_PAYMENT_METHOD', 'REQUIRES_CONFIRMATION', 'REQUIRES_ACTION', 'PROCESSING', 'SUCCEEDED', 'CANCELED');

-- CreateEnum
CREATE TYPE "BillingSetupIntentUsage" AS ENUM ('ON_SESSION', 'OFF_SESSION');

-- CreateEnum
CREATE TYPE "BillingMandateType" AS ENUM ('SINGLE_USE', 'MULTI_USE');

-- CreateEnum
CREATE TYPE "BillingMandateStatus" AS ENUM ('PENDING', 'ACTIVE', 'INACTIVE', 'REVOKED');

-- CreateEnum
CREATE TYPE "BillingMandateAcceptanceType" AS ENUM ('ONLINE', 'OFFLINE');

-- CreateEnum
CREATE TYPE "BillingPaymentIntentStatus" AS ENUM ('REQUIRES_PAYMENT_METHOD', 'REQUIRES_CONFIRMATION', 'REQUIRES_ACTION', 'PROCESSING', 'REQUIRES_CAPTURE', 'SUCCEEDED', 'CANCELED');

-- CreateEnum
CREATE TYPE "BillingCaptureMethod" AS ENUM ('AUTOMATIC', 'MANUAL');

-- CreateEnum
CREATE TYPE "BillingConfirmationMethod" AS ENUM ('AUTOMATIC', 'MANUAL');

-- CreateEnum
CREATE TYPE "BillingSetupFutureUsage" AS ENUM ('NONE', 'ON_SESSION', 'OFF_SESSION');

-- CreateEnum
CREATE TYPE "BillingDisputeStatus" AS ENUM ('WARNING_NEEDS_RESPONSE', 'WARNING_UNDER_REVIEW', 'WARNING_CLOSED', 'NEEDS_RESPONSE', 'UNDER_REVIEW', 'WON', 'LOST');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "BillingPaymentStatus" ADD VALUE 'REQUIRES_ACTION';
ALTER TYPE "BillingPaymentStatus" ADD VALUE 'AUTHORIZED';
ALTER TYPE "BillingPaymentStatus" ADD VALUE 'PROCESSING';
ALTER TYPE "BillingPaymentStatus" ADD VALUE 'PARTIALLY_REFUNDED';
ALTER TYPE "BillingPaymentStatus" ADD VALUE 'REFUNDED';
ALTER TYPE "BillingPaymentStatus" ADD VALUE 'DISPUTED';

-- AlterTable
ALTER TABLE "billing_payment_attempts" ADD COLUMN     "authorization_code" TEXT,
ADD COLUMN     "payment_intent_id" TEXT,
ADD COLUMN     "payment_method_id" TEXT,
ADD COLUMN     "provider_status" TEXT,
ADD COLUMN     "three_d_secure" JSONB;

-- AlterTable
ALTER TABLE "billing_payments" ADD COLUMN     "amount_refunded" BIGINT NOT NULL DEFAULT 0,
ADD COLUMN     "authorization_code" TEXT,
ADD COLUMN     "billing_details_snapshot" JSONB,
ADD COLUMN     "disputed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "failure_code" TEXT,
ADD COLUMN     "failure_message" TEXT,
ADD COLUMN     "payment_intent_id" TEXT,
ADD COLUMN     "payment_method_id" TEXT,
ADD COLUMN     "payment_method_snapshot" JSONB,
ADD COLUMN     "provider_status" TEXT,
ADD COLUMN     "receipt_url" TEXT,
ADD COLUMN     "risk" JSONB;

-- CreateTable
CREATE TABLE "billing_disputes" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "payment_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "reason" TEXT,
    "status" "BillingDisputeStatus" NOT NULL,
    "is_payment_refundable" BOOLEAN NOT NULL DEFAULT true,
    "evidence" JSONB,
    "evidence_details" JSONB,
    "due_by" INTEGER,
    "provider" TEXT,
    "provider_connection_id" TEXT,
    "provider_dispute_id" TEXT,
    "opened_at" INTEGER,
    "resolved_at" INTEGER,
    "metadata" JSONB,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,

    CONSTRAINT "billing_disputes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_mandates" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "payment_method_id" TEXT NOT NULL,
    "type" "BillingMandateType" NOT NULL,
    "status" "BillingMandateStatus" NOT NULL,
    "acceptance_type" "BillingMandateAcceptanceType" NOT NULL,
    "accepted_at" INTEGER,
    "acceptance_ip" TEXT,
    "acceptance_user_agent" TEXT,
    "provider" TEXT,
    "provider_mandate_id" TEXT,
    "reference" TEXT,
    "revoked_at" INTEGER,
    "metadata" JSONB,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,

    CONSTRAINT "billing_mandates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_payment_credentials" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "payment_method_id" TEXT NOT NULL,
    "type" "BillingPaymentCredentialType" NOT NULL,
    "storage" "BillingPaymentCredentialStorage" NOT NULL,
    "sealed_value" TEXT,
    "key_id" TEXT,
    "vault_provider" TEXT,
    "provider_token" TEXT,
    "provider" TEXT,
    "status" "BillingPaymentCredentialStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" INTEGER NOT NULL,
    "rotated_at" INTEGER,
    "revoked_at" INTEGER,

    CONSTRAINT "billing_payment_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_payment_intents" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "invoice_id" TEXT,
    "subscription_id" TEXT,
    "amount" BIGINT NOT NULL,
    "amount_capturable" BIGINT NOT NULL DEFAULT 0,
    "amount_received" BIGINT NOT NULL DEFAULT 0,
    "currency" CHAR(3) NOT NULL,
    "status" "BillingPaymentIntentStatus" NOT NULL,
    "capture_method" "BillingCaptureMethod" NOT NULL,
    "confirmation_method" "BillingConfirmationMethod" NOT NULL,
    "payment_method_id" TEXT,
    "mandate_id" TEXT,
    "payment_method_types" TEXT[],
    "setup_future_usage" "BillingSetupFutureUsage" NOT NULL DEFAULT 'NONE',
    "description" TEXT,
    "receipt_email" TEXT,
    "statement_descriptor" TEXT,
    "statement_descriptor_suffix" TEXT,
    "last_payment_error" JSONB,
    "next_action" JSONB,
    "processing" JSONB,
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "latest_payment_id" TEXT,
    "latest_attempt_id" TEXT,
    "canceled_at" INTEGER,
    "cancellation_reason" TEXT,
    "provider" TEXT,
    "provider_connection_id" TEXT,
    "provider_intent_id" TEXT,
    "idempotency_key" TEXT,
    "metadata" JSONB,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,

    CONSTRAINT "billing_payment_intents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_payment_methods" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "type" "BillingPaymentMethodType" NOT NULL,
    "status" "BillingPaymentMethodStatus" NOT NULL DEFAULT 'PENDING',
    "allow_redisplay" "BillingPaymentMethodRedisplay" NOT NULL DEFAULT 'UNSPECIFIED',
    "reusable" BOOLEAN NOT NULL DEFAULT false,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "billing_details" JSONB,
    "card" JSONB,
    "bank_account" JSONB,
    "wallet" JSONB,
    "manual" JSONB,
    "fingerprint" TEXT,
    "display_label" TEXT,
    "exp_month" INTEGER,
    "exp_year" INTEGER,
    "provider" TEXT,
    "provider_payment_method_id" TEXT,
    "provider_connection_id" TEXT,
    "detached_at" INTEGER,
    "metadata" JSONB,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,

    CONSTRAINT "billing_payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_provider_references" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_connection_id" TEXT,
    "resource_type" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "external_type" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" INTEGER NOT NULL,

    CONSTRAINT "billing_provider_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_setup_intents" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "status" "BillingSetupIntentStatus" NOT NULL,
    "usage" "BillingSetupIntentUsage" NOT NULL,
    "payment_method_id" TEXT,
    "mandate_id" TEXT,
    "payment_method_types" TEXT[],
    "provider" TEXT,
    "provider_connection_id" TEXT,
    "provider_setup_id" TEXT,
    "last_error" JSONB,
    "next_action" JSONB,
    "cancellation_reason" TEXT,
    "canceled_at" INTEGER,
    "succeeded_at" INTEGER,
    "metadata" JSONB,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,

    CONSTRAINT "billing_setup_intents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "billing_disputes_tenant_id_id_key" ON "billing_disputes"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "billing_disputes_provider_external_key" ON "billing_disputes"("provider_connection_id", "provider_dispute_id");

-- CreateIndex
CREATE INDEX "billing_mandates_tenant_method_idx" ON "billing_mandates"("tenant_id", "payment_method_id");

-- CreateIndex
CREATE UNIQUE INDEX "billing_mandates_tenant_id_id_key" ON "billing_mandates"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "billing_mandates_provider_external_key" ON "billing_mandates"("provider", "provider_mandate_id");

-- CreateIndex
CREATE INDEX "billing_payment_credentials_tenant_status_idx" ON "billing_payment_credentials"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "billing_payment_credentials_tenant_method_key" ON "billing_payment_credentials"("tenant_id", "payment_method_id");

-- CreateIndex
CREATE UNIQUE INDEX "billing_payment_credentials_tenant_id_id_key" ON "billing_payment_credentials"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "billing_payment_intents_tenant_customer_idx" ON "billing_payment_intents"("tenant_id", "customer_id");

-- CreateIndex
CREATE INDEX "billing_payment_intents_tenant_status_idx" ON "billing_payment_intents"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "billing_payment_intents_tenant_invoice_idx" ON "billing_payment_intents"("tenant_id", "invoice_id");

-- CreateIndex
CREATE UNIQUE INDEX "billing_payment_intents_tenant_id_id_key" ON "billing_payment_intents"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "billing_payment_intents_tenant_idempotency_key" ON "billing_payment_intents"("tenant_id", "idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "billing_payment_intents_provider_external_key" ON "billing_payment_intents"("provider_connection_id", "provider_intent_id");

-- CreateIndex
CREATE INDEX "billing_payment_methods_tenant_customer_idx" ON "billing_payment_methods"("tenant_id", "customer_id");

-- CreateIndex
CREATE INDEX "billing_payment_methods_tenant_status_idx" ON "billing_payment_methods"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "billing_payment_methods_tenant_type_idx" ON "billing_payment_methods"("tenant_id", "type");

-- CreateIndex
CREATE INDEX "billing_payment_methods_tenant_customer_default_idx" ON "billing_payment_methods"("tenant_id", "customer_id", "is_default");

-- CreateIndex
CREATE INDEX "billing_payment_methods_tenant_fingerprint_idx" ON "billing_payment_methods"("tenant_id", "fingerprint");

-- CreateIndex
CREATE UNIQUE INDEX "billing_payment_methods_tenant_id_id_key" ON "billing_payment_methods"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "billing_payment_methods_provider_external_key" ON "billing_payment_methods"("provider_connection_id", "provider_payment_method_id");

-- CreateIndex
CREATE INDEX "billing_provider_references_resource_idx" ON "billing_provider_references"("tenant_id", "resource_type", "resource_id");

-- CreateIndex
CREATE UNIQUE INDEX "billing_provider_references_external_key" ON "billing_provider_references"("provider", "external_type", "external_id");

-- CreateIndex
CREATE UNIQUE INDEX "billing_setup_intents_tenant_id_id_key" ON "billing_setup_intents"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "billing_payment_attempts_payment_intent_id_idx" ON "billing_payment_attempts"("payment_intent_id");

-- CreateIndex
CREATE INDEX "billing_payment_attempts_payment_method_id_idx" ON "billing_payment_attempts"("payment_method_id");

-- CreateIndex
CREATE INDEX "billing_payments_tenant_intent_idx" ON "billing_payments"("tenant_id", "payment_intent_id");

-- CreateIndex
CREATE INDEX "billing_payments_tenant_method_idx" ON "billing_payments"("tenant_id", "payment_method_id");

-- AddForeignKey
ALTER TABLE "billing_disputes" ADD CONSTRAINT "billing_disputes_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "billing_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_disputes" ADD CONSTRAINT "billing_disputes_payment_fkey" FOREIGN KEY ("tenant_id", "payment_id") REFERENCES "billing_payments"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_disputes" ADD CONSTRAINT "billing_disputes_customer_fkey" FOREIGN KEY ("tenant_id", "customer_id") REFERENCES "billing_customers"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_disputes" ADD CONSTRAINT "billing_disputes_provider_connection_fkey" FOREIGN KEY ("tenant_id", "provider_connection_id") REFERENCES "billing_payment_provider_connections"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_mandates" ADD CONSTRAINT "billing_mandates_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "billing_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_mandates" ADD CONSTRAINT "billing_mandates_customer_fkey" FOREIGN KEY ("tenant_id", "customer_id") REFERENCES "billing_customers"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_mandates" ADD CONSTRAINT "billing_mandates_payment_method_fkey" FOREIGN KEY ("tenant_id", "payment_method_id") REFERENCES "billing_payment_methods"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_payment_attempts" ADD CONSTRAINT "billing_payment_attempts_payment_intent_fkey" FOREIGN KEY ("tenant_id", "payment_intent_id") REFERENCES "billing_payment_intents"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_payment_attempts" ADD CONSTRAINT "billing_payment_attempts_payment_method_fkey" FOREIGN KEY ("tenant_id", "payment_method_id") REFERENCES "billing_payment_methods"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_payment_credentials" ADD CONSTRAINT "billing_payment_credentials_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "billing_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_payment_credentials" ADD CONSTRAINT "billing_payment_credentials_payment_method_fkey" FOREIGN KEY ("tenant_id", "payment_method_id") REFERENCES "billing_payment_methods"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_payment_intents" ADD CONSTRAINT "billing_payment_intents_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "billing_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_payment_intents" ADD CONSTRAINT "billing_payment_intents_customer_fkey" FOREIGN KEY ("tenant_id", "customer_id") REFERENCES "billing_customers"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_payment_intents" ADD CONSTRAINT "billing_payment_intents_invoice_fkey" FOREIGN KEY ("tenant_id", "invoice_id") REFERENCES "billing_invoices"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_payment_intents" ADD CONSTRAINT "billing_payment_intents_payment_method_fkey" FOREIGN KEY ("tenant_id", "payment_method_id") REFERENCES "billing_payment_methods"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_payment_intents" ADD CONSTRAINT "billing_payment_intents_mandate_fkey" FOREIGN KEY ("tenant_id", "mandate_id") REFERENCES "billing_mandates"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_payment_intents" ADD CONSTRAINT "billing_payment_intents_provider_connection_fkey" FOREIGN KEY ("tenant_id", "provider_connection_id") REFERENCES "billing_payment_provider_connections"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_payment_methods" ADD CONSTRAINT "billing_payment_methods_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "billing_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_payment_methods" ADD CONSTRAINT "billing_payment_methods_customer_fkey" FOREIGN KEY ("tenant_id", "customer_id") REFERENCES "billing_customers"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_payment_methods" ADD CONSTRAINT "billing_payment_methods_provider_connection_fkey" FOREIGN KEY ("tenant_id", "provider_connection_id") REFERENCES "billing_payment_provider_connections"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_payments" ADD CONSTRAINT "billing_payments_payment_intent_fkey" FOREIGN KEY ("tenant_id", "payment_intent_id") REFERENCES "billing_payment_intents"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_payments" ADD CONSTRAINT "billing_payments_payment_method_fkey" FOREIGN KEY ("tenant_id", "payment_method_id") REFERENCES "billing_payment_methods"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_provider_references" ADD CONSTRAINT "billing_provider_references_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "billing_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_provider_references" ADD CONSTRAINT "billing_provider_references_connection_fkey" FOREIGN KEY ("tenant_id", "provider_connection_id") REFERENCES "billing_payment_provider_connections"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_setup_intents" ADD CONSTRAINT "billing_setup_intents_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "billing_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_setup_intents" ADD CONSTRAINT "billing_setup_intents_customer_fkey" FOREIGN KEY ("tenant_id", "customer_id") REFERENCES "billing_customers"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_setup_intents" ADD CONSTRAINT "billing_setup_intents_payment_method_fkey" FOREIGN KEY ("tenant_id", "payment_method_id") REFERENCES "billing_payment_methods"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_setup_intents" ADD CONSTRAINT "billing_setup_intents_mandate_fkey" FOREIGN KEY ("tenant_id", "mandate_id") REFERENCES "billing_mandates"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;


