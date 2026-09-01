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
  countryCode: string | null
  currencyCode: string | null
  language: string | null
  provisioningSetupKey: string | null
  provisioningSelectionType: string | null
  provisioningMatchGroupKey: string | null
  provisioningMatchPriority: number | null
  provisioningMatchedFields: string[]
  provisioningSetupSelectedAt: bigint | null
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

const ORGANIZATION_SELECT = {
  id: true,
  workosOrganizationId: true,
  name: true,
  slug: true,
  status: true,
  countryCode: true,
  currencyCode: true,
  language: true,
  provisioningSetupKey: true,
  provisioningSelectionType: true,
  provisioningMatchGroupKey: true,
  provisioningMatchPriority: true,
  provisioningMatchedFields: true,
  provisioningSetupSelectedAt: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
} as const

export async function findUserById(userId: string): Promise<UserRow | null> {
  return prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { id: true, workosUserId: true },
  })
}

export async function findOrganizationBySlug(
  slug: string
): Promise<OrganizationRow | null> {
  return prisma.organization.findFirst({
    where: { slug, deletedAt: null },
    select: ORGANIZATION_SELECT,
  })
}

export async function createOrganization(data: {
  id: string
  workosOrganizationId: string | null
  name: string
  slug: string
  status: string
  countryCode: string | null
  currencyCode: string
  language: string
  provisioningSetupKey: string
  provisioningSelectionType: 'policy' | 'fallback'
  provisioningMatchGroupKey: string | null
  provisioningMatchPriority: number | null
  provisioningMatchedFields: string[]
  provisioningSetupSelectedAt: bigint
  metadata: unknown
  createdAt: bigint
  updatedAt: bigint
}): Promise<OrganizationRow> {
  return prisma.organization.create({
    data: {
      id: data.id,
      workosOrganizationId: data.workosOrganizationId,
      name: data.name,
      slug: data.slug,
      status: data.status,
      countryCode: data.countryCode,
      currencyCode: data.currencyCode,
      language: data.language,
      provisioningSetupKey: data.provisioningSetupKey,
      provisioningSelectionType: data.provisioningSelectionType,
      provisioningMatchGroupKey: data.provisioningMatchGroupKey,
      provisioningMatchPriority: data.provisioningMatchPriority,
      provisioningMatchedFields: data.provisioningMatchedFields,
      provisioningSetupSelectedAt: data.provisioningSetupSelectedAt,
      metadata: data.metadata as never,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    },
    select: ORGANIZATION_SELECT,
  })
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
  return prisma.membership.create({
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
}
