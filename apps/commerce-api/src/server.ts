import { createApp } from './application.js'
import { getConfig } from './config/index.js'
import { configureLogging, getLogger } from './platform/logger.js'

const config = getConfig()
configureLogging(config)

const log = getLogger('server')
createApp().listen(config.port, '0.0.0.0', () =>
  log.info({ port: config.port }, 'server_started')
)
