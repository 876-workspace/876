import { randomBytes } from 'node:crypto'

import { getError, type ProjectsError } from '../../http/errors.js'
import { generateId } from '../../platform/ids.js'
import { getLogger } from '../../platform/logger.js'
import {
  sealWebhookEndpointSecret,
  unsealWebhookEndpointSecret,
} from '../../platform/secure-field.js'
import {
  nowUnixSeconds,
  toDbUnixSeconds,
} from '../../platform/timestamps.js'
import {
  postWebhook,
  signWebhookBody,
  WEBHOOK_SIGNATURE_HEADER,
} from '../../platform/webhook-signature.js'
import { parseSealedSecret } from '../automation/automation.serializers.js'
import * as tenants from '../tenants/index.js'
import * as repository from './webhooks.repository.js'
import {
  assertSafeWebhookUrl,
  type DnsLookup,
} from './ssrf.js'
import {
  computeWebhookRetryDelaySeconds,
  webhookAttemptExhausted,
  webhookEndpointShouldDisable,
  WEBHOOK_MAX_ATTEMPTS,
} from './retry.js'
import type {
  CreateWebhookEndpointBody,
  ListDeliveriesQuery,
  UpdateWebhookEndpointBody,
} from './webhooks.schemas.js'
import {
  serializeWebhookDelivery,
  serializeWebhookEndpoint,
  type SerializedWebhookDelivery,
  type SerializedWebhookEndpoint,
  type WebhookEndpointRow,
} from './webhooks.serializers.js'

export type ServiceResult<T> =
  | { data: T; error: null }
  | { data: null; error: ProjectsError }

export { WEBHOOK_SIGNATURE_HEADER, signWebhookBody }
export { WEBHOOK_MAX_ATTEMPTS }

const log = getLogger('webhooks')

type TenantResolution =
  | { tenant: { id: string }; error: null }
  | { tenant: null; error: ProjectsError }

async function resolveTenant(
  organizationId: string
): Promise<TenantResolution> {
  const tenant = await tenants.resolveTenant(organizationId)
  if (!tenant)
    return { tenant: null, error: getError('projects/tenant-not-found') }
  return { tenant, error: null }
}

function nowDb() {
  return toDbUnixSeconds(nowUnixSeconds())
}

export function endpointMatchesEvent(
  endpoint: Pick<WebhookEndpointRow, 'eventTypes' | 'enabled'>,
  eventType: string
): boolean {
  if (!endpoint.enabled) return false
  return endpoint.eventTypes.includes('*') || endpoint.eventTypes.includes(eventType)
}

export async function listEndpoints(
  organizationId: string
): Promise<ServiceResult<SerializedWebhookEndpoint[]>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const rows = await repository.listEndpoints(resolved.tenant.id)
  return { data: rows.map(serializeWebhookEndpoint), error: null }
}

export async function createEndpoint(
  organizationId: string,
  body: CreateWebhookEndpointBody,
  options?: { lookup?: DnsLookup }
): Promise<ServiceResult<SerializedWebhookEndpoint>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const safe = await assertSafeWebhookUrl(body.url, options?.lookup)
  if (!safe.ok)
    return {
      data: null,
      error: getError('projects/webhook-url-blocked', {
        description: `That webhook URL is not allowed (${safe.reason}).`,
      }),
    }
  const endpointId = generateId('webhookEndpoint')
  const secret = body.secret ?? randomBytes(32).toString('hex')
  let sealed: unknown
  try {
    sealed = await sealWebhookEndpointSecret(
      resolved.tenant.id,
      endpointId,
      secret
    )
  } catch {
    return { data: null, error: getError('projects/internal-error') }
  }
  const timestamp = nowDb()
  const row = await repository.createEndpoint({
    id: endpointId,
    tenantId: resolved.tenant.id,
    url: body.url,
    eventTypes: body.eventTypes,
    secret: sealed,
    enabled: body.enabled ?? true,
    createdAt: timestamp,
    updatedAt: timestamp,
  })
  log.info(
    { endpoint_id: row.id, tenant_id: row.tenantId, event_types: row.eventTypes },
    'webhook.endpoint_created'
  )
  return { data: serializeWebhookEndpoint(row), error: null }
}

export async function retrieveEndpoint(
  organizationId: string,
  endpointId: string
): Promise<ServiceResult<SerializedWebhookEndpoint>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const row = await repository.retrieveEndpoint(resolved.tenant.id, endpointId)
  if (!row)
    return {
      data: null,
      error: getError('projects/webhook-endpoint-not-found'),
    }
  return { data: serializeWebhookEndpoint(row), error: null }
}

