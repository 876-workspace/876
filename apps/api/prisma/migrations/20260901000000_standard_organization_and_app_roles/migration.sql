-- Replace the ownership role model with one shared organization/app role shape.
-- This is intentionally a breaking data migration: owner and bespoke system
-- app roles are not retained as compatibility aliases.

UPDATE "memberships"
SET "role" = CASE
  WHEN "role" = 'owner' THEN 'super_admin'
  WHEN "role" IN ('member', 'billing_manager') THEN 'staff'
  ELSE "role"
END,
"updated_at" = EXTRACT(EPOCH FROM NOW())::BIGINT
WHERE "role" IN ('owner', 'member', 'billing_manager');

ALTER TABLE "memberships" ALTER COLUMN "role" SET DEFAULT 'staff';
ALTER TABLE "invite_tokens" ALTER COLUMN "role" SET DEFAULT 'staff';

-- Collapse any pre-existing custom role using a new standard name into the
-- corresponding old system role before renaming that system role.
UPDATE "memberships" membership
SET "role_id" = canonical."id",
    "updated_at" = EXTRACT(EPOCH FROM NOW())::BIGINT
FROM "organization_roles" duplicate
JOIN "organization_roles" canonical
  ON canonical."organization_id" = duplicate."organization_id"
 AND canonical."name" = CASE
   WHEN duplicate."name" = 'super_admin' THEN 'owner'
   WHEN duplicate."name" = 'staff' THEN 'member'
 END
WHERE duplicate."name" IN ('super_admin', 'staff')
  AND membership."role_id" = duplicate."id";

UPDATE "invite_tokens" invite
SET "org_role_id" = canonical."id"
FROM "organization_roles" duplicate
JOIN "organization_roles" canonical
  ON canonical."organization_id" = duplicate."organization_id"
 AND canonical."name" = CASE
   WHEN duplicate."name" = 'super_admin' THEN 'owner'
   WHEN duplicate."name" = 'staff' THEN 'member'
 END
WHERE duplicate."name" IN ('super_admin', 'staff')
  AND invite."org_role_id" = duplicate."id";

DELETE FROM "organization_roles"
WHERE "name" IN ('super_admin', 'staff');

UPDATE "organization_roles"
SET "name" = 'super_admin',
    "display_name" = 'Super Admin',
    "description" = 'Full control of the organization, including billing and deletion.',
    "permissions" = ARRAY[
      'apps:assign','apps:provision','apps:read','billing:manage','billing:read',
      'members:invite','members:manage','members:read','org:delete','org:read',
      'org:update','roles:manage','roles:read','structure:manage','structure:read'
    ]::VARCHAR[],
    "is_system" = true,
    "updated_at" = EXTRACT(EPOCH FROM NOW())::BIGINT
WHERE "name" = 'owner';

UPDATE "organization_roles"
SET "permissions" = ARRAY[
      'apps:assign','apps:provision','apps:read','members:invite',
      'members:manage','members:read','org:read','org:update','roles:manage',
      'roles:read','structure:manage','structure:read'
    ]::VARCHAR[],
    "is_system" = true,
    "updated_at" = EXTRACT(EPOCH FROM NOW())::BIGINT
WHERE "name" = 'admin';

UPDATE "organization_roles"
SET "name" = 'staff',
    "display_name" = 'Staff',
    "description" = 'Default role. Views the organization directory.',
    "permissions" = ARRAY['org:read','members:read','structure:read']::VARCHAR[],
    "is_system" = true,
    "updated_at" = EXTRACT(EPOCH FROM NOW())::BIGINT
WHERE "name" = 'member';

UPDATE "memberships" membership
SET "role_id" = staff."id",
    "updated_at" = EXTRACT(EPOCH FROM NOW())::BIGINT
FROM "organization_roles" obsolete
JOIN "organization_roles" staff
  ON staff."organization_id" = obsolete."organization_id"
 AND staff."name" = 'staff'
