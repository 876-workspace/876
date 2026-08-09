import { Prisma } from '@/db/generated/prisma/client'
import { AppHttpError } from '@/platform/errors'
import { nowUnixSeconds } from '@/platform/timestamps'
import { prisma } from './team.repository'
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
const withCount = {
  include: { _count: { select: { members: true } } },
} as const
export async function listRoles(tenantId: string) {
  return (
    await prisma.role.findMany({
      where: { tenantId },
      ...withCount,
      orderBy: [{ systemKey: 'asc' }, { name: 'asc' }],
    })
  ).map(serializeRole)
}
export async function retrieveRole(tenantId: string, id: string) {
  const row = await prisma.role.findFirst({
    where: { tenantId, id },
    ...withCount,
  })
  if (!row) throw missing('role')
  return serializeRole(row)
}
export async function createRole(tenantId: string, input: RoleBody) {
  if (!input.permissions.every(isValidPermission))
    throw new AppHttpError({
      code: 'role/invalid-permission',
      message: 'One or more permission keys are invalid.',
      httpStatus: 422,
    })
  const now = nowUnixSeconds()
  try {
    return serializeRole(
      await prisma.role.create({
        data: {
          tenantId,
          name: input.name,
          description: input.description ?? '',
          systemKey: null,
          permissions: input.permissions,
          createdAt: now,
          updatedAt: now,
        },
        ...withCount,
      })
    )
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    )
      throw conflict('role', 'A role with that name already exists.')
    throw error
  }
}
export async function updateRole(
  tenantId: string,
  id: string,
  input: RolePatchBody
) {
  const current = await retrieveRole(tenantId, id)
  if (current.is_default)
    throw conflict('role', 'Default roles cannot be changed.')
  if (input.permissions && !input.permissions.every(isValidPermission))
    throw new AppHttpError({
      code: 'role/invalid-permission',
      message: 'One or more permission keys are invalid.',
      httpStatus: 422,
    })
  try {
    return serializeRole(
      await prisma.role.update({
        where: { id },
        data: {
          ...(input.name === undefined ? {} : { name: input.name }),
          ...(input.description === undefined
            ? {}
            : { description: input.description }),
          ...(input.permissions === undefined
            ? {}
            : { permissions: input.permissions }),
          updatedAt: nowUnixSeconds(),
        },
        ...withCount,
      })
    )
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    )
      throw conflict('role', 'A role with that name already exists.')
    throw error
  }
}
export async function deleteRole(tenantId: string, id: string) {
  const row = await prisma.role.findFirst({
    where: { tenantId, id },
    ...withCount,
  })
  if (!row) throw missing('role')
  if (row.systemKey) throw conflict('role', 'Default roles cannot be deleted.')
  if (row._count.members > 0)
    throw conflict('role', 'Roles with members cannot be deleted.')
  await prisma.role.delete({ where: { id } })
  return { id, deleted: true }
}
export async function listMembers(tenantId: string) {
  return (
    await prisma.teamMember.findMany({
      where: { tenantId },
      include: { role: true },
      orderBy: { createdAt: 'asc' },
    })
  ).map(serializeMember)
}
export async function createMember(tenantId: string, input: MemberBody) {
  const role = await prisma.role.findFirst({
    where: { id: input.role_id, tenantId },
  })
  if (!role) throw missing('team/role')
  const now = nowUnixSeconds()
  try {
    return serializeMember(
      await prisma.teamMember.create({
        data: {
          tenantId,
          userId: input.user_id,
          roleId: input.role_id,
          status: 'ACTIVE',
          createdAt: now,
          updatedAt: now,
        },
        include: { role: true },
      })
    )
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    )
      throw conflict('team', 'That user already belongs to this team.')
    throw error
  }
}
export async function updateMember(
  tenantId: string,
  id: string,
  input: MemberPatchBody
) {
  const current = await prisma.teamMember.findFirst({
    where: { tenantId, id },
    include: { role: true },
  })
  if (!current) throw missing('team')
  const role = input.role_id
    ? await prisma.role.findFirst({ where: { id: input.role_id, tenantId } })
    : current.role
  if (!role) throw missing('team/role')
  const finalStatus =
    input.status === 'inactive'
      ? 'INACTIVE'
      : input.status === 'active'
        ? 'ACTIVE'
        : current.status
  if (
    current.status === 'ACTIVE' &&
    current.role.systemKey === 'admin' &&
    (finalStatus !== 'ACTIVE' || role.systemKey !== 'admin')
  ) {
    const active = await prisma.teamMember.count({
      where: { tenantId, status: 'ACTIVE', role: { systemKey: 'admin' } },
    })
    if (active <= 1)
      throw conflict(
        'team',
        'The last active admin cannot be removed or demoted.'
      )
  }
  return serializeMember(
    await prisma.teamMember.update({
      where: { id },
      data: {
        ...(input.role_id ? { roleId: input.role_id } : {}),
        status: finalStatus,
        updatedAt: nowUnixSeconds(),
      },
      include: { role: true },
    })
  )
}
