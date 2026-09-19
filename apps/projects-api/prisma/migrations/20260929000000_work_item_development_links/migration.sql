-- 876 Projects phase 6: development links for issue implementation records.

CREATE TABLE "work_item_development_links" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "work_item_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "label" TEXT,
    -- NOT NULL is load-bearing: Postgres treats NULLs as distinct, so a
    -- UNIQUE over a nullable external_id would never dedupe and the
    -- idempotent upsert below would silently double-link.
    "external_id" TEXT NOT NULL,
    "state" TEXT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    CONSTRAINT "work_item_development_links_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "work_item_development_links_work_item_kind_external_id_key" UNIQUE ("work_item_id", "kind", "external_id")
);

CREATE INDEX "work_item_development_links_tenant_work_item_idx" ON "work_item_development_links"("tenant_id", "work_item_id");

ALTER TABLE "work_item_development_links" ADD CONSTRAINT "work_item_development_links_tenant_fk"
    FOREIGN KEY ("tenant_id") REFERENCES "projects_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "work_item_development_links" ADD CONSTRAINT "work_item_development_links_work_item_fk"
    FOREIGN KEY ("work_item_id") REFERENCES "projects_issues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
