/** A persisted app role reduced to the fields needed for safe assignment. */
export type AppAssignmentRoleCandidate = {
  id: string
  key: string
  isDefault: boolean
  deletedAt?: unknown
}

export type AppAssignmentRoleResolution = {
  role: AppAssignmentRoleCandidate | null
  source: 'requested' | 'organization-role' | 'default' | 'none'
}

/** Organization role → the canonical app role key it maps to. */
const ORG_ROLE_TO_APP_ROLE: Record<string, string> = {
  super_admin: 'super-admin',
  'super-admin': 'super-admin',
  admin: 'admin',
}

/** Persisted legacy app-role aliases accepted during the naming migration. */
const APP_ROLE_KEY_ALIASES: Record<string, string> = {
  super_admin: 'super-admin',
}

function isLive(role: AppAssignmentRoleCandidate): boolean {
  return role.deletedAt === null || role.deletedAt === undefined
}

function canonicalAppRoleKey(roleKey: string): string {
  const normalized = roleKey.toLowerCase()
  return APP_ROLE_KEY_ALIASES[normalized] ?? normalized
}

function mappedRoleKey(organizationRole: unknown): string | null {
  if (typeof organizationRole !== 'string') return null
  return ORG_ROLE_TO_APP_ROLE[organizationRole.toLowerCase()] ?? null
}

/**
 * Selects an app role for a new assignment. Explicit roles remain available to
 * governed assignment flows; automatic provisioning must omit `requestedRoleId`
 * so its result is derived solely from the subject's organization role.
 *
 * Fallback order is requested live role, mapped organization role,
 * live default role, then no role. It never substitutes a broader role.
 * Legacy persisted app-role aliases are canonicalized only for comparison; the
 * original role object is returned unchanged so callers keep the persisted id.
 */
export function resolveAppAssignmentRole(input: {
  organizationRole: unknown
  requestedRoleId?: string | null
  roles: readonly AppAssignmentRoleCandidate[]
}): AppAssignmentRoleResolution {
  const roles = input.roles.filter(isLive)
  if (input.requestedRoleId) {
    const requested = roles.find((role) => role.id === input.requestedRoleId)
    if (requested) return { role: requested, source: 'requested' }
  }

  const mappedKey = mappedRoleKey(input.organizationRole)
  if (mappedKey) {
    const mapped = roles.find(
      (role) => canonicalAppRoleKey(role.key) === mappedKey
    )
    if (mapped) return { role: mapped, source: 'organization-role' }
  }

  const defaultRole = roles.find((role) => role.isDefault)
  return defaultRole
    ? { role: defaultRole, source: 'default' }
    : { role: null, source: 'none' }
}
