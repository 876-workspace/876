import { getSettings } from '@/config'
import { getLogger } from '@/platform/logger'
import { nowUnixSeconds } from '@/platform/timestamps'
import { customerEventPayload } from '@/services/billing-customer-sync'

import {
  claimBillingCustomerEvents,
  markBillingCustomerDelivered,
  markBillingCustomerFailed,
} from './billing-customer-dispatch.repository'

const logger = getLogger('billing-customer-dispatch')

export type BillingCustomerDispatchSummary = {
  claimed: number
  delivered: number
  failed: number
  configured: boolean
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

export async function dispatchBillingCustomerSyncOnce(): Promise<BillingCustomerDispatchSummary> {
  const settings = getSettings()
  const billingUrl = settings.billing.url.trim().replace(/\/+$/, '')
  const internalKey = settings.billing.internalKey.trim()

  if (!billingUrl || !internalKey) {
    return { claimed: 0, delivered: 0, failed: 0, configured: false }
  }

  const now = nowUnixSeconds()
  const limit = settings.billing.financeProvisioningBatchSize

  const claimedRows = await claimBillingCustomerEvents(now, limit)

  if (claimedRows.length === 0) {
    return { claimed: 0, delivered: 0, failed: 0, configured: true }
  }

  // Snapshot before releasing the transaction lock — mirrors Python's
  // `snapshots = [(row.id, row.attempt_count, payload) for row in rows]`.
  const snapshots = claimedRows.map((row) => ({
    id: row.id,
    attemptCount: row.attemptCount,
    payload: customerEventPayload(row as never),
  }))

  let delivered = 0
  let failed = 0
  const endpoint = `${billingUrl}/api/v1/admin/customers/ensure`

  for (const item of snapshots) {
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
      await markBillingCustomerDelivered(item.id, nowUnixSeconds())
      logger.info(
        { event_id: item.id, attempt_count: item.attemptCount },
        'billing_customer_sync.delivered'
      )
    } catch (error) {
      failed += 1
      const message = deliveryError(error)
      await markBillingCustomerFailed(
        item.id,
        item.attemptCount,
        message,
        nowUnixSeconds()
      )
      logger.warn(
        { event_id: item.id, attempt_count: item.attemptCount, error: message },
        'billing_customer_sync.delivery_failed'
      )
    }
  }

  return { claimed: snapshots.length, delivered, failed, configured: true }
}

export async function triggerBillingRunOnce(): Promise<boolean> {
  const settings = getSettings()
  const billingUrl = settings.billing.url.trim().replace(/\/+$/, '')
  const internalKey = settings.billing.internalKey.trim()
  if (!billingUrl || !internalKey) return false

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 30_000)
    let response: Response
    try {
      response = await fetch(`${billingUrl}/api/v1/admin/billing/run`, {
        method: 'POST',
        headers: { 'x-internal-key': internalKey },
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timer)
    }
    if (!response.ok) {
      const text = await response.text()
      const snippet = text.slice(0, 500).trim()
      throw new Error(`Billing returned HTTP ${response.status}: ${snippet}`)
    }
    return true
  } catch (error) {
    logger.warn({ error: deliveryError(error) }, 'billing_run.trigger_failed')
    return false
  }
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

export async function runBillingSyncWorker(options?: {
  signal?: AbortSignal
}): Promise<void> {
  const settings = getSettings()
  let lastBillingRun = performance.now() / 1000

  while (!options?.signal?.aborted) {
    try {
      await dispatchBillingCustomerSyncOnce()
      const nowMono = performance.now() / 1000
      if (
        settings.billing.runIntervalSeconds > 0 &&
        nowMono - lastBillingRun >= settings.billing.runIntervalSeconds
      ) {
        lastBillingRun = nowMono
        await triggerBillingRunOnce()
      }
    } catch (error) {
      logger.error({ err: error }, 'billing_customer_sync.worker_failed')
    }

    if (options?.signal?.aborted) break
    await sleepWithAbort(
      settings.billing.financeProvisioningPollSeconds * 1000,
      options?.signal
    )
  }
}

export function startBillingSyncWorker(options?: { signal?: AbortSignal }): {
  stop: () => void
} {
  const controller = new AbortController()
  const externalSignal = options?.signal

  if (externalSignal) {
    if (externalSignal.aborted) controller.abort()
    else
      externalSignal.addEventListener('abort', () => controller.abort(), {
        once: true,
      })
  }

  void runBillingSyncWorker({ signal: controller.signal })

  return {
    stop: () => controller.abort(),
  }
}
