-- CreateEnum
CREATE TYPE "WorkAppConnectionStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'REVOKED');

-- CreateTable
CREATE TABLE "work_app_connections" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "app_id" TEXT NOT NULL,
    "scopes" TEXT[] NOT NULL,
    "status" "WorkAppConnectionStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "work_app_connections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "work_app_connections_tenant_id_app_id_key" ON "work_app_connections"("tenant_id", "app_id");

-- AddForeignKey
ALTER TABLE "work_app_connections" ADD CONSTRAINT "work_app_connections_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "work_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
