-- 876 Billing: customers, contacts, addresses, and languages
--
-- Additive to the Billing-owned table family. Core 876 tables are never
-- referenced. Core IDs (organization_id, user_id) remain opaque text values.
-- Every new column is nullable or defaulted, so existing rows are preserved.
--
-- Adds:
--   * billing_languages  (seeded with English only)
--   * billing_tenants.default_language
--   * expanded customer fields (kind, salutation, names, company, work phone,
--     language, core snapshot marker)
--   * billing_contacts   (contact persons per customer)
--   * billing_addresses  (own address table, optional lat/long)

BEGIN;

-- Languages -----------------------------------------------------------------

CREATE TABLE "billing_languages" (
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  CONSTRAINT "billing_languages_pkey" PRIMARY KEY ("code")
);

-- English is the only supported language today. New languages are added by
-- seeding rows, never a schema change.
INSERT INTO "billing_languages" ("code", "name", "is_active", "created_at", "updated_at")
VALUES ('en', 'English', true, EXTRACT(EPOCH FROM NOW())::INTEGER, EXTRACT(EPOCH FROM NOW())::INTEGER);

-- Tenant default language ---------------------------------------------------

ALTER TABLE "billing_tenants"
  ADD COLUMN "default_language" TEXT NOT NULL DEFAULT 'en';

ALTER TABLE "billing_tenants"
  ADD CONSTRAINT "billing_tenants_default_language_fkey"
  FOREIGN KEY ("default_language") REFERENCES "billing_languages"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Customer expansion --------------------------------------------------------

CREATE TYPE "BillingCustomerKind" AS ENUM ('INDIVIDUAL', 'BUSINESS');

ALTER TABLE "billing_customers"
  ADD COLUMN "customer_kind" "BillingCustomerKind" NOT NULL DEFAULT 'INDIVIDUAL',
  ADD COLUMN "salutation" TEXT,
  ADD COLUMN "first_name" TEXT,
  ADD COLUMN "last_name" TEXT,
  ADD COLUMN "company_name" TEXT,
  ADD COLUMN "work_phone" TEXT,
  ADD COLUMN "language" TEXT,
  ADD COLUMN "core_synced_at" INTEGER;

-- Backfill: core organizations are businesses; everything else stays
-- individual until edited.
UPDATE "billing_customers"
  SET "customer_kind" = 'BUSINESS'
  WHERE "customer_type" = 'CORE_ORGANIZATION';

-- Backfill: every customer inherits its tenant's default language.
UPDATE "billing_customers" c
  SET "language" = t."default_language"
  FROM "billing_tenants" t
  WHERE c."tenant_id" = t."id" AND c."language" IS NULL;

ALTER TABLE "billing_customers"
  ADD CONSTRAINT "billing_customers_language_fkey"
  FOREIGN KEY ("language") REFERENCES "billing_languages"("code") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "billing_customers_language_idx" ON "billing_customers" ("language");

-- Contacts ------------------------------------------------------------------

CREATE TABLE "billing_contacts" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "customer_id" TEXT NOT NULL,
  "user_id" TEXT,
  "salutation" TEXT,
  "first_name" TEXT,
  "last_name" TEXT,
  "email" TEXT,
  "work_phone" TEXT,
  "mobile_phone" TEXT,
  "is_primary" BOOLEAN NOT NULL DEFAULT false,
  "core_synced_at" INTEGER,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  CONSTRAINT "billing_contacts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_contacts_tenant_id_id_key" UNIQUE ("tenant_id", "id"),
  CONSTRAINT "billing_contacts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "billing_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_contacts_customer_fkey" FOREIGN KEY ("tenant_id", "customer_id") REFERENCES "billing_customers"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "billing_contacts_tenant_customer_idx" ON "billing_contacts" ("tenant_id", "customer_id");

-- At most one primary contact per customer.
CREATE UNIQUE INDEX "billing_contacts_primary_key"
  ON "billing_contacts" ("tenant_id", "customer_id")
  WHERE "is_primary";

-- Addresses -----------------------------------------------------------------

CREATE TABLE "billing_addresses" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "customer_id" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'billing',
  "label" TEXT,
  "attention" TEXT,
  "line1" TEXT,
  "line2" TEXT,
  "city" TEXT,
  "state" TEXT,
  "postal_code" TEXT,
  "country_code" TEXT,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "is_default" BOOLEAN NOT NULL DEFAULT false,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  CONSTRAINT "billing_addresses_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_addresses_tenant_id_id_key" UNIQUE ("tenant_id", "id"),
  CONSTRAINT "billing_addresses_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "billing_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_addresses_customer_fkey" FOREIGN KEY ("tenant_id", "customer_id") REFERENCES "billing_customers"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_addresses_latitude_check" CHECK ("latitude" IS NULL OR ("latitude" >= -90 AND "latitude" <= 90)),
  CONSTRAINT "billing_addresses_longitude_check" CHECK ("longitude" IS NULL OR ("longitude" >= -180 AND "longitude" <= 180))
);

CREATE INDEX "billing_addresses_tenant_customer_idx" ON "billing_addresses" ("tenant_id", "customer_id");

COMMIT;
