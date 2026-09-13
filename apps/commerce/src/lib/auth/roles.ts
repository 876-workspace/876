/**
 * Canonicalizes role aliases at the Commerce boundary.
 *
 * `super_admin`, `superadmin`, and `owner` remain read-only compatibility
 * aliases; Commerce only reasons about the three current role values.
 */
export function normalizeOrgRole(
  role: string
): 'super-admin' | 'admin' | 'staff' {
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

export function isOrganizationAdmin(role: string): boolean {
  const normalized = normalizeOrgRole(role)
  return normalized === 'super-admin' || normalized === 'admin'
}
