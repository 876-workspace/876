import type { Server } from 'node:http'
import { createApp } from '@/app'
import { getSettings } from '@/config'
import { disconnectDb } from '@/db/client'
import { configureLogging, getLogger } from '@/platform/logger'
import { assertFinanceProvisioningConfiguration } from '@/services/finance-provisioning-configuration'
import { startFinanceProvisioningWorker } from '@/workers/finance-provisioning-dispatch'

const log = getLogger('server')

export type ServerLifecycleDeps = {
  createApp: typeof createApp
  getSettings: typeof getSettings
  disconnectDb: typeof disconnectDb
  startFinanceWorker: typeof startFinanceProvisioningWorker
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
    startFinanceWorker: startFinanceProvisioningWorker,
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
  let financeWorkerStop: (() => Promise<void>) | null = null

  const server = app.listen(settings.port, '0.0.0.0', () => {
    log.info(
      { port: settings.port, environment: settings.environment },
      'server_started'
    )
    if (!settings.billing.financeProvisioningDisabled) {
      const worker = deps.startFinanceWorker()
      financeWorkerStop = worker.stop
      log.info('finance_worker.started')
    }
  })

  let shuttingDown = false

  async function shutdown(signal = 'SIGTERM'): Promise<void> {
    if (shuttingDown) return
    shuttingDown = true
    log.info({ signal }, 'server_shutdown_started')

    if (financeWorkerStop) {
      try {
        await financeWorkerStop()
      } catch (e) {
        log.error({ err: e }, 'finance_worker.stop_failed')
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
