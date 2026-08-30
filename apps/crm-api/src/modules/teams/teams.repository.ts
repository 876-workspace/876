import { randomUUID } from 'node:crypto'

import { prisma } from '../../db/index.js'
import type { TeamMemberRole } from '../../types/team.js'

export const list = (tenantId: string, status?: 'ACTIVE' | 'ARCHIVED') =>
  prisma.team.findMany({
    where: { tenantId, deletedAt: null, ...(status ? { status } : {}) },
    orderBy: { name: 'asc' },
  })

export const listWithMembers = (
  tenantId: string,
  status?: 'ACTIVE' | 'ARCHIVED'
) =>
  prisma.team.findMany({
    where: { tenantId, deletedAt: null, ...(status ? { status } : {}) },
    include: { members: true },
    orderBy: { name: 'asc' },
  })

export const retrieve = (tenantId: string, id: string) =>
  prisma.team.findFirst({
    where: { tenantId, id, deletedAt: null },
    include: { members: true },
  })

export async function create(params: {
  tenantId: string
  name: string
  slug: string
  description?: string | null
  color?: string | null
  isDefault?: boolean
  autoAssign?: 'NONE' | 'ROUND_ROBIN' | 'LEAST_BUSY'
  createdBy: string
  members?: { userId: string; role?: TeamMemberRole }[]
}) {
  return prisma.$transaction(async (transaction) => {
    if (params.isDefault)
      await transaction.team.updateMany({
        where: { tenantId: params.tenantId, isDefault: true, deletedAt: null },
        data: { isDefault: false },
      })

    return transaction.team.create({
      data: {
        id: `team_${randomUUID().replaceAll('-', '')}`,
        ...params,
        members: params.members?.length
          ? {
              create: params.members.map((member) => ({
                id: `tmem_${randomUUID().replaceAll('-', '')}`,
                tenantId: params.tenantId,
                userId: member.userId,
                role: member.role ?? 'MEMBER',
                addedBy: params.createdBy,
              })),
            }
          : undefined,
      },
      include: { members: true },
    })
  })
}

export async function update(
  id: string,
  params: {
    tenantId: string
    name?: string
    description?: string | null
    color?: string | null
    isDefault?: boolean
    autoAssign?: 'NONE' | 'ROUND_ROBIN' | 'LEAST_BUSY'
    status?: 'ACTIVE' | 'ARCHIVED'
  }
) {
  return prisma.$transaction(async (transaction) => {
    if (params.isDefault)
      await transaction.team.updateMany({
        where: {
          tenantId: params.tenantId,
          id: { not: id },
          isDefault: true,
          deletedAt: null,
        },
        data: { isDefault: false },
      })

    return transaction.team.update({
      where: { id },
      data: params,
      include: { members: true },
    })
  })
}

export async function remove(params: {
  tenantId: string
  id: string
  deletedBy: string
  reason?: string
}) {
  return prisma.$transaction(async (transaction) => {
    const hardDelete = process.env.DELETION_MODE === 'hard'

    if (!hardDelete)
      await transaction.team.update({
        where: { id: params.id },
        data: { deletedAt: new Date(), deletedBy: params.deletedBy },
      })

    // Soft-deleted teams are invisible to reads, so live requests cannot retain them.
    await transaction.request.updateMany({
      where: { tenantId: params.tenantId, teamId: params.id, deletedAt: null },
      data: { teamId: null },
    })
    await transaction.requestCategoryDef.updateMany({
      where: { tenantId: params.tenantId, defaultTeamId: params.id },
      data: { defaultTeamId: null },
    })
    await transaction.requestSubcategory.updateMany({
      where: { tenantId: params.tenantId, defaultTeamId: params.id },
      data: { defaultTeamId: null },
    })

    // NoAction protects the composite tenant key, so hard deletion follows cleanup.
    if (hardDelete) await transaction.team.delete({ where: { id: params.id } })

    return { object: 'team' as const, id: params.id, deleted: true as const }
  })
}

export const listMembers = (tenantId: string, teamId: string) =>
  prisma.teamMember.findMany({
    where: { tenantId, teamId },
    orderBy: { createdAt: 'asc' },
  })

export const retrieveMember = (
  tenantId: string,
  teamId: string,
  userId: string
) => prisma.teamMember.findFirst({ where: { tenantId, teamId, userId } })

export function upsertMember(params: {
  tenantId: string
  teamId: string
  userId: string
  role?: TeamMemberRole
  addedBy: string
}) {
  return prisma.teamMember.upsert({
    where: {
      tenantId_teamId_userId: {
        tenantId: params.tenantId,
        teamId: params.teamId,
        userId: params.userId,
      },
    },
    create: {
      id: `tmem_${randomUUID().replaceAll('-', '')}`,
      ...params,
      role: params.role ?? 'MEMBER',
    },
    update: { role: params.role ?? 'MEMBER', addedBy: params.addedBy },
  })
}

export const updateMember = (
  tenantId: string,
  teamId: string,
  userId: string,
  role: TeamMemberRole
) =>
  prisma.teamMember.update({
    where: { tenantId_teamId_userId: { tenantId, teamId, userId } },
    data: { role },
  })

export const removeMember = (
  tenantId: string,
  teamId: string,
  userId: string
) =>
  prisma.teamMember.delete({
    where: { tenantId_teamId_userId: { tenantId, teamId, userId } },
  })
