-- Every workspace is seeded with `owner`, `admin`, and `viewer` system roles,
-- because an account with no member row resolves its Billing access from the
-- role slug its 876 organization role maps to. Only `owner` was ever created,
-- so an organization's admins and members had no access to their own workspace.
-- Backfill the two missing roles for existing workspaces.
--
-- IDs match the application format: `role_` + a 32-character dashless UUID.
INSERT INTO "billing_roles" (
  "id", "tenant_id", "slug", "name", "description",
  "permissions", "is_system", "is_default", "created_at", "updated_at"
)
SELECT
  'role_' || replace(gen_random_uuid()::text, '-', ''),
  t."id",
  'admin',
  'Admin',
  'Full workspace access except editing roles, which stays with the owner.',
  ARRAY[
    'billing:access', 'dashboard:read', 'customers:read', 'customers:write',
    'catalog:read', 'catalog:write', 'sales:read', 'sales:write',
    'subscriptions:read', 'subscriptions:write', 'reports:read',
    'settings:read', 'currencies:read', 'currencies:write', 'taxes:read',
    'taxes:write', 'members:read', 'members:write', 'roles:read',
    'vendors:read', 'vendors:write', 'purchases:read', 'purchases:write',
    'banking:read', 'banking:write', 'payments:read', 'payments:write'
  ],
  TRUE,
  FALSE,
  EXTRACT(EPOCH FROM now())::int,
  EXTRACT(EPOCH FROM now())::int
FROM "billing_tenants" t
WHERE NOT EXISTS (
  SELECT 1 FROM "billing_roles" r
  WHERE r."tenant_id" = t."id" AND r."slug" = 'admin'
);

INSERT INTO "billing_roles" (
  "id", "tenant_id", "slug", "name", "description",
  "permissions", "is_system", "is_default", "created_at", "updated_at"
)
SELECT
  'role_' || replace(gen_random_uuid()::text, '-', ''),
  t."id",
  'viewer',
  'Viewer',
  'Read-only access to the workspace.',
  ARRAY[
    'billing:access', 'dashboard:read', 'customers:read', 'catalog:read',
    'sales:read', 'subscriptions:read', 'reports:read', 'settings:read',
    'currencies:read', 'taxes:read', 'members:read', 'roles:read',
    'vendors:read', 'purchases:read', 'banking:read', 'payments:read'
  ],
  TRUE,
  FALSE,
  EXTRACT(EPOCH FROM now())::int,
  EXTRACT(EPOCH FROM now())::int
FROM "billing_tenants" t
WHERE NOT EXISTS (
  SELECT 1 FROM "billing_roles" r
  WHERE r."tenant_id" = t."id" AND r."slug" = 'viewer'
);
