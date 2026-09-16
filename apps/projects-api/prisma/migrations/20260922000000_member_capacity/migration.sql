-- Member capacity: weekly available minutes per user with an effective range.
-- Missing capacity means unknown utilisation (null), never 0% or 100%.
-- Overlapping effective ranges for one user are rejected in application code
-- with projects/capacity-overlap; the index below keeps those lookups scoped.
CREATE TABLE "projects_member_capacity" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "minutes_per_week" INTEGER NOT NULL,
    "effective_from" BIGINT NOT NULL,
    "effective_to" BIGINT,
    "deleted_at" BIGINT,
    "deleted_by" TEXT,
    "deletion_reason" TEXT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    CONSTRAINT "projects_member_capacity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "projects_member_capacity_tenant_user_from_idx" ON "projects_member_capacity"("tenant_id", "user_id", "effective_from");

-- Range and value guards so invalid capacity rows fail at the database.
ALTER TABLE "projects_member_capacity" ADD CONSTRAINT "projects_member_capacity_minutes_chk" CHECK ("minutes_per_week" > 0);
ALTER TABLE "projects_member_capacity" ADD CONSTRAINT "projects_member_capacity_effective_chk" CHECK ("effective_to" IS NULL OR "effective_to" > "effective_from");

-- AddForeignKey
ALTER TABLE "projects_member_capacity" ADD CONSTRAINT "projects_member_capacity_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "projects_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
