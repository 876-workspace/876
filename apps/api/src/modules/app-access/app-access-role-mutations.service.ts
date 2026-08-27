import {
  requireOrgAppAccessPermission,
  type OrgAccessPrincipal,
} from '@/modules/organizations'
import { appError } from '@/platform/errors'

import * as repository from './app-access.repository'
import type { AppRole, UpdateAppRoleBody } from './app-access.schemas'
import * as service from './app-access.service'

async function requireDefaultInvariant(params: {
  appId: string
  organizationId: string | null
  roleId: string
  body: UpdateAppRoleBody
}): Promise<void> {
  if (params.body.is_default !== false) return

  const role = await repository.findRole(
    params.appId,
    params.organizationId,
    params.roleId
  )
  // Canonical service owns not-found and system-role errors. Only add the
  // default invariant for a mutable role that would otherwise leave no default.
  if (role && !role.isSystem && role.isDefault)
    throw appError('app-role/default-required')
}

async function requireDeleteInvariant(params: {
  appId: string
  organizationId: string | null
  roleId: string
  protectSystem: boolean
}): Promise<void> {
  const role = await repository.findRole(
    params.appId,
    params.organizationId,
    params.roleId
  )
  if (!role) return

  if (params.protectSystem && role.isSystem)
    throw appError('app-role/system-immutable')

  if (
    role.isDefault &&
    (await repository.countRoles(params.appId, params.organizationId)) <= 1
  )
    throw appError('app-role/default-required')
}

/** Platform-admin role-template update with default/system invariants. */
export async function updateAppRoleTemplate(
  appId: string,
  roleId: string,
  body: UpdateAppRoleBody
): Promise<AppRole> {
  await requireDefaultInvariant({
    appId,
    organizationId: null,
    roleId,
    body,
  })
  return service.updateAppRoleTemplate(appId, roleId, body)
}

/** Platform-admin template delete. System templates are immutable. */
export async function deleteAppRoleTemplate(
  appId: string,
  roleId: string
): Promise<{ object: 'app_role'; id: string; deleted: true }> {
  await requireDeleteInvariant({
    appId,
    organizationId: null,
    roleId,
    protectSystem: true,
  })
  return service.deleteAppRoleTemplate(appId, roleId)
}

/** Org role update: authorize first, then enforce the default invariant. */
export async function updateOrgAppRole(
  organizationId: string,
  appId: string,
  roleId: string,
  body: UpdateAppRoleBody,
  principal: OrgAccessPrincipal
): Promise<AppRole> {
  await requireOrgAppAccessPermission(organizationId, principal, 'apps:assign')
  await requireDefaultInvariant({
    appId,
    organizationId,
    roleId,
    body,
  })
  return service.updateOrgAppRole(
    organizationId,
    appId,
    roleId,
    body,
    principal
  )
}

/** Org role delete: authorize before exposing role/default state. */
export async function deleteOrgAppRole(
  organizationId: string,
  appId: string,
  roleId: string,
  principal: OrgAccessPrincipal
): Promise<{ object: 'app_role'; id: string; deleted: true }> {
  await requireOrgAppAccessPermission(organizationId, principal, 'apps:assign')
  await requireDeleteInvariant({
    appId,
    organizationId,
    roleId,
    protectSystem: true,
  })
  return service.deleteOrgAppRole(organizationId, appId, roleId, principal)
}
