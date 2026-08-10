import { prisma } from '@/db/client'

import type {
  MemberBody,
  MemberPatchBody,
  RoleBody,
  RolePatchBody,
} from './team.schemas'

const withCount = {
  include: { _count: { select: { members: true } } },
} as const

const withRole = { include: { role: true } } as const

export function listTenantRoles(tenantId: string) {
  return prisma.role.findMany({
    where: { tenantId },
    ...withCount,
    orderBy: [{ systemKey: 'asc' }, { name: 'asc' }],
  })
}

export function findTenantRoleById(tenantId: string, id: string) {
  return prisma.role.findFirst({
    where: { tenantId, id },
    ...withCount,
  })
}

export function createTenantRole(options: {
  tenantId: string
  input: RoleBody
  now: number
}) {
  return prisma.role.create({
    data: {
      tenantId: options.tenantId,
      name: options.input.name,
      description: options.input.description ?? '',
      systemKey: null,
      permissions: options.input.permissions,
      createdAt: options.now,
      updatedAt: options.now,
    },
    ...withCount,
  })
}

export function updateTenantRole(options: {
  id: string
  input: RolePatchBody
  now: number
}) {
  return prisma.role.update({
    where: { id: options.id },
    data: {
      ...(options.input.name === undefined ? {} : { name: options.input.name }),
      ...(options.input.description === undefined
        ? {}
        : { description: options.input.description }),
      ...(options.input.permissions === undefined
        ? {}
        : { permissions: options.input.permissions }),
      updatedAt: options.now,
    },
    ...withCount,
  })
}

export function deleteTenantRole(id: string) {
  return prisma.role.delete({ where: { id } })
}

export function listTenantMembers(
  tenantId: string,
  status?: 'active' | 'inactive'
) {
  return prisma.teamMember.findMany({
    where: {
      tenantId,
      ...(status === undefined
        ? {}
        : { status: status === 'active' ? 'ACTIVE' : 'INACTIVE' }),
    },
    ...withRole,
    orderBy: { createdAt: 'asc' },
  })
}

export function createTenantMember(options: {
  tenantId: string
  input: MemberBody
  now: number
}) {
  return prisma.teamMember.create({
    data: {
      tenantId: options.tenantId,
      userId: options.input.user_id,
      roleId: options.input.role_id,
      status: 'ACTIVE',
      createdAt: options.now,
      updatedAt: options.now,
    },
    ...withRole,
  })
}

export function findTenantMemberById(tenantId: string, id: string) {
  return prisma.teamMember.findFirst({
    where: { tenantId, id },
    ...withRole,
  })
}

export function countActiveMembersForRole(tenantId: string, systemKey: string) {
  return prisma.teamMember.count({
    where: { tenantId, status: 'ACTIVE', role: { systemKey } },
  })
}

export function updateTenantMember(options: {
  id: string
  input: MemberPatchBody
  status: 'ACTIVE' | 'INACTIVE'
  now: number
}) {
  return prisma.teamMember.update({
    where: { id: options.id },
    data: {
      ...(options.input.role_id ? { roleId: options.input.role_id } : {}),
      status: options.status,
      updatedAt: options.now,
    },
    ...withRole,
  })
}

export function deleteTenantMember(id: string) {
  return prisma.teamMember.delete({ where: { id } })
}
