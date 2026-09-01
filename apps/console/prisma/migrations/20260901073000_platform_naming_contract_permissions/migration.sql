-- Platform naming contract: Console operator permissions.
--
-- Physical schema identifiers remain unchanged. Only the 876-owned persisted
-- permission value changes from `console:danger_zone` to
-- `console:danger-zone`.
--
-- Fail closed when a role already contains both spellings so an operator can
-- inspect the row instead of allowing this migration to create duplicate
-- semantic grants.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "roles"
    WHERE 'console:danger_zone' = ANY("permissions")
      AND 'console:danger-zone' = ANY("permissions")
  ) THEN
    RAISE EXCEPTION
      'platform naming migration collision: a Console role contains both console:danger_zone and console:danger-zone';
  END IF;
END $$;

UPDATE "roles"
SET "permissions" = array_replace(
  "permissions",
  'console:danger_zone',
  'console:danger-zone'
)
WHERE 'console:danger_zone' = ANY("permissions");
