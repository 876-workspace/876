ALTER TABLE "crm_tenants"
  ADD COLUMN "provisioning_revision" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "provisioned_at" TIMESTAMP(3);

CREATE TABLE "crm_request_priorities" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "provisioning_key" TEXT,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "color" TEXT,
  "icon" TEXT,
  "weight" INTEGER NOT NULL DEFAULT 0,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_default" BOOLEAN NOT NULL DEFAULT false,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_by" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" TIMESTAMP(3),
  "deleted_by" TEXT,
  CONSTRAINT "crm_request_priorities_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "crm_request_priorities_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "crm_tenants"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "crm_request_priorities_tenant_id_id_key"
  ON "crm_request_priorities"("tenant_id", "id");
CREATE UNIQUE INDEX "crm_request_priorities_tenant_id_slug_key"
  ON "crm_request_priorities"("tenant_id", "slug");
CREATE UNIQUE INDEX "crm_request_priorities_tenant_id_provisioning_key_key"
  ON "crm_request_priorities"("tenant_id", "provisioning_key");
CREATE INDEX "crm_request_priorities_tenant_id_is_active_sort_order_idx"
  ON "crm_request_priorities"("tenant_id", "is_active", "sort_order");
CREATE INDEX "crm_request_priorities_tenant_id_weight_idx"
  ON "crm_request_priorities"("tenant_id", "weight");
CREATE UNIQUE INDEX "crm_request_priorities_default_unique"
  ON "crm_request_priorities"("tenant_id")
  WHERE "is_default" AND "deleted_at" IS NULL;

INSERT INTO "crm_request_priorities" (
  "id",
  "tenant_id",
  "provisioning_key",
  "name",
  "slug",
  "weight",
  "sort_order",
  "is_default",
  "created_by"
)
SELECT
  'crm_pri_' || replace(gen_random_uuid()::text, '-', ''),
  t."id",
  v."key",
  v."name",
  v."slug",
  v."weight",
  v."sort_order",
  v."is_default",
  'system'
FROM "crm_tenants" t
CROSS JOIN (VALUES
  ('low', 'Low', 'low', 10, 10, false),
  ('normal', 'Normal', 'normal', 20, 20, true),
  ('high', 'High', 'high', 30, 30, false),
  ('urgent', 'Urgent', 'urgent', 40, 40, false)
) AS v("key", "name", "slug", "weight", "sort_order", "is_default");

ALTER TABLE "crm_request_categories"
  ADD COLUMN "provisioning_key" TEXT,
  ADD COLUMN "default_priority_id" TEXT,
  ALTER COLUMN "created_by" DROP NOT NULL;
ALTER TABLE "crm_request_subcategories"
  ADD COLUMN "provisioning_key" TEXT,
  ADD COLUMN "default_priority_id" TEXT,
  ALTER COLUMN "created_by" DROP NOT NULL;

UPDATE "crm_request_categories"
SET "provisioning_key" = "slug"
WHERE "slug" IN (
  'general',
  'support',
  'billing',
  'sales',
  'complaint',
  'feedback',
  'other'
);

CREATE UNIQUE INDEX "crm_request_categories_tenant_id_provisioning_key_key"
  ON "crm_request_categories"("tenant_id", "provisioning_key");
CREATE UNIQUE INDEX "crm_request_subcategories_tenant_id_provisioning_key_key"
  ON "crm_request_subcategories"("tenant_id", "provisioning_key");

ALTER TABLE "crm_requests" ADD COLUMN "priority_id" TEXT;
ALTER TABLE "crm_request_tasks" ADD COLUMN "priority_id" TEXT;

UPDATE "crm_requests" r
SET "priority_id" = p."id"
FROM "crm_request_priorities" p
WHERE p."tenant_id" = r."tenant_id"
  AND p."provisioning_key" = lower(r."priority"::text);

UPDATE "crm_request_tasks" t
SET "priority_id" = p."id"
FROM "crm_request_priorities" p
WHERE p."tenant_id" = t."tenant_id"
  AND p."provisioning_key" = lower(t."priority"::text);

UPDATE "crm_request_categories" c
SET "default_priority_id" = p."id"
FROM "crm_request_priorities" p
WHERE p."tenant_id" = c."tenant_id"
  AND c."default_priority" IS NOT NULL
  AND p."provisioning_key" = lower(c."default_priority"::text);

UPDATE "crm_request_subcategories" s
SET "default_priority_id" = p."id"
FROM "crm_request_priorities" p
WHERE p."tenant_id" = s."tenant_id"
  AND s."default_priority" IS NOT NULL
  AND p."provisioning_key" = lower(s."default_priority"::text);

ALTER TABLE "crm_requests" ALTER COLUMN "priority_id" SET NOT NULL;
ALTER TABLE "crm_request_tasks" ALTER COLUMN "priority_id" SET NOT NULL;

ALTER TABLE "crm_requests"
  ADD CONSTRAINT "crm_requests_tenant_id_priority_id_fkey"
  FOREIGN KEY ("tenant_id", "priority_id")
  REFERENCES "crm_request_priorities"("tenant_id", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "crm_request_tasks"
  ADD CONSTRAINT "crm_request_tasks_tenant_id_priority_id_fkey"
  FOREIGN KEY ("tenant_id", "priority_id")
  REFERENCES "crm_request_priorities"("tenant_id", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "crm_request_categories"
  ADD CONSTRAINT "crm_request_categories_tenant_id_default_priority_id_fkey"
  FOREIGN KEY ("tenant_id", "default_priority_id")
  REFERENCES "crm_request_priorities"("tenant_id", "id")
  ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "crm_request_subcategories"
  ADD CONSTRAINT "crm_request_subcategories_tenant_id_default_priority_id_fkey"
  FOREIGN KEY ("tenant_id", "default_priority_id")
  REFERENCES "crm_request_priorities"("tenant_id", "id")
  ON DELETE NO ACTION ON UPDATE CASCADE;

CREATE INDEX "crm_requests_tenant_id_priority_id_status_idx"
  ON "crm_requests"("tenant_id", "priority_id", "status");
CREATE INDEX "crm_request_tasks_tenant_id_priority_id_status_idx"
  ON "crm_request_tasks"("tenant_id", "priority_id", "status");

ALTER TABLE "crm_requests" DROP COLUMN "priority";
ALTER TABLE "crm_request_tasks" DROP COLUMN "priority";
ALTER TABLE "crm_request_categories" DROP COLUMN "default_priority";
ALTER TABLE "crm_request_subcategories" DROP COLUMN "default_priority";
DROP TYPE "RequestPriority";
