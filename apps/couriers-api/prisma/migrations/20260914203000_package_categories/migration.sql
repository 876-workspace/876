-- The baseline already owns package_categories and the packages.category_id
-- foreign key. Restore the model to Prisma and add only the tenant-owned
-- provisioning metadata needed by the current configuration contract.
ALTER TABLE "public"."package_categories"
  ADD COLUMN "provisioning_key" TEXT,
  ADD COLUMN "description" TEXT,
  ADD COLUMN "sort_order" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "deleted_at" INTEGER;

CREATE UNIQUE INDEX "package_categories_tenant_id_provisioning_key_key"
  ON "public"."package_categories"("tenant_id", "provisioning_key");

CREATE INDEX "package_categories_tenant_id_is_active_sort_order_idx"
  ON "public"."package_categories"("tenant_id", "is_active", "sort_order");

CREATE INDEX "packages_category_id_idx"
  ON "public"."packages"("category_id");
