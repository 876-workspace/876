ALTER TABLE "console_members" ADD COLUMN "affiliation" TEXT NOT NULL DEFAULT 'staff';
ALTER TABLE "console_members" ADD COLUMN "title" TEXT;
ALTER TABLE "console_members" ADD COLUMN "expires_at" BIGINT;
ALTER TABLE "console_members" ADD COLUMN "justification" TEXT;
ALTER TABLE "console_members" ADD COLUMN "invited_by" TEXT;
