import { prisma } from '../../db/index.js'
import type {
  WebhookDeliveryRow,
  WebhookEndpointRow,
} from './webhooks.serializers.js'

export type CreateEndpointData = {
  id: string
  tenantId: string
  url: string
  eventTypes: string[]
  secret: unknown
  enabled: boolean
  createdAt: bigint
  updatedAt: bigint
}

export async function listEndpoints(
  tenantId: string
): Promise<WebhookEndpointRow[]> {
  const rows = await prisma.webhookEndpoint.findMany({
    where: { tenantId },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  })
  return rows as unknown as WebhookEndpointRow[]
}

export async function listEnabledEndpoints(
  tenantId: string
): Promise<WebhookEndpointRow[]> {
  const rows = await prisma.webhookEndpoint.findMany({
    where: { tenantId, enabled: true },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  })
  return rows as unknown as WebhookEndpointRow[]
}

export async function retrieveEndpoint(
  tenantId: string,
  id: string
): Promise<WebhookEndpointRow | null> {
  const row = await prisma.webhookEndpoint.findFirst({
    where: { tenantId, id },
  })
  return row as unknown as WebhookEndpointRow | null
}

export async function createEndpoint(
  data: CreateEndpointData
): Promise<WebhookEndpointRow> {
  const row = await prisma.webhookEndpoint.create({
    data: {
      ...data,
      secret: data.secret as never,
    },
  })
  return row as unknown as WebhookEndpointRow
}

export async function updateEndpoint(
  id: string,
  data: Partial<
    Pick<
      CreateEndpointData,
      'url' | 'eventTypes' | 'secret' | 'enabled' | 'updatedAt'
    >
  > & { consecutiveFailures?: number }
): Promise<WebhookEndpointRow> {
  const row = await prisma.webhookEndpoint.update({
    where: { id },
    data: data as never,
  })
  return row as unknown as WebhookEndpointRow
}

export async function removeEndpoint(id: string): Promise<void> {
  await prisma.webhookEndpoint.delete({ where: { id } })
}

export type CreateDeliveryData = {
  id: string
  tenantId: string
  endpointId: string
  eventId: string
  createdAt: bigint
  updatedAt: bigint
}

export async function createDeliveries(
  deliveries: CreateDeliveryData[]
): Promise<number> {
  if (deliveries.length === 0) return 0
  const result = await prisma.webhookDelivery.createMany({
    data: deliveries,
    skipDuplicates: true,
  })
  return result.count
}

export async function listDeliveries(
  tenantId: string,
  filter: { endpointId?: string; status?: string; limit: number }
): Promise<WebhookDeliveryRow[]> {
  const rows = await prisma.webhookDelivery.findMany({
    where: {
      tenantId,
      ...(filter.endpointId ? { endpointId: filter.endpointId } : {}),
      ...(filter.status ? { status: filter.status } : {}),
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: filter.limit,
  })
  return rows as unknown as WebhookDeliveryRow[]
}

export async function retrieveDelivery(
  tenantId: string,
  id: string
): Promise<WebhookDeliveryRow | null> {
  const row = await prisma.webhookDelivery.findFirst({
    where: { tenantId, id },
  })
  return row as unknown as WebhookDeliveryRow | null
}

export async function claimDueDeliveries(
  now: bigint,
  limit: number
): Promise<WebhookDeliveryRow[]> {
  const rows = await prisma.webhookDelivery.findMany({
    where: {
      status: { in: ['pending', 'scheduled'] },
      attempt: { lt: 8 },
      OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }],
    },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    take: limit,
  })
  return rows as unknown as WebhookDeliveryRow[]
}

export async function updateDelivery(
  id: string,
  data: {
    attempt?: number
    status?: string
    responseCode?: number | null
    errorCode?: string | null
    nextAttemptAt?: bigint | null
    updatedAt: bigint
  }
): Promise<void> {
  await prisma.webhookDelivery.update({ where: { id }, data })
}

export async function resetDeliveryForReplay(
  id: string,
  now: bigint
): Promise<WebhookDeliveryRow> {
  const row = await prisma.webhookDelivery.update({
    where: { id },
    data: {
      attempt: 0,
      status: 'pending',
      responseCode: null,
      errorCode: null,
      nextAttemptAt: now,
      updatedAt: now,
    },
  })
  return row as unknown as WebhookDeliveryRow
}
