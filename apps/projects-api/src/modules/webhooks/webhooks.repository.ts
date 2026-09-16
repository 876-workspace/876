import { Prisma } from '../../db/generated/prisma/client.js'
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
  secret: Prisma.InputJsonValue
  enabled: boolean
  createdAt: bigint
  updatedAt: bigint
}

function toEndpointRow(row: {
  id: string
  tenantId: string
  url: string
  eventTypes: string[]
  secret: Prisma.JsonValue
  enabled: boolean
  consecutiveFailures: number
  createdAt: bigint
  updatedAt: bigint
}): WebhookEndpointRow {
  return {
    id: row.id,
    tenantId: row.tenantId,
    url: row.url,
    eventTypes: row.eventTypes,
    secret: row.secret,
    enabled: row.enabled,
    consecutiveFailures: row.consecutiveFailures,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function toDeliveryRow(row: {
  id: string
  tenantId: string
  endpointId: string
  eventId: string
  eventType: string
  payload: Prisma.JsonValue
  attempt: number
  status: string
  responseCode: number | null
  errorCode: string | null
  nextAttemptAt: bigint | null
  createdAt: bigint
  updatedAt: bigint
}): WebhookDeliveryRow {
  return {
    id: row.id,
    tenantId: row.tenantId,
    endpointId: row.endpointId,
    eventId: row.eventId,
    eventType: row.eventType,
    payload: row.payload,
    attempt: row.attempt,
    status: row.status,
    responseCode: row.responseCode,
    errorCode: row.errorCode,
    nextAttemptAt: row.nextAttemptAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export async function listEndpoints(
  tenantId: string
): Promise<WebhookEndpointRow[]> {
  const rows = await prisma.webhookEndpoint.findMany({
    where: { tenantId },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  })
  return rows.map(toEndpointRow)
}

export async function listEnabledEndpoints(
  tenantId: string
): Promise<WebhookEndpointRow[]> {
  const rows = await prisma.webhookEndpoint.findMany({
    where: { tenantId, enabled: true },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  })
  return rows.map(toEndpointRow)
}

export async function retrieveEndpoint(
  tenantId: string,
  id: string
): Promise<WebhookEndpointRow | null> {
  const row = await prisma.webhookEndpoint.findFirst({
    where: { tenantId, id },
  })
  return row ? toEndpointRow(row) : null
}

export async function createEndpoint(
  data: CreateEndpointData
): Promise<WebhookEndpointRow> {
  const row = await prisma.webhookEndpoint.create({
    data: {
      id: data.id,
      tenantId: data.tenantId,
      url: data.url,
      eventTypes: data.eventTypes,
      secret: data.secret,
      enabled: data.enabled,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    },
  })
  return toEndpointRow(row)
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
    data: {
      ...(data.url !== undefined ? { url: data.url } : {}),
      ...(data.eventTypes !== undefined ? { eventTypes: data.eventTypes } : {}),
      ...(data.secret !== undefined ? { secret: data.secret } : {}),
      ...(data.enabled !== undefined ? { enabled: data.enabled } : {}),
      ...(data.consecutiveFailures !== undefined
        ? { consecutiveFailures: data.consecutiveFailures }
        : {}),
      ...(data.updatedAt !== undefined ? { updatedAt: data.updatedAt } : {}),
    },
  })
  return toEndpointRow(row)
}

export async function removeEndpoint(id: string): Promise<void> {
  await prisma.webhookEndpoint.delete({ where: { id } })
}

export type CreateDeliveryData = {
  id: string
  tenantId: string
  endpointId: string
  eventId: string
  eventType: string
  payload: Prisma.InputJsonValue
  createdAt: bigint
  updatedAt: bigint
}

export async function createDeliveries(
  deliveries: CreateDeliveryData[]
): Promise<number> {
  if (deliveries.length === 0) return 0
  const result = await prisma.webhookDelivery.createMany({
    data: deliveries.map((delivery) => ({
      id: delivery.id,
      tenantId: delivery.tenantId,
      endpointId: delivery.endpointId,
      eventId: delivery.eventId,
      eventType: delivery.eventType,
      payload: delivery.payload,
      createdAt: delivery.createdAt,
      updatedAt: delivery.updatedAt,
    })),
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
  return rows.map(toDeliveryRow)
}

export async function retrieveDelivery(
  tenantId: string,
  id: string
): Promise<WebhookDeliveryRow | null> {
  const row = await prisma.webhookDelivery.findFirst({
    where: { tenantId, id },
  })
  return row ? toDeliveryRow(row) : null
}

type ClaimDueDeliveryDbRow = {
  id: string
  tenant_id: string
  endpoint_id: string
  event_id: string
  event_type: string
  payload: Prisma.JsonValue
  attempt: number
  status: string
  response_code: number | null
  error_code: string | null
  next_attempt_at: bigint | null
  created_at: bigint
  updated_at: bigint
}

export function buildClaimDueDeliveriesQuery(
  now: bigint,
  limit: number
): Prisma.Sql {
  return Prisma.sql`UPDATE "projects_webhook_deliveries" SET "status" = 'delivering', "updated_at" = ${now} WHERE "id" IN (SELECT "id" FROM "projects_webhook_deliveries" WHERE ("status" IN ('pending', 'scheduled') AND "attempt" < 8 AND ("next_attempt_at" IS NULL OR "next_attempt_at" <= ${now})) OR ("status" = 'delivering' AND "updated_at" < ${now} - 300) ORDER BY "created_at" ASC, "id" ASC LIMIT ${limit} FOR UPDATE SKIP LOCKED) RETURNING "id", "tenant_id", "endpoint_id", "event_id", "event_type", "payload", "attempt", "status", "response_code", "error_code", "next_attempt_at", "created_at", "updated_at"`
}

export async function claimDueDeliveries(
  now: bigint,
  limit: number
): Promise<WebhookDeliveryRow[]> {
  const rows = await prisma.$queryRaw<ClaimDueDeliveryDbRow[]>(
    buildClaimDueDeliveriesQuery(now, limit)
  )
  return rows.map((row) =>
    toDeliveryRow({
      id: row.id,
      tenantId: row.tenant_id,
      endpointId: row.endpoint_id,
      eventId: row.event_id,
      eventType: row.event_type,
      payload: row.payload,
      attempt: row.attempt,
      status: row.status,
      responseCode: row.response_code,
      errorCode: row.error_code,
      nextAttemptAt: row.next_attempt_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })
  )
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
  return toDeliveryRow(row)
}
