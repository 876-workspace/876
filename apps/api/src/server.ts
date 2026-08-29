import type { Server } from 'node:http'
import { createApp } from '@/application'
import { getSettings } from '@/config'
import { disconnectDb } from '@/db/client'
import { configureLogging, getLogger } from '@/platform/logger'
import { getPostHogFlagEvaluator } from '@/providers/posthog/flags'
import { assertFinanceProvisioningConfiguration } from '@/services/finance-provisioning-configuration'
import { startBillingSyncWorker } from '@/workers/billing-customer-dispatch'
import { startFeatureFlagSyncWorker } from '@/workers/feature-flag-sync'
import { startFinanceProvisioningWorker } from '@/workers/finance-provisioning-dispatch'

const log = getLogger('server')

export type ServerLifecycleDeps = {
  createApp: typeof createApp
  getSettings: typeof getSettings
  disconnectDb: typeof disconnectDb
  startBillingWorker: typeof startBillingSyncWorker
  startFinanceWorker: typeof startFinanceProvisioningWorker
  startFeatureFlagSyncWorker: typeof startFeatureFlagSyncWorker
  getPostHogFlagEvaluator: typeof getPostHogFlagEvaluator
  assertFinanceConfiguration: typeof assertFinanceProvisioningConfiguration
}

export type ServerLifecycle = {
  server: Server
  stop: (signal?: string) => Promise<void>
}

export function createServerLifecycle(
  overrides?: Partial<ServerLifecycleDeps>
): ServerLifecycle {
  const deps: ServerLifecycleDeps = {
    createApp,
    getSettings,
    disconnectDb,
    startBillingWorker: startBillingSyncWorker,
    startFinanceWorker: startFinanceProvisioningWorker,
    startFeatureFlagSyncWorker,
    getPostHogFlagEvaluator,
    assertFinanceConfiguration: assertFinanceProvisioningConfiguration,
    ...overrides,
  }

  const settings = deps.getSettings()
  deps.assertFinanceConfiguration(settings)

  configureLogging({
    environment: settings.environment,
    logLevel: settings.logLevel,
  })

  const app = deps.createApp()
  const flagEvaluator =
    settings.featureFlags.evaluationSource === 'posthog'
      ? deps.getPostHogFlagEvaluator(settings)
      : null
  let billingWorkerStop: (() => Promise<void>) | null = null
  let financeWorkerStop: (() => Promise<void>) | null = null
  let featureFlagSyncWorkerStop: (() => Promise<void>) | null = null

  const server = app.listen(settings.port, '0.0.0.0', () => {
    log.info(
      { port: settings.port, environment: settings.environment },
      'server_started'
    )
    if (settings.billing.url.trim() && settings.billing.internalKey.trim()) {
      const worker = deps.startBillingWorker()
      billingWorkerStop = worker.stop
      log.info('billing_customer_sync.worker_started')
    }
    if (!settings.billing.financeProvisioningDisabled) {
      const worker = deps.startFinanceWorker()
      financeWorkerStop = worker.stop
      log.info('finance_worker.started')
    }
    if (settings.featureFlags.syncEnabled) {
      const worker = deps.startFeatureFlagSyncWorker()
      featureFlagSyncWorkerStop = worker.stop
      log.info('feature_flag_sync.worker_started')
    }
  })

  let shuttingDown = false

  async function shutdown(signal = 'SIGTERM'): Promise<void> {
    if (shuttingDown) return
    shuttingDown = true
    log.info({ signal }, 'server_shutdown_started')

    if (billingWorkerStop) {
      try {
        await billingWorkerStop()
      } catch (e) {
        log.error({ err: e }, 'billing_customer_sync.worker_stop_failed')
      }
    }

    if (financeWorkerStop) {
      try {
        await financeWorkerStop()
      } catch (e) {
        log.error({ err: e }, 'finance_worker.stop_failed')
      }
    }

    if (featureFlagSyncWorkerStop) {
      try {
        await featureFlagSyncWorkerStop()
      } catch (e) {
        log.error({ err: e }, 'feature_flag_sync.worker_stop_failed')
      }
    }

    if (flagEvaluator) {
      try {
        await flagEvaluator.shutdown()
      } catch (e) {
        log.error({ err: e }, 'posthog.flag_evaluator_shutdown_failed')
      }
    }

    const forced = setTimeout(() => {
      log.error({ signal }, 'server_shutdown_forced')
      if (process.env.NODE_ENV !== 'test') {
        process.exit(1)
      }
    }, 25_000)
    forced.unref()

    await new Promise<void>((resolve) => {
      server.close(async (error) => {
        if (error) log.error({ err: error }, 'server_close_failed')

        try {
          await deps.disconnectDb()
        } catch (dbError) {
          log.error({ err: dbError }, 'server_shutdown_db_disconnect_failed')
        }

        log.info({ signal }, 'server_shutdown_complete')
        clearTimeout(forced)
        resolve()
      })
    })
  }

  return {
    server,
    stop: shutdown,
  }
}

let lifecycle: ServerLifecycle | null = null

if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
  lifecycle = createServerLifecycle()

  process.on(
    'SIGTERM',
    () => void lifecycle?.stop('SIGTERM').then(() => process.exit(0))
  )
  process.on(
    'SIGINT',
    () => void lifecycle?.stop('SIGINT').then(() => process.exit(0))
  )

  process.on('unhandledRejection', (reason) => {
    log.error({ err: reason }, 'unhandled_rejection')
  })

  process.on('uncaughtException', (error) => {
    // An uncaught exception leaves the process in an undefined state; log it and
    // let the platform restart a clean one rather than serving from a broken heap.
    log.error({ err: error }, 'uncaught_exception')
    void lifecycle?.stop('uncaughtException').then(() => process.exit(1))
  })
}
