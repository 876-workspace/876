-- Platform naming contract follow-up for the standard three-role migration.
--
-- PR #454 established the shared super_admin/admin/staff model. The model is
-- retained, but 876-owned symbolic values use kebab-case, so the canonical top
-- role is `super-admin`. The same migration canonicalizes the application-role
-- provisioning resource/property vocabulary introduced by that migration.
--
-- Physical SQL identifiers remain unchanged. All compatibility is at the value
-- layer and application readers temporarily accept the exact legacy spellings.

DO $$
BEGIN
  -- Organization role name collision in the same organization.
  IF EXISTS (
    SELECT 1
    FROM "organization_roles" legacy
    JOIN "organization_roles" canonical
      ON canonical."organization_id" = legacy."organization_id"
     AND canonical."name" = 'super-admin'
    WHERE legacy."name" = 'super_admin'
  ) THEN
    RAISE EXCEPTION
      'platform naming migration collision: organization has both super_admin and super-admin roles';
  END IF;

  -- App role key collision in the same template/org scope.
  IF EXISTS (
    SELECT 1
    FROM "app_roles" legacy
    JOIN "app_roles" canonical
      ON canonical."app_id" = legacy."app_id"
     AND canonical."organization_id" IS NOT DISTINCT FROM legacy."organization_id"
     AND canonical."key" = 'super-admin'
     AND canonical."id" <> legacy."id"
    WHERE legacy."key" = 'super_admin'
  ) THEN
    RAISE EXCEPTION
      'platform naming migration collision: app role scope has both super_admin and super-admin roles';
  END IF;

  -- Provisioning resource collision after app_role -> app-role and
  -- :super_admin -> :super-admin normalization.
  IF EXISTS (
    SELECT 1
    FROM "provisioning_resources" legacy
    JOIN "provisioning_resources" canonical
      ON canonical."revision_id" = legacy."revision_id"
     AND canonical."resource_type" = 'app-role'
     AND canonical."key" = CASE
       WHEN legacy."key" LIKE '%:super_admin'
         THEN regexp_replace(legacy."key", ':super_admin$', ':super-admin')
       ELSE legacy."key"
     END
     AND canonical."id" <> legacy."id"
    WHERE legacy."resource_type" = 'app_role'
  ) THEN
    RAISE EXCEPTION
      'platform naming migration collision: revision has both legacy and canonical app-role resources';
  END IF;

  -- Provisioning property collision on resources participating in this cutover.
  IF EXISTS (
    SELECT 1
    FROM "provisioning_properties" legacy
    JOIN "provisioning_resources" resource ON resource."id" = legacy."resource_id"
    JOIN "provisioning_properties" canonical
      ON canonical."resource_id" = legacy."resource_id"
     AND canonical."key" = CASE legacy."key"
       WHEN 'app_slug' THEN 'app-slug'
       WHEN 'role_key' THEN 'role-key'
       WHEN 'is_default' THEN 'is-default'
       WHEN 'is_system' THEN 'is-system'
     END
     AND canonical."id" <> legacy."id"
    WHERE resource."resource_type" IN ('app_role', 'app-role')
      AND legacy."key" IN ('app_slug', 'role_key', 'is_default', 'is_system')
  ) THEN
    RAISE EXCEPTION
      'platform naming migration collision: app-role resource has both legacy and canonical property keys';
  END IF;
END $$;

-- Canonical organization membership value. The role_id relationship points at
-- organization_roles.id, so changing the role name does not invalidate it.
UPDATE "memberships"
SET "role" = 'super-admin',
    "updated_at" = EXTRACT(EPOCH FROM NOW())::BIGINT
WHERE "role" = 'super_admin';

UPDATE "invite_tokens"
SET "role" = 'super-admin',
    "updated_at" = EXTRACT(EPOCH FROM NOW())::BIGINT
WHERE "role" = 'super_admin';

UPDATE "organization_roles"
SET "name" = 'super-admin',
    "updated_at" = EXTRACT(EPOCH FROM NOW())::BIGINT
WHERE "name" = 'super_admin';

-- AppRole references use the stable role id, not the key, so assignments and
-- invite-token app_role_id values remain valid while the symbolic key changes.
UPDATE "app_roles"
SET "key" = 'super-admin',
    "template_key" = CASE
      WHEN "template_key" = 'super_admin' THEN 'super-admin'
      ELSE "template_key"
    END,
    "updated_at" = EXTRACT(EPOCH FROM NOW())::BIGINT
WHERE "key" = 'super_admin';

UPDATE "app_roles"
SET "template_key" = 'super-admin',
    "updated_at" = EXTRACT(EPOCH FROM NOW())::BIGINT
WHERE "template_key" = 'super_admin';

-- Canonicalize provisioning resource identity without changing physical table
-- names or row ids. Keeping row ids stable preserves property foreign keys.
UPDATE "provisioning_resources"
SET "resource_type" = 'app-role',
    "key" = CASE
      WHEN "key" LIKE '%:super_admin'
        THEN regexp_replace("key", ':super_admin$', ':super-admin')
      ELSE "key"
    END,
    "updated_at" = EXTRACT(EPOCH FROM NOW())::BIGINT
WHERE "resource_type" = 'app_role';

-- If a canonical resource type already existed but retained the temporary role
-- suffix, normalize that suffix as well.
UPDATE "provisioning_resources"
SET "key" = regexp_replace("key", ':super_admin$', ':super-admin'),
    "updated_at" = EXTRACT(EPOCH FROM NOW())::BIGINT
WHERE "resource_type" = 'app-role'
  AND "key" LIKE '%:super_admin';

UPDATE "provisioning_properties" property
SET "key" = CASE property."key"
      WHEN 'app_slug' THEN 'app-slug'
      WHEN 'role_key' THEN 'role-key'
      WHEN 'is_default' THEN 'is-default'
      WHEN 'is_system' THEN 'is-system'
    END,
    "string_value" = CASE
      WHEN property."key" = 'role_key' AND property."string_value" = 'super_admin'
        THEN 'super-admin'
      ELSE property."string_value"
    END,
    "updated_at" = EXTRACT(EPOCH FROM NOW())::BIGINT
FROM "provisioning_resources" resource
WHERE resource."id" = property."resource_id"
  AND resource."resource_type" = 'app-role'
  AND property."key" IN ('app_slug', 'role_key', 'is_default', 'is_system');

-- Also normalize a role-key value if the key had already been migrated by a
-- prior partial deployment but its stored string value had not.
UPDATE "provisioning_properties" property
SET "string_value" = 'super-admin',
    "updated_at" = EXTRACT(EPOCH FROM NOW())::BIGINT
FROM "provisioning_resources" resource
WHERE resource."id" = property."resource_id"
  AND resource."resource_type" = 'app-role'
  AND property."key" = 'role-key'
  AND property."string_value" = 'super_admin';
