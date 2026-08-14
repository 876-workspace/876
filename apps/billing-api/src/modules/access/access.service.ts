import { AppHttpError } from '@/platform/errors'
import { generateId } from '@/platform/ids'
import { isUniqueConstraintError } from '@/platform/prisma-errors'
import { nowUnixSeconds } from '@/platform/timestamps'

import {
  countActiveOwners,
  createRoleRow,
  deleteRoleRow,
  findActiveMemberAuthorization,
  findMemberRow,
  findRoleBySlug,
  findRoleIdentity,
  findRoleRow,
  listRoleRows,
  listMemberRows,
  updateMemberRow,
  updateRoleRow,
} from './access.repository'
import type {
  MemberUpdateBody,
  RoleCreateBody,
  RoleUpdateBody,
} from './access.schemas'
import { billingPermissionValues } from './access.schemas'
import { serializeRole } from './access.serializers'

export async function activeMemberAuthorization(
  tenantId: string,
  userId: string
) {
  const member = await findActiveMemberAuthorization(tenantId, userId)
  return member?.status === 'ACTIVE'
    ? { permissions: new Set(member.role.permissions) }
    : null
}

function memberAccess(
  userId: string,
  status: 'ACTIVE' | 'SUSPENDED',
  role: Awaited<ReturnType<typeof findRoleBySlug>>
) {
  if (!role) return null
  const filtered = role.permissions.filter((value) =>
    (billingPermissionValues as readonly string[]).includes(value)
  )
  return {
    userId,
    status,
    role: {
      id: role.id,
      slug: role.slug,
      name: role.name,
      description: role.description,
      permissions: filtered,
      isSystem: role.isSystem,
      isDefault: role.isDefault,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    },
    permissions: filtered,
  }
}

export async function resolveMemberAccess(
  tenantId: string,
  userId: string,
  organizationRole: 'owner' | 'admin' | 'member'
) {
  if (organizationRole !== 'owner') {
    const current = await findMemberRow(tenantId, userId)
    if (current)
      return memberAccess(userId, current.status, current.role)
  }
  const slug =
    organizationRole === 'owner'
      ? 'owner'
      : organizationRole === 'admin'
        ? 'admin'
        : 'viewer'
  return memberAccess(userId, 'ACTIVE', await findRoleBySlug(tenantId, slug))
}

export async function listMembers(tenantId: string) {
  return Promise.all(
    (await listMemberRows(tenantId)).map(async (member) => ({
      object: 'billing_member' as const,
      id: member.id,
      userId: member.userId,
      roleId: member.roleId,
      status: member.status,
      role: memberAccess(member.userId, member.status, member.role)?.role,
      createdAt: member.createdAt,
      updatedAt: member.updatedAt,
    }))
  )
}

function accessError(code: string, message: string, httpStatus: number) {
  return new AppHttpError({ code, message, httpStatus })
}

export async function listRoles(tenantId: string) {
  const rows = await listRoleRows(tenantId)
  return {
    object: 'list' as const,
    data: rows.map(serializeRole),
    has_more: false,
    total_count: rows.length,
    url: '/api/v1/roles',
  }
}

export async function retrieveRole(tenantId: string, roleId: string) {
  const row = await findRoleRow(tenantId, roleId)
  if (!row) throw accessError('billing_role/not-found', 'Role not found.', 404)
  return serializeRole(row)
}

export async function createRole(tenantId: string, body: RoleCreateBody) {
  try {
    const now = nowUnixSeconds()
    const row = await createRoleRow({
      id: generateId('Role'),
      tenantId,
      slug: body.slug,
      name: body.name,
      description: body.description ?? '',
      permissions: [...new Set(body.permissions)],
      createdAt: now,
      updatedAt: now,
    })
    return { object: 'billing_role' as const, id: row.id }
  } catch (error) {
    if (isUniqueConstraintError(error))
      throw accessError(
        'billing_role/already-exists',
        'A role with this identifier already exists.',
        409
      )
    throw error
  }
}

export async function updateRole(
  tenantId: string,
  roleId: string,
  body: RoleUpdateBody
) {
  const row = await findRoleIdentity(tenantId, roleId)
  if (!row) throw accessError('billing_role/not-found', 'Role not found.', 404)
  if (row.isSystem)
    throw accessError(
      'billing_role/system-role',
      'System roles cannot be modified.',
      409
    )
  await updateRoleRow(roleId, {
    ...(body.name !== undefined ? { name: body.name } : {}),
    ...(body.description !== undefined
      ? { description: body.description ?? '' }
      : {}),
    ...(body.permissions !== undefined
      ? { permissions: [...new Set(body.permissions)] }
      : {}),
    updatedAt: nowUnixSeconds(),
  })
  return { object: 'billing_role' as const, id: roleId }
}

export async function deleteRole(tenantId: string, roleId: string) {
  const row = await findRoleRow(tenantId, roleId)
  if (!row) throw accessError('billing_role/not-found', 'Role not found.', 404)
  if (row.isSystem)
    throw accessError(
      'billing_role/system-role',
      'System roles cannot be deleted.',
      409
    )
  if (row._count.members > 0)
    throw accessError(
      'billing_role/in-use',
      'Reassign every member from this role before deleting it.',
      409
    )
  await deleteRoleRow(roleId)
  return { object: 'billing_role' as const, id: roleId, deleted: true as const }
}

export async function updateMember(
  tenantId: string,
  targetUserId: string,
  actorUserId: string | null,
  body: MemberUpdateBody
) {
  if (targetUserId === actorUserId)
    throw accessError(
      'billing_member/self-lockout',
      'You cannot change your own Billing access.',
      409
    )
  const [role, member] = await Promise.all([
    findRoleIdentity(tenantId, body.roleId),
    findMemberRow(tenantId, targetUserId),
  ])
  if (!role)
    throw accessError(
      'billing_member/invalid-role',
      'Select a role from this workspace.',
      422
    )
  if (!member)
    throw accessError(
      'billing_member/not-found',
      'The requested billing member was not found.',
      404
    )
  if (
    member.role.slug === 'owner' &&
    member.status === 'ACTIVE' &&
    (role.slug !== 'owner' || body.status !== 'ACTIVE') &&
    (await countActiveOwners(tenantId)) <= 1
  )
    throw accessError(
      'billing_member/owner-required',
      'A workspace must keep at least one active owner.',
      409
    )

  const updated = await updateMemberRow(member.id, {
    roleId: role.id,
    status: body.status,
    updatedAt: nowUnixSeconds(),
  })
  return { object: 'billing_member' as const, id: updated.id }
}
