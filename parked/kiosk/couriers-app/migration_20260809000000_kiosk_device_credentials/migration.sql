CREATE TYPE "KioskDeviceStatus" AS ENUM ('ACTIVE', 'REVOKED');

CREATE TABLE "kiosk_devices" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "branch_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "credential_hash" TEXT NOT NULL,
  "status" "KioskDeviceStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_by_id" TEXT,
  "last_used_at" INTEGER,
  "revoked_at" INTEGER,
  "revoked_by_id" TEXT,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  CONSTRAINT "kiosk_devices_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "kiosk_devices_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "kiosk_devices_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "kiosk_devices_credential_hash_key" ON "kiosk_devices"("credential_hash");
CREATE UNIQUE INDEX "kiosk_devices_tenant_id_name_key" ON "kiosk_devices"("tenant_id", "name");
CREATE INDEX "kiosk_devices_branch_status_idx" ON "kiosk_devices"("branch_id", "status");

CREATE TABLE "package_pickup_challenges" (
  "id" TEXT NOT NULL,
  "package_id" TEXT NOT NULL,
  "code_hash" TEXT NOT NULL,
  "expires_at" INTEGER NOT NULL,
  "used_at" INTEGER,
  "created_by_id" TEXT,
  "created_at" INTEGER NOT NULL,
  CONSTRAINT "package_pickup_challenges_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "package_pickup_challenges_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "package_pickup_challenges_package_expires_idx" ON "package_pickup_challenges"("package_id", "expires_at");