WHERE obsolete."name" = 'billing_manager'
  AND membership."role_id" = obsolete."id";

UPDATE "invite_tokens" invite
SET "org_role_id" = staff."id"
FROM "organization_roles" obsolete
JOIN "organization_roles" staff
  ON staff."organization_id" = obsolete."organization_id"
 AND staff."name" = 'staff'
WHERE obsolete."name" = 'billing_manager'
  AND invite."org_role_id" = obsolete."id";

DELETE FROM "organization_roles" WHERE "name" = 'billing_manager';

-- Create the shared role shape in every app-role scope (template and org copy).
WITH scopes AS (
  SELECT app."id" AS app_id, NULL::VARCHAR AS organization_id
  FROM "apps" app WHERE app."slug" <> '876-enterprise'
  UNION
  SELECT subscription."app_id", subscription."organization_id"
  FROM "subscriptions" subscription
  JOIN "apps" app ON app."id" = subscription."app_id"
  WHERE app."slug" <> '876-enterprise'
), role_definitions AS (
  SELECT 'super_admin'::VARCHAR AS key, 'Super Admin'::VARCHAR AS name,
         'Full access to this application.'::TEXT AS description,
         false AS is_default, 0 AS position
  UNION ALL
  SELECT 'admin', 'Admin',
         'Administrative and operational access without destructive actions.',
         false, 10
  UNION ALL
  SELECT 'staff', 'Staff', 'Read-only access to this application.', true, 20
)
INSERT INTO "app_roles" (
  "id", "app_id", "organization_id", "key", "name", "description",
  "permissions", "is_system", "is_default", "template_key", "position",
  "created_at", "updated_at"
)
SELECT
  'role_' || md5(scope.app_id || ':' || COALESCE(scope.organization_id, 'template') || ':' || definition.key),
  scope.app_id,
  scope.organization_id,
  definition.key,
  definition.name,
  definition.description,
  CASE
    WHEN definition.key = 'super_admin' THEN ARRAY_AGG(permission."key" ORDER BY permission."key")
    WHEN definition.key = 'admin' THEN ARRAY_AGG(permission."key" ORDER BY permission."key") FILTER (WHERE permission."action" <> 'delete')
    ELSE ARRAY_AGG(permission."key" ORDER BY permission."key") FILTER (WHERE permission."action" = 'view')
  END,
  true,
  definition.is_default,
  definition.key,
  definition.position,
  EXTRACT(EPOCH FROM NOW())::BIGINT,
  EXTRACT(EPOCH FROM NOW())::BIGINT
FROM scopes scope
CROSS JOIN role_definitions definition
JOIN "app_permissions" permission ON permission."app_id" = scope.app_id
GROUP BY scope.app_id, scope.organization_id, definition.key, definition.name,
         definition.description, definition.is_default, definition.position
ON CONFLICT DO NOTHING;

-- Move assignments/invites off every non-standard role, preserving elevation
-- only for the retired owner role.
UPDATE "app_assignments" assignment
SET "app_role_id" = replacement."id",
    "updated_at" = EXTRACT(EPOCH FROM NOW())::BIGINT
FROM "app_roles" old_role
JOIN "app_roles" replacement
  ON replacement."app_id" = old_role."app_id"
 AND replacement."organization_id" IS NOT DISTINCT FROM old_role."organization_id"
 AND replacement."key" = CASE WHEN old_role."key" = 'owner' THEN 'super_admin' ELSE 'staff' END
WHERE assignment."app_role_id" = old_role."id"
  AND old_role."key" NOT IN ('super_admin', 'admin', 'staff');

UPDATE "invite_tokens" invite
SET "app_role_id" = replacement."id"
FROM "app_roles" old_role
JOIN "app_roles" replacement
  ON replacement."app_id" = old_role."app_id"
 AND replacement."organization_id" IS NOT DISTINCT FROM old_role."organization_id"
 AND replacement."key" = CASE WHEN old_role."key" = 'owner' THEN 'super_admin' ELSE 'staff' END
