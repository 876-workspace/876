-- `20260817121000_billing_system_roles_backfill` repaired legacy admin/viewer
-- roles but assumed every tenant already had `owner`. The platform/operator
-- workspace proved that assumption false: a tenant can exist with admin/viewer
-- only, causing Core organization owners to resolve zero Billing permissions.
--
-- This migration is deliberately idempotent. Production may already have been
-- repaired manually; in that case it inserts nothing.
INSERT INTO "billing_roles" (
  "id", "tenant_id", "slug", "name", "description",
  "permissions", "is_system", "is_default", "created_at", "updated_at"
)
SELECT
  'role_' || replace(gen_random_uuid()::text, '-', ''),
  t."id",
  'owner',
  'Owner',
  'Unrestricted workspace access, including roles and member grants.',
  ARRAY[
    'billing:access',
    'dashboard:read',
    'customers:read',
    'customers:write',
    'catalog:read',
    'catalog:write',
    'sales:read',
    'sales:write',
    'subscriptions:read',
    'subscriptions:write',
    'reports:read',
    'settings:read',
    'currencies:read',
    'currencies:write',
    'taxes:read',
    'taxes:write',
    'members:read',
    'members:write',
    'roles:read',
    'roles:write',
    'vendors:read',
    'vendors:write',
    'purchases:read',
    'purchases:write',
    'banking:read',
    'banking:write',
    'payments:read',
    'payments:write'
  ],
  TRUE,
  FALSE,
  EXTRACT(EPOCH FROM now())::int,
  EXTRACT(EPOCH FROM now())::int
FROM "billing_tenants" t
WHERE NOT EXISTS (
  SELECT 1
  FROM "billing_roles" r
  WHERE r."tenant_id" = t."id" AND r."slug" = 'owner'
)
ON CONFLICT ("tenant_id", "slug") DO NOTHING;
