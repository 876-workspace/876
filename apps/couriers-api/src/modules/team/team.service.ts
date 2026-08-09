import { deletedObject } from '@/http/envelope'
import { AppHttpError } from '@/platform/errors'
import { nowUnixSeconds } from '@/platform/timestamps'

import * as repo from './team.repository'
import {
  isValidPermission,
  serializeMember,
  serializeRole,
} from './team.serializers'
import type {
  MemberBody,
  MemberPatchBody,
  RoleBody,
  RolePatchBody,
} from './team.schemas'

const missing = (resource: string) =>
  new AppHttpError({
    code: `${resource}/not-found`,
    message: 'Not found.',
    httpStatus: 404,
  })

const conflict = (resource: string, message: string) =>
  new AppHttpError({ code: `${resource}/conflict`, message, httpStatus: 409 })

export async function listRoles(tenantId: string) {
  return (await repo.listTenantRoles(tenantId)).map(serializeRole)
}

export async function retrieveRole(tenantId: string, id: string) {
  const row = await repo.findTenantRoleById(tenantId, id)
  if (!row) throw missing('role')
  return serializeRole(row)
}

export async function createRole(tenantId: string, input: RoleBody) {
  if (!input.permissions.every(isValidPermission)) {
    throw new AppHttpError({
      code: 'role/invalid-permission',
      message: 'One or more permission keys are invalid.',
      httpStatus: 422,
    })
  }

  try {
    return serializeRole(
      await repo.createTenantRole({
        tenantId,
        input,
        now: nowUnixSeconds(),
      })
    )
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw conflict('role', 'A role with that name already exists.')
    }
    throw error
  }
}

export async function updateRole(
  tenantId: string,
  id: string,
  input: RolePatchBody
) {
  const current = await retrieveRole(tenantId, id)
  if (current.is_default) {
    throw conflict('role', 'Default roles cannot be changed.')
  }
  if (input.permissions && !input.permissions.every(isValidPermission)) {
    throw new AppHttpError({
      code: 'role/invalid-permission',
      message: 'One or more permission keys are invalid.',
      httpStatus: 422,
    })
  }

  try {
    return serializeRole(
      await repo.updateTenantRole({ id, input, now: nowUnixSeconds() })
    )
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw conflict('role', 'A role with that name already exists.')
    }
    throw error
  }
}

export async function deleteRole(tenantId: string, id: string) {
  const row = await repo.findTenantRoleById(tenantId, id)
  if (!row) throw missing('role')
  if (row.systemKey) {
    throw conflict('role', 'Default roles cannot be deleted.')
  }
  if (row._count.members > 0) {
    throw conflict('role', 'Roles with members cannot be deleted.')
  }
  await repo.deleteTenantRole(id)
  return deletedObject('role', id)
}

export async function listMembers(tenantId: string) {
  return (await repo.listTenantMembers(tenantId)).map(serializeMember)
}

export async function createMember(tenantId: string, input: MemberBody) {
  const role = await repo.findTenantRoleById(tenantId, input.role_id)
  if (!role) throw missing('team/role')

  try {
    return serializeMember(
      await repo.createTenantMember({
        tenantId,
        input,
        now: nowUnixSeconds(),
      })
    )
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw conflict('team', 'That user already belongs to this team.')
    }
    throw error
  }
}

export async function updateMember(
  tenantId: string,
  id: string,
  input: MemberPatchBody
) {
  const current = await repo.findTenantMemberById(tenantId, id)
  if (!current) throw missing('team')

  const role = input.role_id
    ? await repo.findTenantRoleById(tenantId, input.role_id)
    : current.role
  if (!role) throw missing('team/role')

  const status =
    input.status === 'inactive'
      ? 'INACTIVE'
      : input.status === 'active'
        ? 'ACTIVE'
        : current.status

  if (
    current.status === 'ACTIVE' &&
    current.role.systemKey === 'admin' &&
    (status !== 'ACTIVE' || role.systemKey !== 'admin')
  ) {
    const active = await repo.countActiveMembersForRole(tenantId, 'admin')
    if (active <= 1) {
      throw conflict(
        'team',
        'The last active admin cannot be removed or demoted.'
      )
    }
  }

  return serializeMember(
    await repo.updateTenantMember({
      id,
      input,
      status,
      now: nowUnixSeconds(),
    })
  )
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  )
}
