import type { OrgRole } from '@/types/auth'

/**
 * Canonicalize organization roles at the Projects boundary.
 *
 * `super_admin` is the temporary underscore spelling introduced by the shared
 * three-role refactor; `owner` and `superadmin` are older values that can still
 * appear in stale sessions/fixtures. They are read-only aliases. Projects emits and
 * reasons about only `super-admin`, `admin`, and `staff` after this boundary.
 */
export function normalizeOrgRole(role: string): OrgRole {
  const normalized = role.toLowerCase()
  if (
    normalized === 'super-admin' ||
    normalized === 'super_admin' ||
    normalized === 'superadmin' ||
    normalized === 'owner'
  )
    return 'super-admin'
  if (normalized === 'admin') return 'admin'
  return 'staff'
}

const PRIVATE_NOTE_ROLES = new Set<OrgRole>(['super-admin', 'admin'])

/** Whether an organization role may create notes scoped to its author. */
export function canCreatePrivateRequestNote(role: string): boolean {
  return PRIVATE_NOTE_ROLES.has(normalizeOrgRole(role))
}
