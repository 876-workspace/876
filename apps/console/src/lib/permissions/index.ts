import { can, groupByModule, type AccessContext } from '@876/core/access'
import { consolePermissionCatalog } from '@876/core/access/catalogs'

import {
  operatorExclusiveCatalog,
  operatorExclusivePermissionKeys,
  operatorProductCatalogs,
  projectedPermissionKeys,
} from '@/lib/operator-permissions'
import type { Access } from '@/types/auth'
import type { PermissionGroup } from '@/types/permission'
import type { SystemRole } from '@/types/role'

/**
 * Console role/permission catalog.
 *
 * Console — not the identity platform — owns "who can use the admin console
 * and with what permissions." The canonical vocabulary lives in @876/core;
 * this module owns only Console's role bundles and the adapter used by its UI.
 */

/** Resource-level read permissions granted to staff and above. */
const RESOURCE_READ = [
  'users:read',
  'users:list',
  'users:search',
  'organizations:read',
  'organizations:list',
  'organizations:search',
  'memberships:read',
  'memberships:list',
  'apps:read',
  'apps:list',
  'roles:read',
  'roles:list',
] as const

/** Resource-level write permissions granted to admin and above. */
const RESOURCE_WRITE = [
  'users:create',
  'users:update',
  'organizations:create',
  'organizations:update',
  'memberships:create',
  'memberships:update',
  'roles:create',
  'roles:update',
  'apps:create',
  'apps:update',
] as const

/**
 * Team-grant management. Granting Console access is itself privilege
 * escalation, so it sits with admin and above — never with staff.
 * `assertRoleChangeAllowed` keeps super-admin grants to a super admin.
 */
const TEAM_MANAGE = [
  'team:read',
  'team:list',
  'team:invite',
  'team:update',
  'team:suspend',
  'team:revoke',
] as const

/**
 * Every product's read-only projected permission — `crm/requests.view`,
 * `billing/customers.view`, … — granted to staff. Generated, not hand-listed,
 * so a new product module is read-visible to staff the moment its catalog
 * exists, with nothing here to update.
 */
const PRODUCT_VIEW = projectedPermissionKeys((action) => action === 'view')

/**
 * Every product's full projected permission set, granted to admin and above.
 * This is what keeps a workspace's rail fully populated for admin/super-admin
 * exactly as it was before §6.2's AND — the difference is the grant is now an
 * explicit, auditable permission on the role rather than an unconditional
 * "operators see everything" bypass.
 */
const PRODUCT_ALL = projectedPermissionKeys()

/**
 * Purge, per product. Console-only; never appears in a product's own catalog.
 * Reserved for super-admin — `.claude/rules/access-tiers.md` §6.1's PayPal-
 * dispute shape: a vendor's own admin (or a Console admin acting as one) must
 * not be able to grant themselves platform intervention on their own data.
 */
const OPERATOR_EXCLUSIVE_ALL = operatorExclusivePermissionKeys()

/**
 * The cross-organization read grant, per product — "all open requests from
 * every organization" (plan §3.3). Unlike purge this discloses rather than
 * destroys, so it is granted to admin as well as super-admin, not reserved
 * to the top role alone.
 */
const OPERATOR_CROSS_ORG_VIEW = operatorExclusivePermissionKeys(
  (action) => action === 'view-all'
)

/** Permission that gates entry to Console itself. */
export const CONSOLE_ACCESS_PERMISSION = 'console:access'

/** Permission that gates destructive (danger-zone) operations. */
export const CONSOLE_DANGER_ZONE_PERMISSION = 'console:danger-zone'

/** Canonical top-level Console role. */
export const CONSOLE_SUPER_ADMIN_ROLE = 'super-admin'

/** Exact persisted aliases accepted only during the naming migration. */
const LEGACY_CONSOLE_DANGER_ZONE_PERMISSION = 'console:danger_zone'
const LEGACY_CONSOLE_SUPER_ADMIN_ROLE = 'super_admin'

