import * as repository from './app-access.repository'
import type { AppRoleRow } from './app-access.serializers'

/**
 * Bounded cross-module lookup for an organization-scoped live app role.
 * Consumers must still perform their own entitlement/permission checks.
 */
export function findOrgAppRoleForAccess(params: {
  appId: string
  organizationId: string
  roleId: string
}): Promise<AppRoleRow | null> {
  return repository.findRole(
    params.appId,
    params.organizationId,
    params.roleId
  )
}
