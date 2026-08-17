import { getSettings } from '@/config'
import { AppHttpError } from '@/http/errors'
import { getLogger } from '@/platform/logger'
import { nowUnixSeconds } from '@/platform/timestamps'
import { financeEventPayload } from '@/services/finance-provisioning'

import {
  claimFinanceProvisioningEvents,
  claimFinanceProvisioningEventsByIds,
  expireStaleApplicationRuns,
  getFinanceProvisioningEventsByIds,
  markFinanceProvisioningDelivered,
  markFinanceProvisioningFailed,
} from './finance-provisioning-dispatch.repository'

const logger = getLogger('finance-provisioning-dispatch')

export type FinanceDispatchSummary = {
  claimed: number
  delivered: number
  failed: number
  configured: boolean
}

export type FinanceEnsureResult = FinanceDispatchSummary & {
  ensured: number
}

function deliveryError(error: unknown): string {
  if (
    error instanceof Error &&
    error.message.startsWith('Billing returned HTTP')
  ) {
    return error.message.slice(0, 2000)
  }
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`.slice(0, 2000)
  }
  return `${String(error)}`.slice(0, 2000)
}

async function postWithTimeout(
  url: string,
  headers: Record<string, string>,
  body: unknown,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timer)
  }
}

async function deliverClaimedRows(
  rows: Array<{ id: string; attemptCount: number; payload: Record<string, unknown> }>,
  billingUrl: string,
  internalKey: string
): Promise<{ delivered: number; failed: number }> {
  let delivered = 0
  let failed = 0
  const endpoint = `${billingUrl}/api/v1/admin/finance-connections/ensure`
  for (const item of rows) {
    try {
      const response = await postWithTimeout(
        endpoint,
        {
          'x-internal-key': internalKey,
          'content-type': 'application/json',
          'x-request-id': item.id,
        },
        item.payload,
        15_000
      )
      if (!response.ok) {
        const text = await response.text()
        const snippet = text.slice(0, 500).trim()
        throw new Error(`Billing returned HTTP ${response.status}: ${snippet}`)
      }
      delivered += 1
      await markFinanceProvisioningDelivered(item.id, nowUnixSeconds())
      logger.info(
        { event_id: item.id, attempt_count: item.attemptCount },
        'finance_provisioning.delivered'
      )
    } catch (error) {
      failed += 1
      const message = deliveryError(error)
      await markFinanceProvisioningFailed(
        item.id,
        item.attemptCount,
        message,
        nowUnixSeconds()
      )
      logger.warn(
        { event_id: item.id, attempt_count: item.attemptCount, error: message },
        'finance_provisioning.delivery_failed'
      )
    }
  }
  return { delivered, failed }
}

export async function dispatchFinanceProvisioningOnce(): Promise<FinanceDispatchSummary> {
  // Expire stale application provisioning runs before claiming — matches Python
  // `dispatch_finance_provisioning_once` which runs this in its own transaction.
  try {
    await expireStaleApplicationRuns(nowUnixSeconds(), 5 * 60)
  } catch (error) {
    logger.error({ err: error }, 'finance_provisioning.expire_stale_failed')
  }

  const settings = getSettings()
  const billingUrl = settings.billing.url.trim().replace(/\/+$/, '')
  const internalKey = settings.billing.internalKey.trim()

  if (!billingUrl || !internalKey) {
    // This returned a success-shaped summary and said nothing, so a missing
    // BILLING_API_URL looked exactly like an empty queue. Every
    // `finance_connection.ensure` event sat pending indefinitely and no
    // organization ever got a Billing workspace. Say so, loudly, every time.
    logger.error(
      {
        has_billing_url: Boolean(billingUrl),
        has_internal_key: Boolean(internalKey),
      },
      'finance_provisioning.not_configured'
    )
    return { claimed: 0, delivered: 0, failed: 0, configured: false }
  }

  const now = nowUnixSeconds()
  const limit = settings.billing.financeProvisioningBatchSize

  const claimedRows = await claimFinanceProvisioningEvents(now, limit)

  if (claimedRows.length === 0) {
    return { claimed: 0, delivered: 0, failed: 0, configured: true }
  }

  const snapshots = claimedRows.map((row) => ({
    id: row.id,
    attemptCount: row.attemptCount,
    payload: financeEventPayload(row as never),
  }))

  const { delivered, failed } = await deliverClaimedRows(snapshots, billingUrl, internalKey)

  return { claimed: snapshots.length, delivered, failed, configured: true }
}

export async function dispatchFinanceProvisioningForEventIds(
  eventIds: string[]
): Promise<FinanceDispatchSummary> {
  if (eventIds.length === 0) {
    return { claimed: 0, delivered: 0, failed: 0, configured: true }
  }
  const settings = getSettings()
  const billingUrl = settings.billing.url.trim().replace(/\/+$/, '')
  const internalKey = settings.billing.internalKey.trim()
  if (!billingUrl || !internalKey) {
    logger.error(
      { has_billing_url: Boolean(billingUrl), has_internal_key: Boolean(internalKey) },
      'finance_provisioning.not_configured'
    )
    return { claimed: 0, delivered: 0, failed: 0, configured: false }
  }
  const now = nowUnixSeconds()
  const claimedRows = await claimFinanceProvisioningEventsByIds(now, eventIds)
  if (claimedRows.length === 0) {
    return { claimed: 0, delivered: 0, failed: 0, configured: true }
  }
  const snapshots = claimedRows.map((row) => ({
    id: row.id,
    attemptCount: row.attemptCount,
    payload: financeEventPayload(row as never),
  }))
  const { delivered, failed } = await deliverClaimedRows(snapshots, billingUrl, internalKey)
  return { claimed: snapshots.length, delivered, failed, configured: true }
}

export async function ensureFinanceProvisioningDelivered(
  eventIds: string[]
): Promise<FinanceEnsureResult> {
  const uniqueIds = [...new Set(eventIds)]
  if (uniqueIds.length === 0) {
    return { claimed: 0, delivered: 0, failed: 0, configured: true, ensured: 0 }
  }
  const settings = getSettings()
  const billingUrl = settings.billing.url.trim().replace(/\/+$/, '')
  const internalKey = settings.billing.internalKey.trim()
  if (!billingUrl || !internalKey) {
    logger.error(
      { has_billing_url: Boolean(billingUrl), has_internal_key: Boolean(internalKey), event_ids: uniqueIds },
      'finance_provisioning.targeted_not_ready'
    )
    throw new AppHttpError({
      code: 'provisioning/finance-workspace-unavailable',
      message: 'The finance workspace could not be prepared. Billing is not configured.',
      httpStatus: 503,
    })
  }
  logger.info({ event_ids: uniqueIds }, 'finance_provisioning.targeted_started')
  const now = nowUnixSeconds()
  const claimedRows = await claimFinanceProvisioningEventsByIds(now, uniqueIds)
  const claimedIds = new Set(claimedRows.map((r) => r.id))
  const snapshots = claimedRows.map((row) => ({
    id: row.id,
    attemptCount: row.attemptCount,
    payload: financeEventPayload(row as never),
    organizationId: (row as unknown as { organizationId: string }).organizationId,
    sourceAppId: (row as unknown as { sourceAppId: string }).sourceAppId,
    runId: (row as unknown as { runId: string | null }).runId,
  }))
  let delivered = 0
  let failed = 0
  if (snapshots.length > 0) {
    const result = await deliverClaimedRows(snapshots as never, billingUrl, internalKey)
    delivered = result.delivered
    failed = result.failed
  }
  const states = await getFinanceProvisioningEventsByIds(uniqueIds)
  if (states.length !== uniqueIds.length) {
    const found = new Set(states.map((s) => s.id))
    const missing = uniqueIds.filter((id) => !found.has(id))
    logger.error({ missing_ids: missing, event_ids: uniqueIds }, 'finance_provisioning.targeted_not_ready')
    throw new AppHttpError({
      code: 'provisioning/finance-workspace-unavailable',
      message: 'The finance workspace could not be prepared. Missing provisioning event.',
      httpStatus: 503,
    })
  }
  const notDelivered = states.filter((s) => s.status !== 'delivered')
  if (notDelivered.length > 0) {
    for (const ev of notDelivered) {
      logger.error(
        {
          event_id: ev.id,
          organization_id: ev.organizationId,
          source_app_id: ev.sourceAppId,
          run_id: ev.runId,
          status: ev.status,
          attempt_count: ev.attemptCount,
          available_at: String(ev.availableAt),
          last_error: ev.lastError,
        },
        'finance_provisioning.targeted_not_ready'
      )
    }
    throw new AppHttpError({
      code: 'provisioning/finance-workspace-unavailable',
      message: 'The finance workspace could not be prepared. Please retry.',
      httpStatus: 503,
    })
  }
  for (const ev of states) {
    logger.info(
      {
        event_id: ev.id,
        organization_id: ev.organizationId,
        source_app_id: ev.sourceAppId,
        run_id: ev.runId,
        attempt_count: ev.attemptCount,
        status: ev.status,
      },
      'finance_provisioning.targeted_delivered'
    )
  }
  return { claimed: claimedRows.length, delivered, failed, configured: true, ensured: states.length }
}

function sleepWithAbort(ms: number, signal?: AbortSignal): Promise<void> {
  if (!signal) return new Promise((resolve) => setTimeout(resolve, ms))
  if (signal.aborted) return Promise.resolve()
  return new Promise<void>((resolve) => {
    const timeout = setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    const onAbort = (): void => {
      clearTimeout(timeout)
      signal.removeEventListener('abort', onAbort)
      resolve()
    }
    signal.addEventListener('abort', onAbort, { once: true })
  })
}

export async function runFinanceProvisioningWorker(options?: {
  signal?: AbortSignal
}): Promise<void> {
  const settings = getSettings()

  while (!options?.signal?.aborted) {
    try {
      await dispatchFinanceProvisioningOnce()
    } catch (error) {
      logger.error({ err: error }, 'finance_provisioning.worker_failed')
    }

    if (options?.signal?.aborted) break
    await sleepWithAbort(
      settings.billing.financeProvisioningPollSeconds * 1000,
      options?.signal
    )
  }
}

export function startFinanceProvisioningWorker(options?: {
  signal?: AbortSignal
}): { stop: () => Promise<void>; done: Promise<void> } {
  const controller = new AbortController()
  const externalSignal = options?.signal
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort()
    else
      externalSignal.addEventListener('abort', () => controller.abort(), {
        once: true,
      })
  }

  const done = runFinanceProvisioningWorker({ signal: controller.signal })
  void done.catch((err) => logger.error({ err }, 'finance_provisioning.worker_failed'))

  return {
    stop: async () => {
      controller.abort()
      try {
        await done
      } catch {}
    },
    done,
  }
}