export function canonicalConsoleRole(role: string): string {
  return role === LEGACY_CONSOLE_SUPER_ADMIN_ROLE
    ? CONSOLE_SUPER_ADMIN_ROLE
    : role
}

function canonicalPermission(permission: string): string {
  return permission === LEGACY_CONSOLE_DANGER_ZONE_PERMISSION
    ? CONSOLE_DANGER_ZONE_PERMISSION
    : permission
}

function canonicalPermissions(permissions: readonly string[]): string[] {
  if (!Array.isArray(permissions)) return []

  return [
    ...new Set(
      permissions
        .filter(
          (permission): permission is string => typeof permission === 'string'
        )
        .map(canonicalPermission)
    ),
  ]
}

function accessContext(access: Pick<Access, 'permissions'>): AccessContext {
  return {
    subject: { userId: '' },
    permissions: canonicalPermissions(access.permissions),
    features: [],
    experiments: {},
  }
}

export function hasPermission(
  access: Pick<Access, 'permissions'>,
  permission: string
): boolean {
  if (typeof permission !== 'string') return false
  return can(accessContext(access), canonicalPermission(permission))
}

/**
 * Seed definitions for the 3 system Console roles. Used to seed `roles` on
 * first run and as a fallback before the table is populated. Consumers (no
 * team row) have no role and no permissions.
 */
export const SYSTEM_ROLE_DEFINITIONS: SystemRole[] = [
  {
    name: 'staff',
    displayName: 'Staff',
    description: 'Read-only access to Console data.',
    permissions: [
      'console:access',
      'console:requests',
      'console:reports',
      ...RESOURCE_READ,
      ...PRODUCT_VIEW,
    ],
  },
  {
    name: 'admin',
    displayName: 'Admin',
    description:
      'Full management access — create, update, and manage all resources.',
    permissions: [
      'console:access',
      'console:projects',
      'console:requests',
      'console:settings',
      'console:billing',
      'console:users',
      'console:organizations',
      'console:apps',
      'console:features',
      'console:widgets',
      'console:storage',
      'console:reports',
      ...RESOURCE_READ,
      ...RESOURCE_WRITE,
      ...TEAM_MANAGE,
      ...PRODUCT_ALL,
      ...OPERATOR_CROSS_ORG_VIEW,
    ],
  },
  {
    name: CONSOLE_SUPER_ADMIN_ROLE,
    displayName: 'Super Admin',
    description: 'All permissions including danger zone operations.',
    permissions: [
      'console:access',
      'console:projects',
      'console:requests',
      'console:settings',
      'console:billing',
      'console:users',
      'console:organizations',
      'console:apps',
      'console:features',
      'console:widgets',
      'console:storage',
      'console:reports',
      'console:security',
      CONSOLE_DANGER_ZONE_PERMISSION,
      ...RESOURCE_READ,
      ...RESOURCE_WRITE,
      ...TEAM_MANAGE,
      'roles:delete',
      'users:delete',
      'organizations:delete',
      'memberships:delete',
      'apps:delete',
      ...PRODUCT_ALL,
      ...OPERATOR_EXCLUSIVE_ALL,
    ],
  },
]

const CATALOG_KEYS = new Set([
  ...consolePermissionCatalog.permissions.map((permission) => permission.key),
  ...PRODUCT_ALL,
  ...OPERATOR_EXCLUSIVE_ALL,
])

for (const role of SYSTEM_ROLE_DEFINITIONS) {
  const unknown = role.permissions.filter(
    (permission) => !CATALOG_KEYS.has(permission)
  )
  if (unknown.length > 0)
    throw new TypeError(
      `Console system role ${role.name} contains unknown permissions: ${unknown.join(', ')}.`
    )
}

/** The three built-in system role names, in privilege order. */
export const SYSTEM_ROLE_NAMES = SYSTEM_ROLE_DEFINITIONS.map(
  (role) => role.name
)

/** Fallback role→permissions map (used before the DB is populated, and in tests). */
const FALLBACK: Record<string, string[]> = Object.fromEntries(
  SYSTEM_ROLE_DEFINITIONS.map((role) => [role.name, [...role.permissions]])
)

