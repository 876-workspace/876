-- CreateTable
CREATE TABLE "app_permissions" (
    "id" VARCHAR NOT NULL,
    "app_id" VARCHAR NOT NULL,
    "key" VARCHAR NOT NULL,
    "module_key" VARCHAR NOT NULL,
    "action" VARCHAR NOT NULL,
    "label" VARCHAR NOT NULL,
    "description" TEXT,
    "is_dangerous" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,

    CONSTRAINT "app_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_roles" (
    "id" VARCHAR NOT NULL,
    "app_id" VARCHAR NOT NULL,
    "organization_id" VARCHAR,
    "key" VARCHAR NOT NULL,
    "name" VARCHAR NOT NULL,
    "description" TEXT,
    "permissions" VARCHAR[] NOT NULL DEFAULT ARRAY[]::VARCHAR[],
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "template_key" VARCHAR,
    "position" INTEGER NOT NULL DEFAULT 0,
    "deleted_at" BIGINT,
    "deleted_by" VARCHAR,
    "deletion_reason" TEXT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,

    CONSTRAINT "app_roles_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "app_assignments"
    ADD COLUMN "app_role_id" VARCHAR,
    ADD COLUMN "permission_grants" VARCHAR[] NOT NULL DEFAULT ARRAY[]::VARCHAR[],
    ADD COLUMN "permission_denies" VARCHAR[] NOT NULL DEFAULT ARRAY[]::VARCHAR[],
    ADD COLUMN "title" VARCHAR,
    ADD COLUMN "attributes" JSON,
    ADD COLUMN "assigned_at" BIGINT,
    ADD COLUMN "last_access_at" BIGINT,
    ADD COLUMN "revoked_at" BIGINT,
    ADD COLUMN "revoked_by" VARCHAR,
    ADD COLUMN "deleted_at" BIGINT,
    ADD COLUMN "deleted_by" VARCHAR,
    ADD COLUMN "deletion_reason" TEXT;

-- AlterTable
ALTER TABLE "memberships" ADD COLUMN "position" VARCHAR;

-- AlterTable
ALTER TABLE "invite_tokens"
    ADD COLUMN "app_role_id" VARCHAR,
    ADD COLUMN "org_role_id" VARCHAR;

-- CreateIndex
CREATE UNIQUE INDEX "app_permissions_app_id_key_key" ON "app_permissions"("app_id", "key");

-- CreateIndex
CREATE INDEX "ix_app_permissions_app_id" ON "app_permissions"("app_id");

-- CreateIndex
CREATE UNIQUE INDEX "app_roles_app_id_organization_id_key_key" ON "app_roles"("app_id", "organization_id", "key");

-- CreateIndex
CREATE INDEX "ix_app_roles_app_id" ON "app_roles"("app_id");

-- CreateIndex
CREATE INDEX "ix_app_roles_organization_id" ON "app_roles"("organization_id");

-- CreateIndex
CREATE INDEX "ix_app_assignments_app_role_id" ON "app_assignments"("app_role_id");

-- AddForeignKey
ALTER TABLE "app_permissions" ADD CONSTRAINT "app_permissions_app_id_fkey" FOREIGN KEY ("app_id") REFERENCES "apps"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app_roles" ADD CONSTRAINT "app_roles_app_id_fkey" FOREIGN KEY ("app_id") REFERENCES "apps"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app_assignments" ADD CONSTRAINT "app_assignments_app_role_id_fkey" FOREIGN KEY ("app_role_id") REFERENCES "app_roles"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
