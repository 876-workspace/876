import { fromDbUnixSeconds } from '../../platform/timestamps.js'

export type WebhookEndpointRow = {
  id: string
  tenantId: string
  url: string
  eventTypes: string[]
  secret: unknown
  enabled: boolean
  consecutiveFailures: number
  createdAt: bigint | number
  updatedAt: bigint | number
}

export type SerializedWebhookEndpoint = {
  object: 'projects.webhook-endpoint'
  id: string
  tenantId: string
  url: string
  eventTypes: string[]
  enabled: boolean
  consecutiveFailures: number
  createdAt: number
  updatedAt: number
}

export function serializeWebhookEndpoint(
  row: WebhookEndpointRow
): SerializedWebhookEndpoint {
  return {
    object: 'projects.webhook-endpoint',
    id: row.id,
    tenantId: row.tenantId,
    url: row.url,
    eventTypes: row.eventTypes,
    enabled: row.enabled,
    consecutiveFailures: row.consecutiveFailures,
    createdAt: fromDbUnixSeconds(row.createdAt),
    updatedAt: fromDbUnixSeconds(row.updatedAt),
  }
}

export type WebhookDeliveryRow = {
  id: string
  tenantId: string
  endpointId: string
  eventId: string
  attempt: number
  status: string
  responseCode: number | null
  errorCode: string | null
  nextAttemptAt: bigint | number | null
  createdAt: bigint | number
  updatedAt: bigint | number
}

export type SerializedWebhookDelivery = {
  object: 'projects.webhook-delivery'
  id: string
  tenantId: string
  endpointId: string
  eventId: string
  attempt: number
  status: string
  responseCode: number | null
  errorCode: string | null
  nextAttemptAt: number | null
  createdAt: number
  updatedAt: number
}

export function serializeWebhookDelivery(
  row: WebhookDeliveryRow
): SerializedWebhookDelivery {
  return {
    object: 'projects.webhook-delivery',
    id: row.id,
    tenantId: row.tenantId,
    endpointId: row.endpointId,
    eventId: row.eventId,
    attempt: row.attempt,
    status: row.status,
    responseCode: row.responseCode,
    errorCode: row.errorCode,
    nextAttemptAt:
      row.nextAttemptAt === null
        ? null
        : fromDbUnixSeconds(row.nextAttemptAt),
    createdAt: fromDbUnixSeconds(row.createdAt),
    updatedAt: fromDbUnixSeconds(row.updatedAt),
  }
}
