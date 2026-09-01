-- Replace Billing's owner/viewer model with the ecosystem role shape.

WITH canonical AS (
  SELECT old_role."tenant_id", old_role."id" AS old_id,
         existing."id" AS existing_id
  FROM "billing_roles" old_role
  JOIN "billing_roles" existing
    ON existing."tenant_id" = old_role."tenant_id"
   AND existing."slug" = 'super_admin'
  WHERE old_role."slug" = 'owner'
)
UPDATE "billing_members" member
SET "role_id" = canonical.existing_id,
    "updated_at" = EXTRACT(EPOCH FROM NOW())::INTEGER
FROM canonical
WHERE member."role_id" = canonical.old_id;

DELETE FROM "billing_roles" old_role
USING "billing_roles" existing
WHERE old_role."tenant_id" = existing."tenant_id"
  AND old_role."slug" = 'owner'
  AND existing."slug" = 'super_admin';

UPDATE "billing_roles"
SET "slug" = 'super_admin',
    "name" = 'Super Admin',
    "description" = 'Unrestricted workspace access, including roles and member grants.',
    "updated_at" = EXTRACT(EPOCH FROM NOW())::INTEGER
WHERE "slug" = 'owner';

WITH canonical AS (
  SELECT old_role."tenant_id", old_role."id" AS old_id,
         existing."id" AS existing_id
  FROM "billing_roles" old_role
  JOIN "billing_roles" existing
    ON existing."tenant_id" = old_role."tenant_id"
   AND existing."slug" = 'staff'
  WHERE old_role."slug" = 'viewer'
)
UPDATE "billing_members" member
SET "role_id" = canonical.existing_id,
    "updated_at" = EXTRACT(EPOCH FROM NOW())::INTEGER
FROM canonical
WHERE member."role_id" = canonical.old_id;

DELETE FROM "billing_roles" old_role
USING "billing_roles" existing
WHERE old_role."tenant_id" = existing."tenant_id"
  AND old_role."slug" = 'viewer'
  AND existing."slug" = 'staff';

UPDATE "billing_roles"
SET "slug" = 'staff',
    "name" = 'Staff',
    "description" = 'Read-only access to the workspace.',
    "updated_at" = EXTRACT(EPOCH FROM NOW())::INTEGER
WHERE "slug" = 'viewer';

WITH definitions AS (
  SELECT 'super_admin'::TEXT AS slug, 'Super Admin'::TEXT AS name,
         'Unrestricted workspace access, including roles and member grants.'::TEXT AS description,
         false AS is_default
  UNION ALL SELECT 'admin', 'Admin',
         'Administrative and operational access without role administration.', false
  UNION ALL SELECT 'staff', 'Staff', 'Read-only access to the workspace.', true
)
INSERT INTO "billing_roles" (
  "id", "tenant_id", "slug", "name", "description", "permissions",
  "is_system", "is_default", "created_at", "updated_at"
)
SELECT 'Role_' || md5(tenant."id" || ':' || definition.slug), tenant."id",
       definition.slug, definition.name, definition.description, ARRAY[]::TEXT[],
       true, definition.is_default,
       EXTRACT(EPOCH FROM NOW())::INTEGER, EXTRACT(EPOCH FROM NOW())::INTEGER
FROM "billing_tenants" tenant CROSS JOIN definitions definition
ON CONFLICT ("tenant_id", "slug") DO NOTHING;

UPDATE "billing_members" member
SET "role_id" = staff."id",
    "updated_at" = EXTRACT(EPOCH FROM NOW())::INTEGER
FROM "billing_roles" old_role
JOIN "billing_roles" staff
  ON staff."tenant_id" = old_role."tenant_id" AND staff."slug" = 'staff'
WHERE member."role_id" = old_role."id"
  AND old_role."slug" NOT IN ('super_admin', 'admin', 'staff');

DELETE FROM "billing_roles"
WHERE "slug" NOT IN ('super_admin', 'admin', 'staff');

UPDATE "billing_roles" role
SET "permissions" = CASE role."slug"
  WHEN 'super_admin' THEN ARRAY[
    'billing:access','dashboard:read','customers:read','customers:write',
    'catalog:read','catalog:write','sales:read','sales:write',
    'subscriptions:read','subscriptions:write','reports:read','settings:read',
    'currencies:read','currencies:write','taxes:read','taxes:write',
    'members:read','members:write','roles:read','roles:write','vendors:read',
    'vendors:write','purchases:read','purchases:write','banking:read',
    'banking:write','payments:read','payments:write','payment_methods:read',
    'payment_methods:write'
  ]::TEXT[]
  WHEN 'admin' THEN ARRAY[
    'billing:access','dashboard:read','customers:read','customers:write',
    'catalog:read','catalog:write','sales:read','sales:write',
    'subscriptions:read','subscriptions:write','reports:read','settings:read',
    'currencies:read','currencies:write','taxes:read','taxes:write',
    'members:read','members:write','roles:read','vendors:read','vendors:write',
    'purchases:read','purchases:write','banking:read','banking:write',
    'payments:read','payments:write','payment_methods:read','payment_methods:write'
  ]::TEXT[]
  ELSE ARRAY[
    'billing:access','dashboard:read','customers:read','catalog:read',
    'sales:read','subscriptions:read','reports:read','settings:read',
    'currencies:read','taxes:read','members:read','roles:read','vendors:read',
    'purchases:read','banking:read','payments:read','payment_methods:read'
  ]::TEXT[]
END,
"name" = CASE role."slug" WHEN 'super_admin' THEN 'Super Admin' WHEN 'admin' THEN 'Admin' ELSE 'Staff' END,
"is_system" = true,
"is_default" = role."slug" = 'staff',
"updated_at" = EXTRACT(EPOCH FROM NOW())::INTEGER;
