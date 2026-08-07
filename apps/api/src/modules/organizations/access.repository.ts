import { prisma } from '@/db/client'

import type {
  AppAssignmentRow,
  MembershipRow,
  OrganizationRoleRow,
} from './access.serializers'

export async function listRolesByOrg(
  organizationId: string
): Promise<OrganizationRoleRow[]> {
  const rows = await prisma.organizationRole.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'asc' },
  })
  return rows as unknown as OrganizationRoleRow[]
}

export async function findRoleByIdForOrg(
  roleId: string,
  organizationId: string
): Promise<OrganizationRoleRow | null> {
  const row = await prisma.organizationRole.findFirst({
    where: { id: roleId, organizationId },
  })
  return row as unknown as OrganizationRoleRow | null
}

export async function findRoleByName(
  organizationId: string,
  name: string
): Promise<OrganizationRoleRow | null> {
  const row = await prisma.organizationRole.findFirst({
    where: { organizationId, name },
  })
  return row as unknown as OrganizationRoleRow | null
}

export async function countMembershipsForRole(roleId: string): Promise<number> {
  return prisma.membership.count({ where: { roleId } })
}

export async function createRole(data: {
  id: string
  organizationId: string
  name: string
  displayName: string
  description: string | null
  permissions: string[]
  isSystem: boolean
  createdAt: bigint
  updatedAt: bigint
}): Promise<OrganizationRoleRow> {
  const row = await prisma.organizationRole.create({
    data: {
      id: data.id,
      organizationId: data.organizationId,
      name: data.name,
      displayName: data.displayName,
      description: data.description,
      permissions: data.permissions,
      isSystem: data.isSystem,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    },
  })
  return row as unknown as OrganizationRoleRow
}

export async function updateRole(
  roleId: string,
  data: Record<string, unknown>
): Promise<OrganizationRoleRow | null> {
  try {
    const row = await prisma.organizationRole.update({
      where: { id: roleId },
      data: data as never,
    })
    return row as unknown as OrganizationRoleRow
  } catch {
    return null
  }
}

export async function deleteRole(roleId: string): Promise<void> {
  await prisma.organizationRole.delete({ where: { id: roleId } })
}

export async function listMembersByOrg(
  organizationId: string,
  limit: number
): Promise<{ data: MembershipRow[]; hasMore: boolean }> {
  const take = limit + 1
  const rows = await prisma.membership.findMany({
    where: { organizationId, status: { not: 'removed' } },
    include: {
      user: {
        select: { firstName: true, lastName: true, email: true, avatar: true },
      },
    },
    orderBy: { createdAt: 'asc' },
    take,
  })
  const hasMore = rows.length > limit
  const data = rows.slice(0, limit).map((r) => ({
    id: r.id,
    userId: r.userId,
    role: r.role,
    roleId: r.roleId,
    status: r.status,
    createdAt: r.createdAt,
    user: r.user,
  })) as unknown as MembershipRow[]
  return { data, hasMore }
}

export async function findMembershipById(
  membershipId: string
): Promise<MembershipRow | null> {
  const row = await prisma.membership.findUnique({
    where: { id: membershipId },
    include: {
      user: {
        select: { firstName: true, lastName: true, email: true, avatar: true },
      },
    },
  })
  if (!row) return null
  return {
    id: row.id,
    organizationId: row.organizationId,
    userId: row.userId,
    role: row.role,
    roleId: row.roleId,
    status: row.status,
    createdAt: row.createdAt,
    user: row.user,
  } as unknown as MembershipRow
}

export async function listAppAssignmentsByOrg(
  organizationId: string,
  filters: {
    userId?: string | null
    appId?: string | null
    includeRevoked?: boolean
  }
): Promise<AppAssignmentRow[]> {
  const rows = await prisma.appAssignment.findMany({
    where: {
      organizationId,
      ...(filters.userId ? { userId: filters.userId } : {}),
      ...(filters.appId ? { appId: filters.appId } : {}),
      ...(filters.includeRevoked ? {} : { status: { not: 'revoked' } }),
    },
    include: { app: { select: { slug: true, name: true } } },
  })
  return rows as unknown as AppAssignmentRow[]
}

