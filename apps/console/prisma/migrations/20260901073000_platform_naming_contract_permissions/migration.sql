-- Platform naming contract: Console operator-plane identifiers.
--
-- Physical schema identifiers remain unchanged. This migration changes only
-- 876-owned persisted symbolic values:
--   console:danger_zone -> console:danger-zone
--   super_admin         -> super-admin
--
-- `console_members.role_name` references `roles.name` with ON UPDATE CASCADE,
-- so renaming the role primary key updates member grants atomically.
--
-- Fail closed when canonical and legacy values coexist so an operator can
-- inspect the conflicting rows instead of allowing the migration to merge
-- identities or create duplicate semantic grants.

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

  IF EXISTS (SELECT 1 FROM "roles" WHERE "name" = 'super_admin')
     AND EXISTS (SELECT 1 FROM "roles" WHERE "name" = 'super-admin') THEN
    RAISE EXCEPTION
      'platform naming migration collision: both super_admin and super-admin Console roles exist';
  END IF;
END $$;

UPDATE "roles"
SET "permissions" = array_replace(
  "permissions",
  'console:danger_zone',
  'console:danger-zone'
)
WHERE 'console:danger_zone' = ANY("permissions");

UPDATE "roles"
SET "name" = 'super-admin'
WHERE "name" = 'super_admin';
