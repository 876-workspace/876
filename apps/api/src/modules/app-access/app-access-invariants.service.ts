import { appError } from '@/platform/errors'

import * as repository from './app-access.repository'
import type { UpdateAppRoleBody } from './app-access.schemas'

export async function assertRoleUpdateInvariants(params: {
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
  if (role?.isDefault) throw appError('app-role/default-required')
}

export async function assertRoleDeleteInvariants(params: {
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
