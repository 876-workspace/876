import { createApp } from '@/app'
import { getSettings } from '@/config'
import { disconnectDb } from '@/db/client'
import { configureLogging, getLogger } from '@/platform/logger'
import { startFinanceProvisioningWorker } from '@/workers/finance-provisioning-dispatch'

const settings = getSettings()
configureLogging({
  environment: settings.environment,
  logLevel: settings.logLevel,
})

const log = getLogger('server')

const app = createApp()
let financeWorkerStop: (() => Promise<void>) | null = null
let financeWorkerDone: Promise<void> | null = null

const server = app.listen(settings.port, '0.0.0.0', () => {
  log.info(
    { port: settings.port, environment: settings.environment },
    'server_started'
  )
  const disabled =
    settings.billing.financeProvisioningDisabled ||
    process.env.FINANCE_PROVISIONING_DISABLE === '1'
  if (!disabled) {
    const worker = startFinanceProvisioningWorker()
    financeWorkerStop = worker.stop
    financeWorkerDone = worker.done
    log.info('finance_worker.started')
  }
})

/**
 * Graceful shutdown.
 *
 * The container front door sends SIGTERM before replacing an instance. Closing
 * the listener first stops new connections while in-flight requests finish, so
 * a deploy does not surface as a burst of 502s.
 */
let shuttingDown = false

async function shutdown(signal: string): Promise<void> {
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
  if (financeWorkerDone) {
    try {
      await financeWorkerDone
    } catch {}
  }

  // Force exit if a hung connection keeps the process alive past the window
  // the platform allows.
  const forced = setTimeout(() => {
    log.error({ signal }, 'server_shutdown_forced')
    process.exit(1)
  }, 25_000)
  forced.unref()

  server.close(async (error) => {
    if (error) log.error({ err: error }, 'server_close_failed')

    try {
      await disconnectDb()
    } catch (dbError) {
      log.error({ err: dbError }, 'server_shutdown_db_disconnect_failed')
    }

    log.info({ signal }, 'server_shutdown_complete')
    process.exit(error ? 1 : 0)
  })
}

process.on('SIGTERM', () => void shutdown('SIGTERM'))
process.on('SIGINT', () => void shutdown('SIGINT'))

process.on('unhandledRejection', (reason) => {
  log.error({ err: reason }, 'unhandled_rejection')
})

process.on('uncaughtException', (error) => {
  // An uncaught exception leaves the process in an undefined state; log it and
  // let the platform restart a clean one rather than serving from a broken heap.
  log.error({ err: error }, 'uncaught_exception')
  void shutdown('uncaughtException')
})
