import { createApp } from './application.js'
import { getSettings } from './config/index.js'
import { configureLogging } from './platform/logger.js'

const settings = getSettings()

// This is the serverless entrypoint, so it must configure logging itself.
// `server.ts` is only used for a long-running process and never runs here, so
// without this every production log line would lack the service and environment
// fields and ignore LOG_LEVEL.
configureLogging({
  environment: settings.environment,
  logLevel: settings.logLevel,
})

export { COMMUNICATIONS_ERRORS } from './http/errors.js'
export { createApp }

export default createApp()
