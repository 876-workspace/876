import { prisma } from '@/db/client'
import type { MemberStatus } from '@/db'

export async function findActiveMemberAuthorization(
  tenantId: string,
  userId: string
) {
  return prisma.member.findUnique({
    where: { tenantId_userId: { tenantId, userId } },
    select: { status: true, role: { select: { permissions: true } } },
  })
}

const roleWithCount = { _count: { select: { members: true } } } as const

export function listRoleRows(tenantId: string) {
  return prisma.role.findMany({
    where: { tenantId },
    include: roleWithCount,
    orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
  })
}

export function findRoleRow(tenantId: string, roleId: string) {
  return prisma.role.findFirst({
    where: { id: roleId, tenantId },
    include: roleWithCount,
  })
}

export function findRoleIdentity(tenantId: string, roleId: string) {
  return prisma.role.findFirst({ where: { id: roleId, tenantId } })
}

export function createRoleRow(data: {
  id: string
  tenantId: string
  slug: string
  name: string
  description: string
  permissions: string[]
  createdAt: number
  updatedAt: number
}) {
  return prisma.role.create({ data })
}

export function updateRoleRow(
  roleId: string,
  data: {
    name?: string
    description?: string
    permissions?: string[]
    updatedAt: number
  }
) {
  return prisma.role.update({ where: { id: roleId }, data })
}

export function deleteRoleRow(roleId: string) {
  return prisma.role.delete({ where: { id: roleId } })
}

export function findMemberRow(tenantId: string, userId: string) {
  return prisma.member.findUnique({
    where: { tenantId_userId: { tenantId, userId } },
    include: { role: true },
  })
}

export function listMemberRows(tenantId: string) {
  return prisma.member.findMany({
    where: { tenantId },
    include: { role: true },
    orderBy: { createdAt: 'asc' },
  })
}

export function findRoleBySlug(tenantId: string, slug: string) {
  return prisma.role.findUnique({ where: { tenantId_slug: { tenantId, slug } } })
}

export function countActiveOwners(tenantId: string) {
  return prisma.member.count({
    where: { tenantId, status: 'ACTIVE', role: { slug: 'owner' } },
  })
}

export function updateMemberRow(
  memberId: string,
  data: { roleId: string; status: MemberStatus; updatedAt: number }
) {
  return prisma.member.update({ where: { id: memberId }, data })
}