/**
 * Permissions for a role name from a supplied catalog (defaults to the system
 * fallback). During the naming cutover an old database row may still contain
 * `super_admin` or `console:danger_zone`; callers always receive canonical
 * equivalents and new writes never recreate those aliases.
 */
export function permissionsForRole(
  role: string | null | undefined,
  catalog: Record<string, string[]> = FALLBACK
): string[] {
  if (!role) return []
  const canonicalRole = canonicalConsoleRole(role)
  const legacyRolePermissions =
    canonicalRole === CONSOLE_SUPER_ADMIN_ROLE
      ? catalog[LEGACY_CONSOLE_SUPER_ADMIN_ROLE]
      : undefined
  return canonicalPermissions(
    catalog[canonicalRole] ?? legacyRolePermissions ?? []
  )
}

function actionLabel(action: string): string {
  return action
    .split(/[-_]/)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(' ')
}

/** Friendly product name for a permission-group heading. Display only. */
/**
 * Labels that title-casing cannot derive. Only genuine exceptions belong here —
 * a product whose display name is an acronym, or differs from its slug.
 */
const PRODUCT_LABELS: Record<string, string> = {
  crm: 'CRM',
}

/**
 * Title-cases the fallback rather than returning the raw slug. Commerce shipped
 * a permission catalog and rendered as "876 commerce" beside "876 Billing"
 * because nobody added it to the map above; deriving the common case means a
 * new product reads correctly the moment its catalog exists.
 */
function productLabel(shortSlug: string): string {
  const override = PRODUCT_LABELS[shortSlug]
  if (override) return override

  return shortSlug.charAt(0).toUpperCase() + shortSlug.slice(1)
}

function permissionModules(
  catalog:
    | ReturnType<typeof operatorProductCatalogs>[number]
    | typeof consolePermissionCatalog,
  labels: (permission: { key: string; action: string; label: string }) => string
) {
  return groupByModule(catalog, []).map((module) => ({
    key: module.key,
    label: module.label,
    permissions: module.permissions.map((permission) => ({
      value: permission.key,
      label: labels(permission),
    })),
  }))
}

/** Console's own vocabulary, grouped by module. */
const CONSOLE_GROUPS: PermissionGroup[] = [
  {
    key: 'console',
    label: 'Console',
    modules: permissionModules(consolePermissionCatalog, (permission) =>
      actionLabel(permission.action)
    ),
  },
]

/**
 * Every product’s projected permissions, grouped under the product and then
 * its modules, so a role editor answers “what can this role do anywhere”
 * without flattening the product hierarchy into a label.
 */
const PRODUCT_GROUPS: PermissionGroup[] = operatorProductCatalogs().map(
  (catalog) => ({
    key: catalog.app,
    label: `876 ${productLabel(catalog.app)}`,
    modules: permissionModules(catalog, (permission) =>
      actionLabel(permission.action)
    ),
  })
)

/**
 * The Console-only actions — purge today — stay separately labelled so an
 * editor never mistakes "Purge CRM records" for a permission the CRM catalog
 * itself grants; per §6.1, only Console can hold this vocabulary.
 */
const OPERATOR_EXCLUSIVE_GROUPS: PermissionGroup[] = [
  {
    key: 'operator-actions',
    label: 'Operator actions',
    modules: permissionModules(
      operatorExclusiveCatalog(),
      (permission) => permission.label
    ),
  },
]

/** Grouped permission catalog rendered by the role permission editor. */
export const PERMISSION_GROUPS: PermissionGroup[] = [
  ...CONSOLE_GROUPS,
  ...PRODUCT_GROUPS,
  ...OPERATOR_EXCLUSIVE_GROUPS,
]

/** Flattens the presentation hierarchy without changing durable permission keys. */
export function permissionGroupKeys(
  groups: readonly PermissionGroup[]
): string[] {
  return groups.flatMap((group) =>
    group.modules.flatMap((module) =>
      module.permissions.map((permission) => permission.value)
    )
  )
}
