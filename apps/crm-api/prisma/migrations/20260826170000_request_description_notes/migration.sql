CREATE TYPE "RequestNoteKind" AS ENUM ('DESCRIPTION', 'NOTE');

ALTER TABLE "crm_request_notes"
  ADD COLUMN "kind" "RequestNoteKind" NOT NULL DEFAULT 'NOTE',
  ADD COLUMN "edited_at" TIMESTAMP(3);

INSERT INTO "crm_request_notes" (
  "id",
  "tenant_id",
  "request_id",
  "body",
  "author_id",
  "internal",
  "kind",
  "created_at",
  "updated_at"
)
SELECT
  'crm_note_' || replace(gen_random_uuid()::text, '-', ''),
  r."tenant_id",
  r."id",
  r."description",
  r."created_by",
  false,
  'DESCRIPTION',
  r."created_at",
  r."created_at"
FROM "crm_requests" AS r
WHERE r."description" IS NOT NULL
  AND btrim(r."description") <> '';

CREATE UNIQUE INDEX "crm_request_notes_description_unique"
  ON "crm_request_notes" ("tenant_id", "request_id")
  WHERE "kind" = 'DESCRIPTION' AND "deleted_at" IS NULL;

ALTER TABLE "crm_requests" DROP COLUMN "description";
