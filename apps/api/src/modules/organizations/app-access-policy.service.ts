import { AppHttpError } from '@/platform/errors'
import { defaultPermissionsForRoleName } from '@/platform/permissions'

import * as repository from './app-access-policy.repository'

export type OrgAccessPrincipal = { internal: boolean; userId: string | null }

function noSession(): AppHttpError {
  return new AppHttpError({
    code: 'auth/no-session',
    message: 'No active session.',
    httpStatus: 401,
  })
}

function forbidden(): AppHttpError {
  return new AppHttpError({
    code: 'auth/forbidden',
    message: 'Forbidden.',
    httpStatus: 403,
  })
}

/** Requires an active membership for a session-tier organization read. */
export async function requireOrgAppAccessRead(
  organizationId: string,
  principal: OrgAccessPrincipal
): Promise<void> {
  if (principal.internal) return
  if (!principal.userId) throw noSession()

  const membership = await repository.findPolicyMembership(organizationId, principal.userId)
  if (!membership || membership.status !== 'active') throw forbidden()
}

/** Requires an organization permission for a session-tier app-access write. */
export async function requireOrgAppAccessPermission(
  organizationId: string,
  principal: OrgAccessPrincipal,
  permission: string
): Promise<void> {
  if (principal.internal) return
  if (!principal.userId) throw noSession()

  const membership = await repository.findPolicyMembership(organizationId, principal.userId)
  if (!membership || membership.status !== 'active') throw forbidden()

  let permissions: Set<string>
  if (membership.roleId) {
    const role = await repository.findPolicyRole(organizationId, membership.roleId)
    permissions = role ? new Set(role.permissions) : new Set()
  } else {
    permissions = new Set(defaultPermissionsForRoleName(membership.role))
  }
  if (!permissions.has(permission)) throw forbidden()
}

export function getOrgAppEntitlement(organizationId: string, appId: string) {
  return repository.findAppEntitlement(organizationId, appId)
}

export function listOrgAppEntitlements(organizationId: string) {
  return repository.listAppEntitlements(organizationId)
}
