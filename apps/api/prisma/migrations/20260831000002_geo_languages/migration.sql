-- Read-only language reference data used by provisioning selectors.
--
-- This is additive. English is backfilled because Phase 1 manifests already
-- use `en` as their default language.

CREATE TABLE "languages" (
    "code" VARCHAR(35) NOT NULL,
    "name" VARCHAR NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "languages_pkey" PRIMARY KEY ("code")
);

INSERT INTO "languages" ("code", "name", "is_enabled")
VALUES ('en', 'English', true)
ON CONFLICT ("code") DO UPDATE
SET "name" = EXCLUDED."name", "is_enabled" = EXCLUDED."is_enabled";
