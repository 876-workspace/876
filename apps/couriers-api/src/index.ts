import { createApp } from '@/application'
import { getSettings } from '@/config'
import { configureLogging } from '@/platform/logger'

const settings = getSettings()

configureLogging({
  environment: settings.environment,
  logLevel: settings.logLevel,
})

export default createApp()