WHERE invite."app_role_id" = old_role."id"
  AND old_role."key" NOT IN ('super_admin', 'admin', 'staff');

DELETE FROM "app_roles" WHERE "key" NOT IN ('super_admin', 'admin', 'staff');

UPDATE "app_roles" role
SET "name" = CASE role."key" WHEN 'super_admin' THEN 'Super Admin' WHEN 'admin' THEN 'Admin' ELSE 'Staff' END,
    "description" = CASE role."key"
      WHEN 'super_admin' THEN 'Full access to this application.'
      WHEN 'admin' THEN 'Administrative and operational access without destructive actions.'
      ELSE 'Read-only access to this application.'
    END,
    "permissions" = CASE role."key"
      WHEN 'super_admin' THEN ARRAY(SELECT permission."key" FROM "app_permissions" permission WHERE permission."app_id" = role."app_id" ORDER BY permission."key")
      WHEN 'admin' THEN ARRAY(SELECT permission."key" FROM "app_permissions" permission WHERE permission."app_id" = role."app_id" AND permission."action" <> 'delete' ORDER BY permission."key")
      ELSE ARRAY(SELECT permission."key" FROM "app_permissions" permission WHERE permission."app_id" = role."app_id" AND permission."action" = 'view' ORDER BY permission."key")
    END,
    "is_system" = true,
    "is_default" = role."key" = 'staff',
    "template_key" = role."key",
    "position" = CASE role."key" WHEN 'super_admin' THEN 0 WHEN 'admin' THEN 10 ELSE 20 END,
    "updated_at" = EXTRACT(EPOCH FROM NOW())::BIGINT;

-- Persist the same role details in every existing application manifest
-- revision so role provisioning is part of the selected database recipe.
DELETE FROM "provisioning_resources" resource
USING "provisioning_manifest_revisions" revision,
      "provisioning_manifests" manifest,
      "application_provisioning_profiles" profile,
      "apps" app
WHERE resource."revision_id" = revision."id"
  AND revision."manifest_id" = manifest."id"
  AND profile."manifest_target_key" = manifest."target_key"
  AND app."id" = profile."app_id"
  AND manifest."target_type" = 'application'
  AND app."slug" <> '876-enterprise'
  AND resource."resource_type" = 'app_role';

WITH revisions AS (
  SELECT revision."id" AS revision_id, app."id" AS app_id, app."slug" AS app_slug,
         COALESCE((SELECT MAX(resource."position") FROM "provisioning_resources" resource WHERE resource."revision_id" = revision."id"), 0) AS base_position
  FROM "provisioning_manifest_revisions" revision
  JOIN "provisioning_manifests" manifest ON manifest."id" = revision."manifest_id"
  JOIN "application_provisioning_profiles" profile ON profile."manifest_target_key" = manifest."target_key"
  JOIN "apps" app ON app."id" = profile."app_id"
  WHERE manifest."target_type" = 'application' AND app."slug" <> '876-enterprise'
), definitions AS (
  SELECT 'super_admin'::VARCHAR AS role_key, 'Super Admin'::VARCHAR AS role_name,
         'Full access to this application.'::TEXT AS description, false AS is_default, 10 AS offset
  UNION ALL SELECT 'admin', 'Admin', 'Administrative and operational access without destructive actions.', false, 20
  UNION ALL SELECT 'staff', 'Staff', 'Read-only access to this application.', true, 30
)
INSERT INTO "provisioning_resources" ("id", "revision_id", "resource_type", "key", "position", "created_at", "updated_at")
SELECT 'pr_' || md5(revision.revision_id || ':app_role:' || definition.role_key),
       revision.revision_id, 'app_role', revision.app_slug || ':' || definition.role_key,
       revision.base_position + definition.offset,
       EXTRACT(EPOCH FROM NOW())::BIGINT, EXTRACT(EPOCH FROM NOW())::BIGINT
