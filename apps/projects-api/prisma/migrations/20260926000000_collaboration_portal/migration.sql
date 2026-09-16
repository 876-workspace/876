-- 876 Projects phase 14: collaboration (followers, discussions, wiki),
-- client portal grants, attachment links, and per-record client visibility.
CREATE TABLE "projects_followers" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "subject_type" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" BIGINT NOT NULL,
    CONSTRAINT "projects_followers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "projects_discussions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "client_visible" BOOLEAN NOT NULL DEFAULT false,
    "author_user_id" TEXT,
    "deleted_at" BIGINT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    CONSTRAINT "projects_discussions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "projects_discussion_posts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "discussion_id" TEXT NOT NULL,
    "author_user_id" TEXT,
    "body" TEXT NOT NULL,
    "deleted_at" BIGINT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    CONSTRAINT "projects_discussion_posts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "projects_discussion_post_edits" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "edited_by" TEXT,
    "created_at" BIGINT NOT NULL,
    CONSTRAINT "projects_discussion_post_edits_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "projects_wiki_pages" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "parent_page_id" TEXT,
    "deleted_at" BIGINT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    CONSTRAINT "projects_wiki_pages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "projects_wiki_revisions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "page_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "author_user_id" TEXT,
    "created_at" BIGINT NOT NULL,
    CONSTRAINT "projects_wiki_revisions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "projects_client_grants" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "allow_comments" BOOLEAN NOT NULL DEFAULT true,
    "allow_discussions" BOOLEAN NOT NULL DEFAULT true,
    "allow_files" BOOLEAN NOT NULL DEFAULT true,
    "allow_time" BOOLEAN NOT NULL DEFAULT true,
    "allow_invoices" BOOLEAN NOT NULL DEFAULT true,
    "allow_wiki" BOOLEAN NOT NULL DEFAULT true,
    "invited_by" TEXT,
    "revoked_at" BIGINT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    CONSTRAINT "projects_client_grants_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "projects_attachment_links" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "issue_id" TEXT,
    "milestone_id" TEXT,
    "url" TEXT NOT NULL,
    "name" TEXT,
    "client_visible" BOOLEAN NOT NULL DEFAULT false,
    "created_by" TEXT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    CONSTRAINT "projects_attachment_links_pkey" PRIMARY KEY ("id")
);

-- Client visibility is opt-in per record: existing rows stay internal.
ALTER TABLE "projects_issues" ADD COLUMN "client_visible" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "projects_milestones" ADD COLUMN "client_visible" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "projects_comments" ADD COLUMN "client_visible" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "projects_milestone_comments" ADD COLUMN "client_visible" BOOLEAN NOT NULL DEFAULT false;

-- Guards so invalid rows fail at the database.
ALTER TABLE "projects_followers" ADD CONSTRAINT "projects_followers_subject_chk" CHECK ("subject_type" IN ('project', 'phase', 'work-item'));

-- CreateIndex
ALTER TABLE "projects_followers" ADD CONSTRAINT "projects_followers_unique" UNIQUE ("tenant_id", "subject_type", "subject_id", "user_id");
CREATE INDEX "projects_followers_tenant_user_idx" ON "projects_followers"("tenant_id", "user_id");
CREATE INDEX "projects_discussions_tenant_project_idx" ON "projects_discussions"("tenant_id", "project_id");
CREATE INDEX "projects_discussion_posts_discussion_idx" ON "projects_discussion_posts"("discussion_id", "created_at");
CREATE INDEX "projects_discussion_post_edits_post_idx" ON "projects_discussion_post_edits"("post_id", "created_at");
ALTER TABLE "projects_wiki_pages" ADD CONSTRAINT "projects_wiki_pages_project_slug_uidx" UNIQUE ("project_id", "slug");
CREATE INDEX "projects_wiki_pages_tenant_project_idx" ON "projects_wiki_pages"("tenant_id", "project_id");
CREATE INDEX "projects_wiki_revisions_page_idx" ON "projects_wiki_revisions"("page_id", "created_at");
ALTER TABLE "projects_client_grants" ADD CONSTRAINT "projects_client_grants_unique" UNIQUE ("tenant_id", "project_id", "user_id");
CREATE INDEX "projects_client_grants_tenant_user_idx" ON "projects_client_grants"("tenant_id", "user_id");
CREATE INDEX "projects_attachment_links_tenant_project_idx" ON "projects_attachment_links"("tenant_id", "project_id");

-- AddForeignKey
ALTER TABLE "projects_followers" ADD CONSTRAINT "projects_followers_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "projects_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_discussions" ADD CONSTRAINT "projects_discussions_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "projects_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_discussions" ADD CONSTRAINT "projects_discussions_project_fkey" FOREIGN KEY ("project_id") REFERENCES "projects_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_discussion_posts" ADD CONSTRAINT "projects_discussion_posts_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "projects_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_discussion_posts" ADD CONSTRAINT "projects_discussion_posts_discussion_fkey" FOREIGN KEY ("discussion_id") REFERENCES "projects_discussions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_discussion_post_edits" ADD CONSTRAINT "projects_discussion_post_edits_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "projects_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_discussion_post_edits" ADD CONSTRAINT "projects_discussion_post_edits_post_fkey" FOREIGN KEY ("post_id") REFERENCES "projects_discussion_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_wiki_pages" ADD CONSTRAINT "projects_wiki_pages_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "projects_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_wiki_pages" ADD CONSTRAINT "projects_wiki_pages_project_fkey" FOREIGN KEY ("project_id") REFERENCES "projects_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_wiki_pages" ADD CONSTRAINT "projects_wiki_pages_parent_fkey" FOREIGN KEY ("parent_page_id") REFERENCES "projects_wiki_pages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "projects_wiki_revisions" ADD CONSTRAINT "projects_wiki_revisions_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "projects_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_wiki_revisions" ADD CONSTRAINT "projects_wiki_revisions_page_fkey" FOREIGN KEY ("page_id") REFERENCES "projects_wiki_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_client_grants" ADD CONSTRAINT "projects_client_grants_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "projects_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_client_grants" ADD CONSTRAINT "projects_client_grants_project_fkey" FOREIGN KEY ("project_id") REFERENCES "projects_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_attachment_links" ADD CONSTRAINT "projects_attachment_links_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "projects_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_attachment_links" ADD CONSTRAINT "projects_attachment_links_project_fkey" FOREIGN KEY ("project_id") REFERENCES "projects_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
