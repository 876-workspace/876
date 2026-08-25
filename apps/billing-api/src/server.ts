import { createApp } from '@/application'
import { getSettings } from '@/config'
import { disconnectDb } from '@/db'
import { configureLogging, getLogger } from '@/platform/logger'

const settings = getSettings()
configureLogging({
  environment: settings.environment,
  logLevel: settings.logLevel,
})

const log = getLogger('server')
const server = createApp().listen(settings.port, '0.0.0.0', () => {
  log.info(
    { port: settings.port, environment: settings.environment },
    'server_started'
  )
})

let shuttingDown = false

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return
  shuttingDown = true
  const forced = setTimeout(() => process.exit(1), 25_000)
  forced.unref()
  server.close(async (error) => {
    if (error) log.error({ err: error }, 'server_close_failed')
    try {
      await disconnectDb()
    } catch (dbError) {
      log.error({ err: dbError }, 'server_shutdown_db_disconnect_failed')
    }
    clearTimeout(forced)
    process.exit(error ? 1 : 0)
  })
  log.info({ signal }, 'server_shutdown_started')
}

process.on('SIGTERM', () => void shutdown('SIGTERM'))
process.on('SIGINT', () => void shutdown('SIGINT'))
process.on('unhandledRejection', (reason) =>
  log.error({ err: reason }, 'unhandled_rejection')
)
process.on('uncaughtException', (error) => {
  log.error({ err: error }, 'uncaught_exception')
  void shutdown('uncaughtException')
})
