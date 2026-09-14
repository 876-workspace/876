-- The baseline already owns package_categories and the packages.category_id
-- foreign key. Restore the model to Prisma and add only the tenant-owned
-- provisioning metadata needed by the current configuration contract.
ALTER TABLE "public"."package_categories"
  ADD COLUMN "provisioning_key" TEXT,
  ADD COLUMN "description" TEXT,
  ADD COLUMN "sort_order" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "deleted_at" INTEGER;

-- The baseline slug key did not account for soft deletion. Keep historical
-- category rows while allowing an archived slug to be recreated later.
DROP INDEX "public"."package_categories_tenant_id_slug_key";

CREATE UNIQUE INDEX "package_categories_tenant_id_slug_key"
  ON "public"."package_categories"("tenant_id", "slug")
  WHERE "deleted_at" IS NULL;

CREATE UNIQUE INDEX "package_categories_tenant_id_provisioning_key_key"
  ON "public"."package_categories"("tenant_id", "provisioning_key")
  WHERE "deleted_at" IS NULL AND "provisioning_key" IS NOT NULL;

CREATE INDEX "package_categories_tenant_id_is_active_sort_order_idx"
  ON "public"."package_categories"("tenant_id", "is_active", "sort_order");

CREATE INDEX "packages_category_id_idx"
  ON "public"."packages"("category_id");
