import { prisma } from '../../db/index.js'
import type { IntegrationClientRow } from './integration.serializers.js'

export type CreateClientData = {
  id: string
  tenantId: string
  organizationId: string
  name: string
  scopes: string[]
  secretHash: string
  keyPrefix: string
  createdAt: bigint
  updatedAt: bigint
}

export async function listClients(
  tenantId: string
): Promise<IntegrationClientRow[]> {
  const rows = await prisma.integrationClient.findMany({
    where: { tenantId },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  })
  return rows as unknown as IntegrationClientRow[]
}

export async function retrieveClient(
  id: string
): Promise<IntegrationClientRow | null> {
  const row = await prisma.integrationClient.findUnique({ where: { id } })
  return row as unknown as IntegrationClientRow | null
}

export async function createClient(
  data: CreateClientData
): Promise<IntegrationClientRow> {
  const row = await prisma.integrationClient.create({ data })
  return row as unknown as IntegrationClientRow
}

export async function markClientUsed(
  id: string,
  now: bigint
): Promise<void> {
  await prisma.integrationClient.update({
    where: { id },
    data: { lastUsedAt: now, updatedAt: now },
  })
}

export async function revokeClient(
  id: string,
  now: bigint
): Promise<IntegrationClientRow> {
  const row = await prisma.integrationClient.update({
    where: { id },
    data: { revokedAt: now, updatedAt: now },
  })
  return row as unknown as IntegrationClientRow
}
