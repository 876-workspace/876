import { prisma } from '../../db/index.js'

export async function list(organizationId: string) {
  return prisma.emailDomain.findMany({
    where: { organizationId, deletedAt: null },
    orderBy: { createdAt: 'desc' },
  })
}

export async function retrieve(organizationId: string, id: string) {
  return prisma.emailDomain.findFirst({
    where: { organizationId, id, deletedAt: null },
  })
}

export async function retrieveByName(organizationId: string, name: string) {
  return prisma.emailDomain.findFirst({
    where: {
      organizationId,
      name: { equals: name, mode: 'insensitive' },
      deletedAt: null,
    },
  })
}

export async function create(input: {
  id: string
  organizationId: string
  provider: string
  providerDomainId: string
  name: string
  region: string | null
  status: string
  records: Array<Record<string, string | number>>
  verifiedAt: bigint | null
  lastCheckedAt: bigint
  now: bigint
}) {
  return prisma.emailDomain.create({
    data: {
      id: input.id,
      organizationId: input.organizationId,
      provider: input.provider,
      providerDomainId: input.providerDomainId,
      name: input.name,
      region: input.region,
      status: input.status,
      records: input.records,
      verifiedAt: input.verifiedAt,
      lastCheckedAt: input.lastCheckedAt,
      createdAt: input.now,
      updatedAt: input.now,
    },
  })
}

export async function updateProviderState(input: {
  id: string
  organizationId: string
  status: string
  records: Array<Record<string, string | number>>
  region: string | null
  verifiedAt: bigint | null
  lastCheckedAt: bigint
}) {
  return prisma.emailDomain.update({
    where: { id: input.id },
    data: {
      status: input.status,
      records: input.records,
      region: input.region,
      verifiedAt: input.verifiedAt,
      lastCheckedAt: input.lastCheckedAt,
      updatedAt: input.lastCheckedAt,
    },
  })
}

export async function softDelete(input: {
  id: string
  organizationId: string
  deletedBy: string | null
  deletionReason: string | null
  now: bigint
}) {
  return prisma.emailDomain.update({
    where: { id: input.id },
    data: {
      deletedAt: input.now,
      deletedBy: input.deletedBy,
      deletionReason: input.deletionReason,
      updatedAt: input.now,
    },
  })
}
