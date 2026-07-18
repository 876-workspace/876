-- Rename the Console access-grant table from "users" to "members".
-- The model was renamed from User → Member to avoid confusion with the
-- identity API's users table and to reflect the MC-specific concept.
ALTER TABLE "users" RENAME TO "members";
