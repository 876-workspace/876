-- Rename members table to console_members (ConsoleMember model rename)
ALTER TABLE "members" RENAME TO "console_members";

-- Update role permissions from mission_control:* to console:*
UPDATE "roles"
SET permissions = ARRAY(
  SELECT REPLACE(p, 'mission_control:', 'console:')
  FROM unnest(permissions) AS p
)
WHERE EXISTS (
  SELECT 1 FROM unnest(permissions) AS p WHERE p LIKE 'mission_control:%'
);