export async function updateEndpoint(
  organizationId: string,
  endpointId: string,
  body: UpdateWebhookEndpointBody,
  options?: { lookup?: DnsLookup }
): Promise<ServiceResult<SerializedWebhookEndpoint>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const existing = await repository.retrieveEndpoint(
    resolved.tenant.id,
    endpointId
  )
  if (!existing)
    return {
      data: null,
      error: getError('projects/webhook-endpoint-not-found'),
    }
  if (body.url !== undefined) {
    const safe = await assertSafeWebhookUrl(body.url, options?.lookup)
    if (!safe.ok)
      return {
        data: null,
        error: getError('projects/webhook-url-blocked', {
          description: `That webhook URL is not allowed (${safe.reason}).`,
        }),
      }
  }
  let sealed: unknown = existing.secret
  if (body.secret !== undefined) {
    try {
      sealed = await sealWebhookEndpointSecret(
        resolved.tenant.id,
        endpointId,
        body.secret
      )
    } catch {
      return { data: null, error: getError('projects/internal-error') }
    }
  }
  const row = await repository.updateEndpoint(existing.id, {
    ...(body.url !== undefined ? { url: body.url } : {}),
    ...(body.eventTypes !== undefined ? { eventTypes: body.eventTypes } : {}),
    ...(body.secret !== undefined ? { secret: sealed } : {}),
    ...(body.enabled !== undefined ? { enabled: body.enabled } : {}),
    ...(body.enabled === true ? { consecutiveFailures: 0 } : {}),
    updatedAt: nowDb(),
  })
  log.info({ endpoint_id: row.id }, 'webhook.endpoint_updated')
  return { data: serializeWebhookEndpoint(row), error: null }
}

export async function removeEndpoint(
  organizationId: string,
  endpointId: string
): Promise<
  ServiceResult<{ object: 'projects.webhook-endpoint'; id: string; deleted: true }>
> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const existing = await repository.retrieveEndpoint(
    resolved.tenant.id,
    endpointId
  )
  if (!existing)
    return {
      data: null,
      error: getError('projects/webhook-endpoint-not-found'),
    }
  await repository.removeEndpoint(existing.id)
  log.info({ endpoint_id: endpointId }, 'webhook.endpoint_deleted')
  return {
    data: { object: 'projects.webhook-endpoint', id: endpointId, deleted: true },
    error: null,
  }
}

export async function listDeliveries(
  organizationId: string,
  query: ListDeliveriesQuery
): Promise<ServiceResult<SerializedWebhookDelivery[]>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const rows = await repository.listDeliveries(resolved.tenant.id, {
    endpointId: query.endpointId,
    status: query.status,
    limit: query.limit ?? 25,
  })
  return { data: rows.map(serializeWebhookDelivery), error: null }
}

export async function enqueueWebhookDeliveries(event: {
  id: string
  tenantId: string
  type: string
}): Promise<number> {
  const endpoints = await repository.listEnabledEndpoints(event.tenantId)
  const matching = endpoints.filter((endpoint) =>
    endpointMatchesEvent(endpoint, event.type)
  )
  if (matching.length === 0) return 0
  const timestamp = nowDb()
  const count = await repository.createDeliveries(
    matching.map((endpoint) => ({
      id: generateId('webhookDelivery'),
      tenantId: event.tenantId,
      endpointId: endpoint.id,
      eventId: event.id,
      createdAt: timestamp,
      updatedAt: timestamp,
    }))
  )
  log.info(
    { event_id: event.id, endpoints: matching.length, enqueued: count },
    'webhook.deliveries_enqueued'
  )
  return count
}

export type DrainWebhooksOptions = {
  limit?: number
  fetchImpl?: typeof fetch
  lookup?: DnsLookup
  nowSeconds?: number
}

export type DrainWebhooksResult = {
  claimed: number
  delivered: number
  scheduled: number
  failed: number
  disabled: number
}

async function readEndpointSecret(
  tenantId: string,
  endpoint: WebhookEndpointRow
): Promise<string | null> {
  const sealed = parseSealedSecret(endpoint.secret)
  if (!sealed) return null
  try {
    return await unsealWebhookEndpointSecret(tenantId, endpoint.id, sealed)
  } catch {
    return null
  }
}

export async function drainWebhookDeliveries(
  options: DrainWebhooksOptions = {}
): Promise<DrainWebhooksResult> {
  const nowSeconds = options.nowSeconds ?? nowUnixSeconds()
  const now = toDbUnixSeconds(nowSeconds)
  const due = await repository.claimDueDeliveries(now, options.limit ?? 50)
  const result: DrainWebhooksResult = {
    claimed: due.length,
    delivered: 0,
    scheduled: 0,
    failed: 0,
    disabled: 0,
  }
  for (const delivery of due) {
    const outcome = await attemptDelivery(delivery, {
      fetchImpl: options.fetchImpl,
      lookup: options.lookup,
      nowSeconds,
    })
    if (outcome === 'delivered') result.delivered += 1
    else if (outcome === 'scheduled') result.scheduled += 1
    else if (outcome === 'disabled') result.disabled += 1
    else result.failed += 1
  }
  return result
}

