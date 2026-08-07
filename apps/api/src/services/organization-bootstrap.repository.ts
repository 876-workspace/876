import { prisma } from '@/db/client'

// All database access for the organization bootstrap flow.
// Only this file may import the Prisma client for this service.

export type UserRow = {
  id: string
  workosUserId: string
}

export type OrganizationRow = {
  id: string
  workosOrganizationId: string | null
  name: string | null
  slug: string
  status: string
  metadata: unknown
  createdAt: bigint
  updatedAt: bigint
}

export type MembershipRow = {
  id: string
  organizationId: string
  userId: string
  workosMembershipId: string | null
  role: string
  roleId: string | null
  status: string
  createdAt: bigint
  updatedAt: bigint
}

export async function findUserById(userId: string): Promise<UserRow | null> {
  const row = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { id: true, workosUserId: true },
  })
  return row
}

export async function findOrganizationBySlug(
  slug: string
): Promise<OrganizationRow | null> {
  const row = await prisma.organization.findFirst({
    where: { slug, deletedAt: null },
    select: {
      id: true,
      workosOrganizationId: true,
      name: true,
      slug: true,
      status: true,
      metadata: true,
      createdAt: true,
      updatedAt: true,
    },
  })
  return row
}

export async function createOrganization(data: {
  id: string
  workosOrganizationId: string | null
  name: string
  slug: string
  status: string
  metadata: unknown
  createdAt: bigint
  updatedAt: bigint
}): Promise<OrganizationRow> {
  const row = await prisma.organization.create({
    data: {
      id: data.id,
      workosOrganizationId: data.workosOrganizationId,
      name: data.name,
      slug: data.slug,
      status: data.status,
      metadata: data.metadata as never,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    },
    select: {
      id: true,
      workosOrganizationId: true,
      name: true,
      slug: true,
      status: true,
      metadata: true,
      createdAt: true,
      updatedAt: true,
    },
  })
  return row
}

export async function createMembership(data: {
  id: string
  organizationId: string
  userId: string
  workosMembershipId: string | null
  role: string
  roleId: string | null
  status: string
  createdAt: bigint
  updatedAt: bigint
}): Promise<MembershipRow> {
  const row = await prisma.membership.create({
    data: {
      id: data.id,
      organizationId: data.organizationId,
      userId: data.userId,
      workosMembershipId: data.workosMembershipId,
      role: data.role,
      roleId: data.roleId,
      status: data.status,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    },
    select: {
      id: true,
      organizationId: true,
      userId: true,
      workosMembershipId: true,
      role: true,
      roleId: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  })
  return row
}
