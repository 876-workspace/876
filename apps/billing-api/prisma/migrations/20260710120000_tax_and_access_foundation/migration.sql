-- Tenant tax configuration and Billing-local access control.
-- Core organization/user IDs remain opaque references with no cross-DB FKs.

BEGIN;

CREATE TYPE "BillingMemberStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

ALTER TABLE "billing_tenants"
  ADD COLUMN "country_code" TEXT NOT NULL DEFAULT 'JM',
  ADD CONSTRAINT "billing_tenants_country_code_check"
    CHECK ("country_code" ~ '^[A-Z]{2}$');

CREATE TABLE "billing_tax_authorities" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "country_code" TEXT NOT NULL,
  "subdivision_code" TEXT,
  "is_default" BOOLEAN NOT NULL DEFAULT false,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  CONSTRAINT "billing_tax_authorities_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_tax_authorities_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "billing_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_tax_authorities_country_code_check"
    CHECK ("country_code" ~ '^[A-Z]{2}$'),
  CONSTRAINT "billing_tax_authorities_subdivision_code_check"
    CHECK ("subdivision_code" IS NULL OR char_length("subdivision_code") BETWEEN 1 AND 12)
);

CREATE UNIQUE INDEX "billing_tax_authorities_tenant_id_id_key"
  ON "billing_tax_authorities" ("tenant_id", "id");
CREATE UNIQUE INDEX "billing_tax_authorities_tenant_id_name_key"
  ON "billing_tax_authorities" ("tenant_id", "name");
CREATE UNIQUE INDEX "billing_tax_authorities_default_key"
  ON "billing_tax_authorities" ("tenant_id") WHERE "is_default";
CREATE INDEX "billing_tax_authorities_tenant_id_is_active_idx"
  ON "billing_tax_authorities" ("tenant_id", "is_active");

CREATE TABLE "billing_tax_rates" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "tax_authority_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "tax_type" TEXT,
  "rate" DECIMAL(7,4) NOT NULL,
  "inclusive" BOOLEAN NOT NULL DEFAULT false,
  "starts_at" INTEGER,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  CONSTRAINT "billing_tax_rates_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_tax_rates_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "billing_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_tax_rates_tenant_id_tax_authority_id_fkey"
    FOREIGN KEY ("tenant_id", "tax_authority_id")
    REFERENCES "billing_tax_authorities"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "billing_tax_rates_rate_check" CHECK ("rate" >= 0 AND "rate" <= 100),
  CONSTRAINT "billing_tax_rates_starts_at_check" CHECK ("starts_at" IS NULL OR "starts_at" >= 0)
);

CREATE INDEX "billing_tax_rates_tenant_id_active_starts_at_idx"
  ON "billing_tax_rates" ("tenant_id", "is_active", "starts_at");
CREATE INDEX "billing_tax_rates_tax_authority_id_idx"
  ON "billing_tax_rates" ("tax_authority_id");

CREATE TABLE "billing_roles" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "permissions" TEXT[] NOT NULL,
  "is_system" BOOLEAN NOT NULL DEFAULT false,
  "is_default" BOOLEAN NOT NULL DEFAULT false,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  CONSTRAINT "billing_roles_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_roles_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "billing_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_roles_slug_check" CHECK ("slug" ~ '^[a-z0-9_]{2,50}$')
);

CREATE UNIQUE INDEX "billing_roles_tenant_id_id_key"
  ON "billing_roles" ("tenant_id", "id");
CREATE UNIQUE INDEX "billing_roles_tenant_id_slug_key"
  ON "billing_roles" ("tenant_id", "slug");
CREATE UNIQUE INDEX "billing_roles_default_key"
  ON "billing_roles" ("tenant_id") WHERE "is_default";
CREATE INDEX "billing_roles_tenant_id_idx" ON "billing_roles" ("tenant_id");

CREATE TABLE "billing_members" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "role_id" TEXT NOT NULL,
  "status" "BillingMemberStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  CONSTRAINT "billing_members_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_members_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "billing_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_members_tenant_id_role_id_fkey"
    FOREIGN KEY ("tenant_id", "role_id") REFERENCES "billing_roles"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "billing_members_tenant_id_user_id_key"
  ON "billing_members" ("tenant_id", "user_id");
CREATE INDEX "billing_members_role_id_idx" ON "billing_members" ("role_id");

-- Jamaica has one national tax administration. Do not seed a rate: applicable
-- GCT treatment still depends on the supply and must be configured deliberately.
INSERT INTO "billing_tax_authorities" (
  "id", "tenant_id", "name", "description", "country_code",
  "subdivision_code", "is_default", "is_active", "created_at", "updated_at"
)
SELECT
  'bltaxa_' || substr(md5("id" || ':tax-administration-jamaica'), 1, 20),
  "id",
  'Tax Administration Jamaica',
  'Jamaica''s national revenue administration.',
  'JM',
  NULL,
  true,
  true,
  "created_at",
  "updated_at"
FROM "billing_tenants"
WHERE "country_code" = 'JM';

INSERT INTO "billing_roles" (
  "id", "tenant_id", "slug", "name", "description", "permissions",
  "is_system", "is_default", "created_at", "updated_at"
)
SELECT
  'blrole_' || substr(md5(tenant."id" || ':' || seed."slug"), 1, 20),
  tenant."id",
  seed."slug",
  seed."name",
  seed."description",
  seed."permissions",
  true,
  seed."is_default",
  tenant."created_at",
  tenant."updated_at"
FROM "billing_tenants" AS tenant
CROSS JOIN (
  VALUES
    (
      'owner',
      'Owner',
      'Unrestricted workspace access, including roles and member grants.',
      ARRAY[
        'billing:access', 'dashboard:read', 'customers:read', 'customers:write',
        'catalog:read', 'catalog:write', 'sales:read', 'sales:write',
        'subscriptions:read', 'subscriptions:write', 'reports:read',
        'settings:read', 'currencies:read', 'currencies:write',
        'taxes:read', 'taxes:write', 'members:read', 'members:write',
        'roles:read', 'roles:write'
      ]::TEXT[],
      false
    ),
    (
      'admin',
      'Administrator',
      'Full operational and settings access for the Billing workspace.',
      ARRAY[
        'billing:access', 'dashboard:read', 'customers:read', 'customers:write',
        'catalog:read', 'catalog:write', 'sales:read', 'sales:write',
        'subscriptions:read', 'subscriptions:write', 'reports:read',
        'settings:read', 'currencies:read', 'currencies:write',
        'taxes:read', 'taxes:write', 'members:read', 'members:write',
        'roles:read', 'roles:write'
      ]::TEXT[],
      false
    ),
    (
      'accountant',
      'Accountant',
      'Manages customers, sales, tax configuration, and financial reports.',
      ARRAY[
        'billing:access', 'dashboard:read', 'customers:read', 'customers:write',
        'catalog:read', 'sales:read', 'sales:write', 'subscriptions:read',
        'reports:read', 'settings:read', 'currencies:read', 'taxes:read',
        'taxes:write', 'members:read', 'roles:read'
      ]::TEXT[],
      false
    ),
    (
      'viewer',
      'Viewer',
      'Read-only access to Billing data and workspace configuration.',
      ARRAY[
        'billing:access', 'dashboard:read', 'customers:read', 'catalog:read',
        'sales:read', 'subscriptions:read', 'reports:read', 'settings:read',
        'currencies:read', 'taxes:read', 'members:read', 'roles:read'
      ]::TEXT[],
      true
    )
) AS seed("slug", "name", "description", "permissions", "is_default");

COMMIT;
