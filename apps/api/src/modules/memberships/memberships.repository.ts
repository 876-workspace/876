import { prisma } from '@/db/client'
import { paginateByCursor, type PaginationQuery } from '@/http/envelope'

import type { ListMembershipsQuery } from './memberships.schemas'
import type { MembershipRow } from './memberships.serializers'

const SELECT = {
  id: true,
  organizationId: true,
  userId: true,
  workosMembershipId: true,
  role: true,
  roleId: true,
  position: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const

export function findMembershipById(membershipId: string): Promise<MembershipRow | null> {
  return prisma.membership.findFirst({
    where: { id: membershipId, deletedAt: null },
    select: SELECT,
  }) as Promise<MembershipRow | null>
}

export function findMembershipByOrgAndUser(
  organizationId: string,
  userId: string
): Promise<MembershipRow | null> {
  return prisma.membership.findFirst({
    where: { organizationId, userId, deletedAt: null },
    select: SELECT,
  }) as Promise<MembershipRow | null>
}

export function findMembershipsByOrgAndUsers(
  organizationId: string,
  userIds: readonly string[]
): Promise<MembershipRow[]> {
  return prisma.membership.findMany({
    where: { organizationId, userId: { in: [...userIds] }, deletedAt: null },
    select: SELECT,
  }) as Promise<MembershipRow[]>
}

export function findMembershipByWorkosId(workosMembershipId: string): Promise<MembershipRow | null> {
  return prisma.membership.findFirst({
    where: { workosMembershipId, deletedAt: null },
    select: SELECT,
  }) as Promise<MembershipRow | null>
}

export async function findOrganizationById(organizationId: string) {
  return prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, workosOrganizationId: true },
  })
}

export async function findUserById(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, workosUserId: true },
  })
}

export async function findRoleByName(organizationId: string, name: string) {
  return prisma.organizationRole.findFirst({
    where: { organizationId, name },
    select: { id: true, name: true },
  })
}

export function createMembership(data: {
  id: string
  organizationId: string
  userId: string
  workosMembershipId: string | null
  role: string
  position?: string | null
  status: string
  createdAt: bigint
  updatedAt: bigint
}): Promise<MembershipRow> {
  return prisma.membership.create({
    data: {
      id: data.id,
      organizationId: data.organizationId,
      userId: data.userId,
      workosMembershipId: data.workosMembershipId,
      role: data.role,
      position: data.position ?? null,
      status: data.status,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    },
    select: SELECT,
  }) as Promise<MembershipRow>
}

export async function updateMembership(
  membershipId: string,
  data: Partial<{
    workosMembershipId: string | null
    role: string
    position: string | null
    status: string
    updatedAt: bigint
  }>
): Promise<MembershipRow | null> {
  const mapped: Record<string, unknown> = {}
  if ('workosMembershipId' in data) mapped.workosMembershipId = data.workosMembershipId
  if ('role' in data) mapped.role = data.role
  if ('position' in data) mapped.position = data.position
  if ('status' in data) mapped.status = data.status
  if ('updatedAt' in data) mapped.updatedAt = data.updatedAt

  try {
    return (await prisma.membership.update({
      where: { id: membershipId },
      data: mapped,
      select: SELECT,
    })) as MembershipRow
  } catch {
    return null
  }
}

export type MembershipDeleteOptions = {
  status?: string
  deletedBy?: string | null
  deletedAt?: bigint
}

export async function deleteMembership(
  membershipId: string,
  options: MembershipDeleteOptions = {}
): Promise<boolean> {
  const existing = await prisma.membership.findUnique({
    where: { id: membershipId },
    select: { id: true, deletedAt: true },
  })
  if (!existing || existing.deletedAt !== null) return false

  const now = options.deletedAt ?? BigInt(Math.floor(Date.now() / 1000))
  try {
    await prisma.membership.update({
      where: { id: membershipId },
      data: {
        deletedAt: now,
        updatedAt: now,
        ...(options.status !== undefined ? { status: options.status } : {}),
        ...(options.deletedBy !== undefined ? { deletedBy: options.deletedBy } : {}),
      },
    })
    return true
  } catch {
    return false
  }
}

export function listMemberships(
  query: ListMembershipsQuery
): Promise<{ data: MembershipRow[]; hasMore: boolean }> {
  const where: Record<string, unknown> = { deletedAt: null }
  if (query.organization_id) where.organizationId = query.organization_id
  if (query.user_id) where.userId = query.user_id

  return paginateByCursor<MembershipRow>({
    query: query as PaginationQuery,
    loadAnchor: (id) => findMembershipById(id),
    cursorOf: (row) => row.createdAt,
    fetch: ({ take, cursor, order }) =>
      prisma.membership.findMany({
        where: cursor
          ? { AND: [where, { createdAt: { [cursor.direction]: cursor.value } }] }
          : where,
        orderBy: { createdAt: order },
        take,
        select: SELECT,
      }) as Promise<MembershipRow[]>,
  })
}