FROM revisions revision CROSS JOIN definitions definition
ON CONFLICT DO NOTHING;

WITH role_resources AS (
  SELECT resource."id", resource."revision_id", resource."key",
         app."id" AS app_id, app."slug" AS app_slug,
         split_part(resource."key", ':', 2) AS role_key
  FROM "provisioning_resources" resource
  JOIN "provisioning_manifest_revisions" revision ON revision."id" = resource."revision_id"
  JOIN "provisioning_manifests" manifest ON manifest."id" = revision."manifest_id"
  JOIN "application_provisioning_profiles" profile ON profile."manifest_target_key" = manifest."target_key"
  JOIN "apps" app ON app."id" = profile."app_id"
  WHERE resource."resource_type" = 'app_role'
), properties AS (
  SELECT role_resource."id" AS resource_id, property.key, property.value_type,
         property.string_value, property.integer_value, property.boolean_value
  FROM role_resources role_resource
  CROSS JOIN LATERAL (
    VALUES
      ('app_slug', 'string', role_resource.app_slug::TEXT, NULL::BIGINT, NULL::BOOLEAN),
      ('role_key', 'string', role_resource.role_key::TEXT, NULL::BIGINT, NULL::BOOLEAN),
      ('name', 'string', CASE role_resource.role_key WHEN 'super_admin' THEN 'Super Admin' WHEN 'admin' THEN 'Admin' ELSE 'Staff' END, NULL::BIGINT, NULL::BOOLEAN),
      ('description', 'string', CASE role_resource.role_key WHEN 'super_admin' THEN 'Full access to this application.' WHEN 'admin' THEN 'Administrative and operational access without destructive actions.' ELSE 'Read-only access to this application.' END, NULL::BIGINT, NULL::BOOLEAN),
      ('permissions', 'string', CASE role_resource.role_key
        WHEN 'super_admin' THEN (SELECT string_agg(permission."key", ',' ORDER BY permission."key") FROM "app_permissions" permission WHERE permission."app_id" = role_resource.app_id)
        WHEN 'admin' THEN (SELECT string_agg(permission."key", ',' ORDER BY permission."key") FROM "app_permissions" permission WHERE permission."app_id" = role_resource.app_id AND permission."action" <> 'delete')
        ELSE (SELECT string_agg(permission."key", ',' ORDER BY permission."key") FROM "app_permissions" permission WHERE permission."app_id" = role_resource.app_id AND permission."action" = 'view') END, NULL::BIGINT, NULL::BOOLEAN),
      ('is_default', 'boolean', NULL::TEXT, NULL::BIGINT, role_resource.role_key = 'staff'),
      ('is_system', 'boolean', NULL::TEXT, NULL::BIGINT, true),
      ('position', 'integer', NULL::TEXT, CASE role_resource.role_key WHEN 'super_admin' THEN 0 WHEN 'admin' THEN 10 ELSE 20 END::BIGINT, NULL::BOOLEAN)
  ) AS property(key, value_type, string_value, integer_value, boolean_value)
)
INSERT INTO "provisioning_properties" (
  "id", "resource_id", "key", "value_type", "string_value", "integer_value",
  "decimal_value", "boolean_value", "reference_namespace", "reference_key",
  "created_at", "updated_at"
)
SELECT 'pp_' || md5(property.resource_id || ':' || property.key), property.resource_id,
       property.key, property.value_type, property.string_value,
       property.integer_value, NULL, property.boolean_value, NULL, NULL,
       EXTRACT(EPOCH FROM NOW())::BIGINT, EXTRACT(EPOCH FROM NOW())::BIGINT
FROM properties property
ON CONFLICT ("resource_id", "key") DO UPDATE SET
  "value_type" = EXCLUDED."value_type",
  "string_value" = EXCLUDED."string_value",
  "integer_value" = EXCLUDED."integer_value",
  "boolean_value" = EXCLUDED."boolean_value",
  "updated_at" = EXCLUDED."updated_at";
