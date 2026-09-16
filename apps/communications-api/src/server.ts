import { createApp } from './application.js'
import { disconnectDb } from './db/index.js'
import { configureLogging, getLogger } from './platform/logger.js'

configureLogging({
  environment: process.env.ENVIRONMENT ?? 'development',
  logLevel: process.env.LOG_LEVEL ?? 'info',
})

const log = getLogger('server')
const port = Number(process.env.PORT ?? 4040)
const app = createApp()
const server = app.listen(port, '0.0.0.0', () => {
  log.info({ port }, 'server_started')
})

async function shutdown() {
  server.close(async () => {
    await disconnectDb()
    process.exit(0)
  })
}

process.on('SIGTERM', () => void shutdown())
process.on('SIGINT', () => void shutdown())