async function attemptDelivery(
  delivery: {
    id: string
    tenantId: string
    endpointId: string
    eventId: string
    attempt: number
  },
  options: { fetchImpl?: typeof fetch; lookup?: DnsLookup; nowSeconds: number }
): Promise<'delivered' | 'scheduled' | 'failed' | 'disabled'> {
  const endpoint = await repository.retrieveEndpoint(
    delivery.tenantId,
    delivery.endpointId
  )
  if (!endpoint || !endpoint.enabled) {
    await repository.updateDelivery(delivery.id, {
      status: 'failed',
      errorCode: 'projects/webhook-endpoint-not-found',
      updatedAt: toDbUnixSeconds(options.nowSeconds),
    })
    return 'failed'
  }
  const safe = await assertSafeWebhookUrl(endpoint.url, options.lookup)
  if (!safe.ok) {
    return recordDeliveryFailure(delivery, endpoint, null, 'webhook-url-blocked', options.nowSeconds)
  }
  const secret = await readEndpointSecret(delivery.tenantId, endpoint)
  if (!secret) {
    return recordDeliveryFailure(delivery, endpoint, null, 'webhook-secret-unseal-failed', options.nowSeconds)
  }
  const payload = {
    object: 'projects.webhook-event',
    deliveryId: delivery.id,
    endpointId: endpoint.id,
    eventId: delivery.eventId,
    eventType: '*',
    sentAt: options.nowSeconds,
  }
  let status: number
  const startedAt = Date.now()
  try {
    const outcome = await postWebhook(endpoint.url, secret, payload, {
      fetchImpl: options.fetchImpl,
      now: () => options.nowSeconds * 1000,
    })
    status = outcome.status
  } catch {
    return recordDeliveryFailure(delivery, endpoint, null, 'webhook-request-failed', options.nowSeconds)
  }
  const durationMs = Date.now() - startedAt
  if (status >= 200 && status < 300) {
    await repository.updateDelivery(delivery.id, {
      attempt: delivery.attempt + 1,
      status: 'delivered',
      responseCode: status,
      errorCode: null,
      nextAttemptAt: null,
      updatedAt: toDbUnixSeconds(options.nowSeconds),
    })
    if (endpoint.consecutiveFailures !== 0)
      await repository.updateEndpoint(endpoint.id, {
        consecutiveFailures: 0,
        updatedAt: toDbUnixSeconds(options.nowSeconds),
      })
    log.info(
      {
        delivery_id: delivery.id,
        endpoint_id: endpoint.id,
        event_id: delivery.eventId,
        response_code: status,
        duration_ms: durationMs,
      },
      'webhook.delivery_succeeded'
    )
    return 'delivered'
  }
  return recordDeliveryFailure(delivery, endpoint, status, 'webhook-bad-response', options.nowSeconds)
}

async function recordDeliveryFailure(
  delivery: { id: string; tenantId: string; attempt: number },
  endpoint: WebhookEndpointRow,
  responseCode: number | null,
  errorCode: string,
  nowSeconds: number
): Promise<'scheduled' | 'failed' | 'disabled'> {
  const attempts = delivery.attempt + 1
  const failures = endpoint.consecutiveFailures + 1
  const exhausted = webhookAttemptExhausted(attempts)
  await repository.updateDelivery(delivery.id, {
    attempt: attempts,
    status: exhausted ? 'failed' : 'scheduled',
    responseCode,
    errorCode,
    nextAttemptAt: exhausted
      ? null
      : toDbUnixSeconds(nowSeconds + computeWebhookRetryDelaySeconds(attempts)),
    updatedAt: toDbUnixSeconds(nowSeconds),
  })
  const shouldDisable = webhookEndpointShouldDisable(failures)
  await repository.updateEndpoint(endpoint.id, {
    consecutiveFailures: failures,
    ...(shouldDisable ? { enabled: false } : {}),
    updatedAt: toDbUnixSeconds(nowSeconds),
  })
  log.warn(
    {
      delivery_id: delivery.id,
      endpoint_id: endpoint.id,
      attempt: attempts,
      response_code: responseCode,
      error_code: errorCode,
      consecutive_failures: failures,
      endpoint_disabled: shouldDisable,
    },
    'webhook.delivery_failed'
  )
  if (shouldDisable) return 'disabled'
  return exhausted ? 'failed' : 'scheduled'
}

export async function replayDelivery(
  organizationId: string,
  deliveryId: string
): Promise<ServiceResult<SerializedWebhookDelivery>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const existing = await repository.retrieveDelivery(
    resolved.tenant.id,
    deliveryId
  )
  if (!existing)
    return {
      data: null,
      error: getError('projects/webhook-delivery-not-found'),
    }
  const row = await repository.resetDeliveryForReplay(existing.id, nowDb())
  log.info({ delivery_id: row.id }, 'webhook.delivery_replayed')
  return { data: serializeWebhookDelivery(row), error: null }
}
