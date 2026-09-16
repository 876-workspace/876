import { prisma } from '../../db/index.js'
import type { ClientGrantRow } from './client-grants.serializers.js'

export async function listGrants(
  tenantId: string,
  projectId: string,
  options: { limit: number; startingAfter?: string; includeRevoked: boolean }
): Promise<ClientGrantRow[]> {
  const rows = await prisma.clientGrant.findMany({
    where: {
      tenantId,
      projectId,
      ...(options.includeRevoked ? {} : { revokedAt: null }),
    },
    cursor: options.startingAfter ? { id: options.startingAfter } : undefined,
    skip: options.startingAfter ? 1 : 0,
    take: options.limit + 1,
    orderBy: { createdAt: 'asc' },
  })
  return rows as ClientGrantRow[]
}

export async function retrieveGrant(
  tenantId: string,
  projectId: string,
  id: string
): Promise<ClientGrantRow | null> {
  const row = await prisma.clientGrant.findFirst({
    where: { tenantId, projectId, id },
  })
  return (row ?? null) as ClientGrantRow | null
}

export async function findGrantForUser(
  tenantId: string,
  projectId: string,
  userId: string
): Promise<ClientGrantRow | null> {
  const row = await prisma.clientGrant.findUnique({
    where: { tenantId_projectId_userId: { tenantId, projectId, userId } },
  })
  return (row ?? null) as ClientGrantRow | null
}

export async function resolveActiveGrant(
  tenantId: string,
  projectId: string,
  userId: string
): Promise<ClientGrantRow | null> {
  const row = await prisma.clientGrant.findFirst({
    where: { tenantId, projectId, userId, revokedAt: null },
  })
  return (row ?? null) as ClientGrantRow | null
}

export async function createGrant(params: {
  id: string
  tenantId: string
  projectId: string
  userId: string
  allowComments: boolean
  allowDiscussions: boolean
  allowFiles: boolean
  allowTime: boolean
  allowInvoices: boolean
  allowWiki: boolean
  invitedBy: string | null
  createdAt: bigint
  updatedAt: bigint
}): Promise<ClientGrantRow> {
  const row = await prisma.clientGrant.create({ data: params })
  return row as ClientGrantRow
}

export async function updateGrant(
  id: string,
  params: {
    allowComments?: boolean
    allowDiscussions?: boolean
    allowFiles?: boolean
    allowTime?: boolean
    allowInvoices?: boolean
    allowWiki?: boolean
    revokedAt?: bigint | null
    updatedAt: bigint
  }
): Promise<ClientGrantRow> {
  const row = await prisma.clientGrant.update({ where: { id }, data: params })
  return row as ClientGrantRow
}