export async function findAppAssignmentById(
  assignmentId: string
): Promise<AppAssignmentRow | null> {
  const row = await prisma.appAssignment.findUnique({
    where: { id: assignmentId },
    include: { app: { select: { slug: true, name: true } } },
  })
  return row as unknown as AppAssignmentRow | null
}

export async function assignApp(params: {
  id: string
  organizationId: string
  userId: string
  appId: string
  assignedBy: string | null
  now: bigint
}): Promise<AppAssignmentRow> {
  const existing = await prisma.appAssignment.findFirst({
    where: {
      organizationId: params.organizationId,
      userId: params.userId,
      appId: params.appId,
    },
  })
  if (existing) {
    const updated = await prisma.appAssignment.update({
      where: { id: existing.id },
      data: {
        status: 'active',
        assignedBy: params.assignedBy,
        updatedAt: params.now,
      },
      include: { app: { select: { slug: true, name: true } } },
    })
    return updated as unknown as AppAssignmentRow
  }
  const created = await prisma.appAssignment.create({
    data: {
      id: params.id,
      organizationId: params.organizationId,
      userId: params.userId,
      appId: params.appId,
      status: 'active',
      assignedBy: params.assignedBy,
      createdAt: params.now,
      updatedAt: params.now,
    },
    include: { app: { select: { slug: true, name: true } } },
  })
  return created as unknown as AppAssignmentRow
}

export async function revokeAppAssignment(
  assignmentId: string,
  now: bigint
): Promise<AppAssignmentRow | null> {
  try {
    const row = await prisma.appAssignment.update({
      where: { id: assignmentId },
      data: { status: 'revoked', updatedAt: now },
      include: { app: { select: { slug: true, name: true } } },
    })
    return row as unknown as AppAssignmentRow
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Membership reads and writes
//
// These live here, not in the service, because a service that queries Prisma
// directly is a boundary violation `pnpm node:boundaries` fails on — and a
// module whose data access is scattered across both layers cannot be reasoned
// about from the repository alone.
// ---------------------------------------------------------------------------

const MEMBER_USER_SELECT = {
  firstName: true,
  lastName: true,
  email: true,
  avatar: true,
} as const

export function findMembershipForUser(organizationId: string, userId: string) {
  return prisma.membership.findFirst({
    where: { organizationId, userId },
  })
}

export function findMembershipWithUser(organizationId: string, userId: string) {
  return prisma.membership.findFirst({
    where: { organizationId, userId },
    include: { user: { select: MEMBER_USER_SELECT } },
  })
}

export function findMembershipByIdWithUser(
  membershipId: string,
  organizationId: string
) {
  return prisma.membership.findFirst({
    where: { id: membershipId, organizationId },
    include: { user: { select: MEMBER_USER_SELECT } },
  })
}

export function findRoleForMembership(roleId: string, organizationId: string) {
  return prisma.organizationRole.findFirst({
    where: { id: roleId, organizationId },
  })
}

/** Another active owner in the org, excluding the membership being changed. */
export function findOtherActiveOwner(
  organizationId: string,
  role: string,
  excludeMembershipId: string
) {
  return prisma.membership.findFirst({
    where: {
      organizationId,
      role,
      status: 'active',
      id: { not: excludeMembershipId },
    },
  })
}

export function updateMembershipRole(
  membershipId: string,
  data: { role: string; roleId: string; updatedAt: bigint }
) {
  return prisma.membership.update({
    where: { id: membershipId },
    data,
    include: { user: { select: MEMBER_USER_SELECT } },
  })
}

export async function softDeleteMembership(
  membershipId: string,
  deletedBy: string | null,
  now: bigint
): Promise<void> {
  await prisma.membership.update({
    where: { id: membershipId },
    data: { status: 'removed', deletedAt: now, deletedBy, updatedAt: now },
  })
}

export function findAppById(appId: string) {
  return prisma.app.findUnique({ where: { id: appId } })
}

export function findAppBySlug(slug: string) {
  return prisma.app.findFirst({ where: { slug } })
}

export function findSubscription(organizationId: string, appId: string) {
  return prisma.subscription.findFirst({ where: { organizationId, appId } })
}
