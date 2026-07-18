/**
 * Console role/permission catalog.
 *
 * Relocated out of the identity API (`apps/api/core/permissions.py`).
 * Console — not the identity platform — owns "who can use the admin
 * console and with what permissions." This module is the seed + fallback for
 * the `roles` table; the runtime source of truth is the table itself
 * (resolved via Prisma in Console's auth guards).
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
] as const

/** Permission that gates entry to Console itself. */
export const CONSOLE_ACCESS_PERMISSION = 'console:access'

/** Permission that gates destructive (danger-zone) operations. */
export const CONSOLE_DANGER_ZONE_PERMISSION = 'console:danger_zone'

import type { SystemRole } from '@/types/role'

/**
 * Seed definitions for the 4 system Console roles. Used to seed `roles` on first
 * run and as a fallback before the table is populated. Consumers (no operator
 * row) have no role and no permissions.
 */
export const SYSTEM_ROLE_DEFINITIONS: SystemRole[] = [
  {
    name: 'staff',
    displayName: 'Staff',
    description: 'Read-only access to Console data.',
    permissions: ['console:access', 'console:support', ...RESOURCE_READ],
  },
  {
    name: 'admin',
    displayName: 'Admin',
    description:
      'Full management access — create, update, and manage all resources.',
    permissions: [
      'console:access',
      'console:support',
      'console:settings',
      'console:billing',
      'console:users',
      'console:organizations',
      'console:apps',
      'console:features',
      'console:widgets',
      ...RESOURCE_READ,
      ...RESOURCE_WRITE,
    ],
  },
  {
    name: 'owner',
    displayName: 'Owner',
    description: 'Platform owner with unrestricted Console access.',
    permissions: [
      'console:access',
      'console:support',
      'console:settings',
      'console:billing',
      'console:users',
      'console:organizations',
      'console:apps',
      'console:features',
      'console:widgets',
      'console:danger_zone',
      ...RESOURCE_READ,
      ...RESOURCE_WRITE,
      'roles:delete',
      'users:delete',
      'organizations:delete',
      'memberships:delete',
      'apps:delete',
    ],
  },
  {
    name: 'super_admin',
    displayName: 'Super Admin',
    description: 'All permissions including danger zone operations.',
    permissions: [
      'console:access',
      'console:support',
      'console:settings',
      'console:billing',
      'console:users',
      'console:organizations',
      'console:apps',
      'console:features',
      'console:widgets',
      'console:danger_zone',
      ...RESOURCE_READ,
      ...RESOURCE_WRITE,
      'roles:delete',
      'users:delete',
      'organizations:delete',
      'memberships:delete',
      'apps:delete',
    ],
  },
]

/** The four built-in system role names, in privilege order. */
export const SYSTEM_ROLE_NAMES = SYSTEM_ROLE_DEFINITIONS.map((r) => r.name)

/** Fallback role→permissions map (used before the DB is populated, and in tests). */
const FALLBACK: Record<string, string[]> = Object.fromEntries(
  SYSTEM_ROLE_DEFINITIONS.map((r) => [r.name, [...r.permissions]])
)

/**
 * Permissions for a role name from a supplied catalog (defaults to the system
 * fallback). The live catalog comes from the `roles` table at runtime.
 */
export function permissionsForRole(
  role: string | null | undefined,
  catalog: Record<string, string[]> = FALLBACK
): string[] {
  if (!role) return []
  return [...(catalog[role] ?? [])]
}
