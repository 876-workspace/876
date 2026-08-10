-- CreateTable
CREATE TABLE "public"."organization_modules" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,

    CONSTRAINT "organization_modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."module_preferences" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value_type" TEXT NOT NULL,
    "string_value" TEXT,
    "integer_value" INTEGER,
    "decimal_value" TEXT,
    "boolean_value" BOOLEAN,
    "reference_namespace" TEXT,
    "reference_key" TEXT,
    "updated_by" TEXT,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,

    CONSTRAINT "module_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organization_modules_tenant_id_module_key" ON "public"."organization_modules"("tenant_id", "module");

-- CreateIndex
CREATE INDEX "organization_modules_tenant_id_idx" ON "public"."organization_modules"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "module_preferences_tenant_id_module_key_key" ON "public"."module_preferences"("tenant_id", "module", "key");

-- CreateIndex
CREATE INDEX "module_preferences_tenant_id_module_idx" ON "public"."module_preferences"("tenant_id", "module");

-- AddForeignKey
ALTER TABLE "public"."organization_modules" ADD CONSTRAINT "organization_modules_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."module_preferences" ADD CONSTRAINT "module_preferences_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
