import { can, groupByModule, type AccessContext } from '@876/core/access'
import { consolePermissionCatalog } from '@876/core/access/catalogs'

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
  return [
    ...new Set(
      permissions
        .filter((permission): permission is string =>
          typeof permission === 'string'
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
    ],
  },
  {
    name: 'admin',
    displayName: 'Admin',
    description:
      'Full management access — create, update, and manage all resources.',
    permissions: [
      'console:access',
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
    ],
  },
  {
    name: CONSOLE_SUPER_ADMIN_ROLE,
    displayName: 'Super Admin',
    description: 'All permissions including danger zone operations.',
    permissions: [
      'console:access',
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
    ],
  },
]

const CATALOG_KEYS = new Set(
  consolePermissionCatalog.permissions.map((permission) => permission.key)
)

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

/** Grouped permission catalog rendered by the role permission editor. */
export const PERMISSION_GROUPS: PermissionGroup[] = groupByModule(
  consolePermissionCatalog,
  []
).map((group) => ({
  label: group.label,
  permissions: group.permissions.map((permission) => ({
    value: permission.key,
    label: actionLabel(permission.action),
  })),
}))
